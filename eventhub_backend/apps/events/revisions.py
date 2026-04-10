from __future__ import annotations

from django.db import transaction

from .models import Event

EDITABLE_EVENT_FIELDS = [
    "title",
    "description",
    "category",
    "event_type",
    "format",
    "cover_image",
    "gallery_images",
    "start_date",
    "start_time",
    "end_date",
    "end_time",
    "timezone",
    "venue_name",
    "venue_address",
    "city",
    "country",
    "latitude",
    "longitude",
    "streaming_link",
    "capacity",
    "is_featured",
    "theme_color",
    "accent_color",
    "refund_policy",
    "custom_refund_policy",
    "stickers",
    "scheduled_publish_at",
    "send_reminders",
    "enable_waitlist",
    "display_priority",
]


def _get_pending_revision(event: Event) -> Event | None:
    try:
        return event.pending_revision
    except Event.pending_revision.RelatedObjectDoesNotExist:
        return None
    except Exception:
        return None


def _get_syncable_pending_revision(event: Event) -> Event | None:
    if not event or event.source_event_id:
        return None

    revision = _get_pending_revision(event)
    if revision and revision.status in {"draft", "pending", "rejected"}:
        return revision
    return None


def _update_revision_resource_map(
    revision: Event,
    resource_key: str,
    source_id,
    draft_id=None,
    *,
    remove: bool = False,
) -> None:
    metadata = dict(revision.revision_metadata or {})
    resource_map = dict(metadata.get(resource_key) or {})
    normalized_source_id = str(source_id) if source_id else None

    if normalized_source_id:
        if remove or not draft_id:
            resource_map.pop(normalized_source_id, None)
        else:
            resource_map[normalized_source_id] = str(draft_id)

    metadata[resource_key] = resource_map
    revision.revision_metadata = metadata
    revision.save(update_fields=["revision_metadata"])


def get_editable_event(event: Event, create_if_missing: bool = False) -> Event:
    if event.source_event_id:
        return event

    if event.status != "published":
        return event

    revision = _get_pending_revision(event)
    if revision and revision.status in {"draft", "pending", "rejected"}:
        return revision

    if create_if_missing:
        return create_revision_from_live_event(event)

    return event


def translate_revision_object_id(event: Event, resource_key: str, object_id) -> str | None:
    if not event or not event.source_event_id or not object_id:
        return str(object_id) if object_id else None

    mapping = (event.revision_metadata or {}).get(resource_key) or {}
    translated = mapping.get(str(object_id))
    return translated or str(object_id)


def _clone_basic_fields(source: Event) -> Event:
    clone = Event(
        organizer=source.organizer,
        source_event=source,
        status="draft",
    )
    for field in EDITABLE_EVENT_FIELDS:
        setattr(clone, field, getattr(source, field))
    clone.save()
    clone.tags.set(source.tags.all())
    return clone


def _clone_registration_setup(source: Event, clone: Event) -> tuple[dict[str, str], dict[str, str]]:
    from apps.tickets.models import RegistrationCategory, RegistrationQuestion

    category_map: dict[str, str] = {}
    question_map: dict[str, str] = {}
    categories = source.registration_categories.prefetch_related("questions").all().order_by("sort_order")

    for category in categories:
        cloned_category = RegistrationCategory.objects.create(
            event=clone,
            category=category.category,
            label=category.label,
            is_active=category.is_active,
            sort_order=category.sort_order,
            require_student_email=category.require_student_email,
            require_admission_number=category.require_admission_number,
            ask_graduation_year=category.ask_graduation_year,
            ask_course=category.ask_course,
            ask_school=category.ask_school,
            ask_location=category.ask_location,
        )
        category_map[str(category.id)] = str(cloned_category.id)

        for question in category.questions.all().order_by("sort_order", "created_at"):
            cloned_question = RegistrationQuestion.objects.create(
                category=cloned_category,
                label=question.label,
                field_type=question.field_type,
                is_required=question.is_required,
                options=question.options,
                sort_order=question.sort_order,
            )
            question_map[str(question.id)] = str(cloned_question.id)

    return category_map, question_map


def _clone_ticket_types(source: Event, clone: Event, category_map: dict[str, str]) -> dict[str, str]:
    from apps.tickets.models import TicketType

    ticket_map: dict[str, str] = {}
    tickets = source.ticket_types.all().order_by("sort_order", "price")
    for ticket in tickets:
        cloned_ticket = TicketType.objects.create(
            event=clone,
            registration_category_id=category_map.get(str(ticket.registration_category_id)),
            name=ticket.name,
            ticket_class=ticket.ticket_class,
            price=ticket.price,
            currency=ticket.currency,
            quantity=ticket.quantity,
            quantity_sold=ticket.quantity_sold,
            quantity_reserved=ticket.quantity_reserved,
            description=ticket.description,
            sale_start=ticket.sale_start,
            sale_end=ticket.sale_end,
            min_per_order=ticket.min_per_order,
            max_per_order=ticket.max_per_order,
            is_active=ticket.is_active,
            sort_order=ticket.sort_order,
        )
        ticket_map[str(ticket.id)] = str(cloned_ticket.id)
    return ticket_map


def _clone_promo_codes(source: Event, clone: Event, ticket_map: dict[str, str]) -> dict[str, str]:
    from apps.tickets.models import PromoCode

    promo_map: dict[str, str] = {}
    promo_codes = source.promo_codes.prefetch_related("applicable_ticket_types").all().order_by("created_at", "code")
    for promo in promo_codes:
        cloned_promo = PromoCode.objects.create(
            event=clone,
            code=promo.code,
            discount_type=promo.discount_type,
            discount_value=promo.discount_value,
            expiry=promo.expiry,
            usage_limit=promo.usage_limit,
            times_used=promo.times_used,
            is_active=promo.is_active,
            minimum_order_amount=promo.minimum_order_amount,
        )
        mapped_ticket_ids = [
            ticket_map[str(ticket_id)]
            for ticket_id in promo.applicable_ticket_types.values_list("id", flat=True)
            if str(ticket_id) in ticket_map
        ]
        if mapped_ticket_ids:
            cloned_promo.applicable_ticket_types.set(mapped_ticket_ids)
        promo_map[str(promo.id)] = str(cloned_promo.id)

    return promo_map


def _clone_speakers(source: Event, clone: Event) -> dict[str, str]:
    from apps.speakers.models import Speaker

    speaker_map: dict[str, str] = {}
    speakers = source.speakers.all().order_by("sort_order", "name")
    for speaker in speakers:
        cloned_speaker = Speaker.objects.create(
            event=clone,
            name=speaker.name,
            title=speaker.title,
            organization=speaker.organization,
            bio=speaker.bio,
            avatar=speaker.avatar,
            twitter=speaker.twitter,
            linkedin=speaker.linkedin,
            is_mc=speaker.is_mc,
            sort_order=speaker.sort_order,
        )
        speaker_map[str(speaker.id)] = str(cloned_speaker.id)
    return speaker_map


def _clone_schedule(source: Event, clone: Event, speaker_map: dict[str, str]) -> dict[str, str]:
    from apps.schedules.models import ScheduleItem

    schedule_map: dict[str, str] = {}
    items = source.schedule_items.all().order_by("day", "sort_order", "start_time")
    for item in items:
        cloned_item = ScheduleItem.objects.create(
            event=clone,
            title=item.title,
            description=item.description,
            speaker_id=speaker_map.get(str(item.speaker_id)),
            start_time=item.start_time,
            end_time=item.end_time,
            day=item.day,
            session_type=item.session_type,
            location=item.location,
            sort_order=item.sort_order,
        )
        schedule_map[str(item.id)] = str(cloned_item.id)
    return schedule_map


def _clone_sponsors(source: Event, clone: Event) -> dict[str, str]:
    from apps.sponsors.models import Sponsor

    sponsor_map: dict[str, str] = {}
    sponsors = source.event_sponsors.all().order_by("sort_order", "name")
    for sponsor in sponsors:
        cloned_sponsor = Sponsor.objects.create(
            event=clone,
            name=sponsor.name,
            logo=sponsor.logo,
            website=sponsor.website,
            sort_order=sponsor.sort_order,
        )
        sponsor_map[str(sponsor.id)] = str(cloned_sponsor.id)
    return sponsor_map


@transaction.atomic
def create_revision_from_live_event(source: Event) -> Event:
    existing = _get_pending_revision(source)
    if existing and existing.status in {"draft", "pending", "rejected"}:
        return existing

    clone = _clone_basic_fields(source)
    category_map, question_map = _clone_registration_setup(source, clone)
    ticket_map = _clone_ticket_types(source, clone, category_map)
    promo_map = _clone_promo_codes(source, clone, ticket_map)
    speaker_map = _clone_speakers(source, clone)
    schedule_map = _clone_schedule(source, clone, speaker_map)
    sponsor_map = _clone_sponsors(source, clone)

    clone.revision_metadata = {
        "categories": category_map,
        "questions": question_map,
        "tickets": ticket_map,
        "promo_codes": promo_map,
        "speakers": speaker_map,
        "schedule": schedule_map,
        "sponsors": sponsor_map,
    }
    clone.save(update_fields=["revision_metadata"])
    return clone


def _copy_event_fields(source: Event, target: Event) -> Event:
    for field in EDITABLE_EVENT_FIELDS:
        setattr(target, field, getattr(source, field))
    target.save()
    target.tags.set(source.tags.all())
    return target


def _sync_registration_setup(revision: Event, live_event: Event) -> dict[str, str]:
    from apps.tickets.models import RegistrationCategory, RegistrationQuestion

    category_map = (revision.revision_metadata or {}).get("categories") or {}
    question_map = (revision.revision_metadata or {}).get("questions") or {}
    draft_to_source_category = {draft_id: source_id for source_id, draft_id in category_map.items()}
    draft_to_source_question = {draft_id: source_id for source_id, draft_id in question_map.items()}

    live_categories = list(live_event.registration_categories.prefetch_related("questions").all())
    live_categories_by_id = {str(category.id): category for category in live_categories}
    live_categories_by_type = {category.category: category for category in live_categories}

    merged_category_ids: dict[str, str] = {}

    for draft_category in revision.registration_categories.prefetch_related("questions").all().order_by("sort_order"):
        source_category_id = draft_to_source_category.get(str(draft_category.id))
        live_category = live_categories_by_id.get(source_category_id) or live_categories_by_type.get(draft_category.category)

        if live_category is None:
            live_category = RegistrationCategory.objects.create(
                event=live_event,
                category=draft_category.category,
                label=draft_category.label,
                is_active=draft_category.is_active,
                sort_order=draft_category.sort_order,
                require_student_email=draft_category.require_student_email,
                require_admission_number=draft_category.require_admission_number,
                ask_graduation_year=draft_category.ask_graduation_year,
                ask_course=draft_category.ask_course,
                ask_school=draft_category.ask_school,
                ask_location=draft_category.ask_location,
            )
        else:
            live_category.label = draft_category.label
            live_category.is_active = draft_category.is_active
            live_category.sort_order = draft_category.sort_order
            live_category.require_student_email = draft_category.require_student_email
            live_category.require_admission_number = draft_category.require_admission_number
            live_category.ask_graduation_year = draft_category.ask_graduation_year
            live_category.ask_course = draft_category.ask_course
            live_category.ask_school = draft_category.ask_school
            live_category.ask_location = draft_category.ask_location
            live_category.save()

        merged_category_ids[str(draft_category.id)] = str(live_category.id)
        live_questions_by_id = {str(question.id): question for question in live_category.questions.all()}

        for draft_question in draft_category.questions.all().order_by("sort_order", "created_at"):
            source_question_id = draft_to_source_question.get(str(draft_question.id))
            live_question = live_questions_by_id.get(source_question_id)

            if live_question is None:
                live_question = RegistrationQuestion.objects.create(
                    category=live_category,
                    label=draft_question.label,
                    field_type=draft_question.field_type,
                    is_required=draft_question.is_required,
                    options=draft_question.options,
                    sort_order=draft_question.sort_order,
                )
            else:
                live_question.label = draft_question.label
                live_question.field_type = draft_question.field_type
                live_question.is_required = draft_question.is_required
                live_question.options = draft_question.options
                live_question.sort_order = draft_question.sort_order
                live_question.save()

    return merged_category_ids


def _sync_ticket_types(revision: Event, live_event: Event, merged_category_ids: dict[str, str]) -> dict[str, str]:
    from apps.tickets.models import TicketType

    ticket_map = (revision.revision_metadata or {}).get("tickets") or {}
    draft_to_source_ticket = {draft_id: source_id for source_id, draft_id in ticket_map.items()}
    live_tickets_by_id = {str(ticket.id): ticket for ticket in live_event.ticket_types.all()}
    merged_ticket_ids: dict[str, str] = {}

    for draft_ticket in revision.ticket_types.all().order_by("sort_order", "price"):
        source_ticket_id = draft_to_source_ticket.get(str(draft_ticket.id))
        live_ticket = live_tickets_by_id.get(source_ticket_id)
        registration_category_id = merged_category_ids.get(str(draft_ticket.registration_category_id))

        if live_ticket is None:
            TicketType.objects.create(
                event=live_event,
                registration_category_id=registration_category_id,
                name=draft_ticket.name,
                ticket_class=draft_ticket.ticket_class,
                price=draft_ticket.price,
                currency=draft_ticket.currency,
                quantity=draft_ticket.quantity,
                description=draft_ticket.description,
                sale_start=draft_ticket.sale_start,
                sale_end=draft_ticket.sale_end,
                min_per_order=draft_ticket.min_per_order,
                max_per_order=draft_ticket.max_per_order,
                is_active=draft_ticket.is_active,
                sort_order=draft_ticket.sort_order,
            )
        else:
            live_ticket.registration_category_id = registration_category_id
            live_ticket.name = draft_ticket.name
            live_ticket.ticket_class = draft_ticket.ticket_class
            live_ticket.price = draft_ticket.price
            live_ticket.currency = draft_ticket.currency
            live_ticket.quantity = draft_ticket.quantity
            live_ticket.description = draft_ticket.description
            live_ticket.sale_start = draft_ticket.sale_start
            live_ticket.sale_end = draft_ticket.sale_end
            live_ticket.min_per_order = draft_ticket.min_per_order
            live_ticket.max_per_order = draft_ticket.max_per_order
            live_ticket.is_active = draft_ticket.is_active
            live_ticket.sort_order = draft_ticket.sort_order
            live_ticket.save()

        merged_ticket_ids[str(draft_ticket.id)] = str(live_ticket.id)

    return merged_ticket_ids


def _sync_speakers(revision: Event, live_event: Event) -> dict[str, str]:
    from apps.speakers.models import Speaker

    speaker_map = (revision.revision_metadata or {}).get("speakers") or {}
    draft_to_source_speaker = {draft_id: source_id for source_id, draft_id in speaker_map.items()}
    live_speakers_by_id = {str(speaker.id): speaker for speaker in live_event.speakers.all()}
    merged_speaker_ids: dict[str, str] = {}

    for draft_speaker in revision.speakers.all().order_by("sort_order", "name"):
        source_speaker_id = draft_to_source_speaker.get(str(draft_speaker.id))
        live_speaker = live_speakers_by_id.get(source_speaker_id)

        if live_speaker is None:
            live_speaker = Speaker.objects.create(
                event=live_event,
                name=draft_speaker.name,
                title=draft_speaker.title,
                organization=draft_speaker.organization,
                bio=draft_speaker.bio,
                avatar=draft_speaker.avatar,
                twitter=draft_speaker.twitter,
                linkedin=draft_speaker.linkedin,
                is_mc=draft_speaker.is_mc,
                sort_order=draft_speaker.sort_order,
            )
        else:
            live_speaker.name = draft_speaker.name
            live_speaker.title = draft_speaker.title
            live_speaker.organization = draft_speaker.organization
            live_speaker.bio = draft_speaker.bio
            live_speaker.avatar = draft_speaker.avatar
            live_speaker.twitter = draft_speaker.twitter
            live_speaker.linkedin = draft_speaker.linkedin
            live_speaker.is_mc = draft_speaker.is_mc
            live_speaker.sort_order = draft_speaker.sort_order
            live_speaker.save()

        merged_speaker_ids[str(draft_speaker.id)] = str(live_speaker.id)

    return merged_speaker_ids


def _sync_schedule(revision: Event, live_event: Event, merged_speaker_ids: dict[str, str]) -> None:
    from apps.schedules.models import ScheduleItem

    schedule_map = (revision.revision_metadata or {}).get("schedule") or {}
    draft_to_source_schedule = {draft_id: source_id for source_id, draft_id in schedule_map.items()}
    live_schedule_by_id = {str(item.id): item for item in live_event.schedule_items.all()}

    for draft_item in revision.schedule_items.all().order_by("day", "sort_order", "start_time"):
        source_schedule_id = draft_to_source_schedule.get(str(draft_item.id))
        live_item = live_schedule_by_id.get(source_schedule_id)
        speaker_id = merged_speaker_ids.get(str(draft_item.speaker_id))

        if live_item is None:
            ScheduleItem.objects.create(
                event=live_event,
                title=draft_item.title,
                description=draft_item.description,
                speaker_id=speaker_id,
                start_time=draft_item.start_time,
                end_time=draft_item.end_time,
                day=draft_item.day,
                session_type=draft_item.session_type,
                location=draft_item.location,
                sort_order=draft_item.sort_order,
            )
            continue

        live_item.title = draft_item.title
        live_item.description = draft_item.description
        live_item.speaker_id = speaker_id
        live_item.start_time = draft_item.start_time
        live_item.end_time = draft_item.end_time
        live_item.day = draft_item.day
        live_item.session_type = draft_item.session_type
        live_item.location = draft_item.location
        live_item.sort_order = draft_item.sort_order
        live_item.save()


def _sync_sponsors(revision: Event, live_event: Event) -> None:
    from apps.sponsors.models import Sponsor

    sponsor_map = (revision.revision_metadata or {}).get("sponsors") or {}
    draft_to_source_sponsor = {draft_id: source_id for source_id, draft_id in sponsor_map.items()}
    live_sponsors_by_id = {str(sponsor.id): sponsor for sponsor in live_event.event_sponsors.all()}

    for draft_sponsor in revision.event_sponsors.all().order_by("sort_order", "name"):
        source_sponsor_id = draft_to_source_sponsor.get(str(draft_sponsor.id))
        live_sponsor = live_sponsors_by_id.get(source_sponsor_id)

        if live_sponsor is None:
            Sponsor.objects.create(
                event=live_event,
                name=draft_sponsor.name,
                logo=draft_sponsor.logo,
                website=draft_sponsor.website,
                sort_order=draft_sponsor.sort_order,
            )
            continue

        live_sponsor.name = draft_sponsor.name
        live_sponsor.logo = draft_sponsor.logo
        live_sponsor.website = draft_sponsor.website
        live_sponsor.sort_order = draft_sponsor.sort_order
        live_sponsor.save()


def _sync_promo_codes(revision: Event, live_event: Event, merged_ticket_ids: dict[str, str]) -> None:
    from apps.tickets.models import PromoCode

    promo_map = (revision.revision_metadata or {}).get("promo_codes") or {}
    draft_to_source_promo = {draft_id: source_id for source_id, draft_id in promo_map.items()}
    live_promos = live_event.promo_codes.prefetch_related("applicable_ticket_types").all()
    live_promos_by_id = {str(promo.id): promo for promo in live_promos}

    for draft_promo in revision.promo_codes.prefetch_related("applicable_ticket_types").all().order_by("created_at", "code"):
        source_promo_id = draft_to_source_promo.get(str(draft_promo.id))
        live_promo = live_promos_by_id.get(source_promo_id)
        mapped_ticket_ids = [
            merged_ticket_ids[str(ticket_id)]
            for ticket_id in draft_promo.applicable_ticket_types.values_list("id", flat=True)
            if str(ticket_id) in merged_ticket_ids
        ]

        if live_promo is None:
            live_promo = PromoCode.objects.create(
                event=live_event,
                code=draft_promo.code,
                discount_type=draft_promo.discount_type,
                discount_value=draft_promo.discount_value,
                expiry=draft_promo.expiry,
                usage_limit=draft_promo.usage_limit,
                times_used=draft_promo.times_used,
                is_active=draft_promo.is_active,
                minimum_order_amount=draft_promo.minimum_order_amount,
            )
        else:
            live_promo.code = draft_promo.code
            live_promo.discount_type = draft_promo.discount_type
            live_promo.discount_value = draft_promo.discount_value
            live_promo.expiry = draft_promo.expiry
            live_promo.usage_limit = draft_promo.usage_limit
            live_promo.times_used = max(live_promo.times_used, draft_promo.times_used)
            live_promo.is_active = draft_promo.is_active
            live_promo.minimum_order_amount = draft_promo.minimum_order_amount
            live_promo.save()

        live_promo.applicable_ticket_types.set(mapped_ticket_ids)


@transaction.atomic
def merge_revision_into_live_event(revision: Event) -> Event:
    live_event = revision.source_event
    if live_event is None:
        return revision

    _copy_event_fields(revision, live_event)
    merged_category_ids = _sync_registration_setup(revision, live_event)
    merged_ticket_ids = _sync_ticket_types(revision, live_event, merged_category_ids)
    _sync_promo_codes(revision, live_event, merged_ticket_ids)
    merged_speaker_ids = _sync_speakers(revision, live_event)
    _sync_schedule(revision, live_event, merged_speaker_ids)
    _sync_sponsors(revision, live_event)
    revision.delete()
    return live_event


def sync_live_ticket_to_pending_revision(ticket) -> None:
    from apps.tickets.models import TicketType

    live_event = getattr(ticket, "event", None)
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    ticket_map = (revision.revision_metadata or {}).get("tickets") or {}
    draft_ticket_id = ticket_map.get(str(ticket.id))
    draft_ticket = revision.ticket_types.filter(id=draft_ticket_id).first() if draft_ticket_id else None

    if draft_ticket is None:
        draft_ticket = TicketType(event=revision)

    category_map = (revision.revision_metadata or {}).get("categories") or {}
    draft_ticket.registration_category_id = category_map.get(str(ticket.registration_category_id))
    draft_ticket.name = ticket.name
    draft_ticket.ticket_class = ticket.ticket_class
    draft_ticket.price = ticket.price
    draft_ticket.currency = ticket.currency
    draft_ticket.quantity = ticket.quantity
    draft_ticket.quantity_sold = ticket.quantity_sold
    draft_ticket.quantity_reserved = ticket.quantity_reserved
    draft_ticket.description = ticket.description
    draft_ticket.sale_start = ticket.sale_start
    draft_ticket.sale_end = ticket.sale_end
    draft_ticket.min_per_order = ticket.min_per_order
    draft_ticket.max_per_order = ticket.max_per_order
    draft_ticket.is_active = ticket.is_active
    draft_ticket.sort_order = ticket.sort_order
    draft_ticket.save()

    _update_revision_resource_map(revision, "tickets", ticket.id, draft_ticket.id)


def delete_live_ticket_from_pending_revision(live_event: Event, ticket_id) -> None:
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    ticket_map = (revision.revision_metadata or {}).get("tickets") or {}
    draft_ticket_id = ticket_map.get(str(ticket_id))
    if draft_ticket_id:
        revision.ticket_types.filter(id=draft_ticket_id).delete()
    _update_revision_resource_map(revision, "tickets", ticket_id, remove=True)


def sync_live_speaker_to_pending_revision(speaker) -> None:
    from apps.speakers.models import Speaker

    live_event = getattr(speaker, "event", None)
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    speaker_map = (revision.revision_metadata or {}).get("speakers") or {}
    draft_speaker_id = speaker_map.get(str(speaker.id))
    draft_speaker = revision.speakers.filter(id=draft_speaker_id).first() if draft_speaker_id else None

    if draft_speaker is None:
        draft_speaker = Speaker(event=revision)

    draft_speaker.name = speaker.name
    draft_speaker.title = speaker.title
    draft_speaker.organization = speaker.organization
    draft_speaker.bio = speaker.bio
    draft_speaker.avatar = speaker.avatar
    draft_speaker.twitter = speaker.twitter
    draft_speaker.linkedin = speaker.linkedin
    draft_speaker.is_mc = speaker.is_mc
    draft_speaker.sort_order = speaker.sort_order
    draft_speaker.save()

    _update_revision_resource_map(revision, "speakers", speaker.id, draft_speaker.id)


def delete_live_speaker_from_pending_revision(live_event: Event, speaker_id) -> None:
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    speaker_map = (revision.revision_metadata or {}).get("speakers") or {}
    draft_speaker_id = speaker_map.get(str(speaker_id))
    if draft_speaker_id:
        revision.speakers.filter(id=draft_speaker_id).delete()
    _update_revision_resource_map(revision, "speakers", speaker_id, remove=True)


def sync_live_schedule_item_to_pending_revision(schedule_item) -> None:
    from apps.schedules.models import ScheduleItem

    live_event = getattr(schedule_item, "event", None)
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    schedule_map = (revision.revision_metadata or {}).get("schedule") or {}
    draft_schedule_id = schedule_map.get(str(schedule_item.id))
    draft_schedule = revision.schedule_items.filter(id=draft_schedule_id).first() if draft_schedule_id else None

    if draft_schedule is None:
        draft_schedule = ScheduleItem(event=revision)

    speaker_map = (revision.revision_metadata or {}).get("speakers") or {}
    draft_schedule.title = schedule_item.title
    draft_schedule.description = schedule_item.description
    draft_schedule.speaker_id = speaker_map.get(str(schedule_item.speaker_id))
    draft_schedule.start_time = schedule_item.start_time
    draft_schedule.end_time = schedule_item.end_time
    draft_schedule.day = schedule_item.day
    draft_schedule.session_type = schedule_item.session_type
    draft_schedule.location = schedule_item.location
    draft_schedule.sort_order = schedule_item.sort_order
    draft_schedule.save()

    _update_revision_resource_map(revision, "schedule", schedule_item.id, draft_schedule.id)


def delete_live_schedule_item_from_pending_revision(live_event: Event, schedule_item_id) -> None:
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    schedule_map = (revision.revision_metadata or {}).get("schedule") or {}
    draft_schedule_id = schedule_map.get(str(schedule_item_id))
    if draft_schedule_id:
        revision.schedule_items.filter(id=draft_schedule_id).delete()
    _update_revision_resource_map(revision, "schedule", schedule_item_id, remove=True)


def sync_live_sponsor_to_pending_revision(sponsor) -> None:
    from apps.sponsors.models import Sponsor

    live_event = getattr(sponsor, "event", None)
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    sponsor_map = (revision.revision_metadata or {}).get("sponsors") or {}
    draft_sponsor_id = sponsor_map.get(str(sponsor.id))
    draft_sponsor = revision.event_sponsors.filter(id=draft_sponsor_id).first() if draft_sponsor_id else None

    if draft_sponsor is None:
        draft_sponsor = Sponsor(event=revision)

    draft_sponsor.name = sponsor.name
    draft_sponsor.logo = sponsor.logo
    draft_sponsor.website = sponsor.website
    draft_sponsor.sort_order = sponsor.sort_order
    draft_sponsor.save()

    _update_revision_resource_map(revision, "sponsors", sponsor.id, draft_sponsor.id)


def delete_live_sponsor_from_pending_revision(live_event: Event, sponsor_id) -> None:
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    sponsor_map = (revision.revision_metadata or {}).get("sponsors") or {}
    draft_sponsor_id = sponsor_map.get(str(sponsor_id))
    if draft_sponsor_id:
        revision.event_sponsors.filter(id=draft_sponsor_id).delete()
    _update_revision_resource_map(revision, "sponsors", sponsor_id, remove=True)


def sync_live_promo_code_to_pending_revision(promo_code) -> None:
    from apps.tickets.models import PromoCode

    live_event = getattr(promo_code, "event", None)
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    promo_map = (revision.revision_metadata or {}).get("promo_codes") or {}
    draft_promo_id = promo_map.get(str(promo_code.id))
    draft_promo = revision.promo_codes.filter(id=draft_promo_id).first() if draft_promo_id else None

    if draft_promo is None:
        draft_promo = PromoCode(event=revision)

    ticket_map = (revision.revision_metadata or {}).get("tickets") or {}
    mapped_ticket_ids = [
        ticket_map[str(ticket_id)]
        for ticket_id in promo_code.applicable_ticket_types.values_list("id", flat=True)
        if str(ticket_id) in ticket_map
    ]

    draft_promo.code = promo_code.code
    draft_promo.discount_type = promo_code.discount_type
    draft_promo.discount_value = promo_code.discount_value
    draft_promo.expiry = promo_code.expiry
    draft_promo.usage_limit = promo_code.usage_limit
    draft_promo.times_used = promo_code.times_used
    draft_promo.is_active = promo_code.is_active
    draft_promo.minimum_order_amount = promo_code.minimum_order_amount
    draft_promo.save()
    draft_promo.applicable_ticket_types.set(mapped_ticket_ids)

    _update_revision_resource_map(revision, "promo_codes", promo_code.id, draft_promo.id)


def delete_live_promo_code_from_pending_revision(live_event: Event, promo_code_id) -> None:
    revision = _get_syncable_pending_revision(live_event)
    if revision is None:
        return

    promo_map = (revision.revision_metadata or {}).get("promo_codes") or {}
    draft_promo_id = promo_map.get(str(promo_code_id))
    if draft_promo_id:
        revision.promo_codes.filter(id=draft_promo_id).delete()
    _update_revision_resource_map(revision, "promo_codes", promo_code_id, remove=True)
