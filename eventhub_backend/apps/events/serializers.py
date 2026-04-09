from __future__ import annotations

from decimal import Decimal

from django.db.models import Min
from rest_framework import serializers

from apps.accounts.models import OrganizerProfile, User
from apps.tickets.models import TicketType
from apps.tickets.serializers import RegistrationCategorySerializer
from apps.speakers.serializers import SpeakerSerializer
from apps.schedules.serializers import ScheduleItemSerializer
from apps.sponsors.serializers import SponsorSerializer
from .compat import get_event_attr
from .category_catalog import ensure_curated_categories, resolve_category_name, serialize_category_payload
from .models import Category, Event, Tag


def _safe_media_url(file_obj, request=None):
    if not file_obj:
        return None
    try:
        raw_url = file_obj.url
    except Exception:
        return None
    if request:
        try:
            return request.build_absolute_uri(raw_url)
        except Exception:
            return raw_url
    return raw_url


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    sort_order = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "description", "is_active", "sort_order"]

    def _payload(self, obj):
        return serialize_category_payload(obj)

    def get_name(self, obj):
        return self._payload(obj)["name"]

    def get_slug(self, obj):
        return self._payload(obj)["slug"]

    def get_icon(self, obj):
        return self._payload(obj)["icon"]

    def get_description(self, obj):
        return self._payload(obj)["description"]

    def get_sort_order(self, obj):
        return self._payload(obj)["sort_order"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "slug"]


class OrganizerMiniSerializer(serializers.ModelSerializer):
    organization_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    brand_color = serializers.SerializerMethodField()
    total_events = serializers.SerializerMethodField()
    total_attendees = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "avatar",
            "organization_name",
            "brand_color",
            "total_events",
            "total_attendees",
        ]

    def get_organization_name(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.organization_name if profile and profile.organization_name else obj.get_full_name()

    def get_avatar(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        # Use organizer logo if present, else fall back to user avatar
        image = None
        if profile and profile.logo:
            image = profile.logo
        elif obj.avatar:
            image = obj.avatar
        return _safe_media_url(image, self.context.get("request"))

    def get_brand_color(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.brand_color if profile else "#1E4DB7"

    def get_total_events(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.total_events if profile else 0

    def get_total_attendees(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.total_attendees if profile else 0


class EventTimeStateMixin(serializers.Serializer):
    time_state = serializers.SerializerMethodField()
    is_today = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()

    def get_time_state(self, obj: Event):
        try:
            return obj.get_time_state()
        except Exception:
            return "cancelled" if getattr(obj, "status", None) == "cancelled" else "upcoming"

    def get_is_today(self, obj: Event) -> bool:
        try:
            return obj.get_time_state() in {"today", "live"}
        except Exception:
            return False

    def get_is_past(self, obj: Event) -> bool:
        try:
            return obj.get_time_state() == "past"
        except Exception:
            return False


class EventListSerializer(EventTimeStateMixin, serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    organizer = OrganizerMiniSerializer(read_only=True)
    lowest_ticket_price = serializers.SerializerMethodField()
    is_free = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    display_priority = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "cover_image",
            "start_date",
            "start_time",
            "end_date",
            "end_time",
            "venue_name",
            "city",
            "country",
            "format",
            "category_name",
            "lowest_ticket_price",
            "is_free",
            "attendee_count",
            "is_featured",
            "status",
            "display_priority",
            "published_at",
            "time_state",
            "is_today",
            "is_past",
            "organizer",
            "stickers",
            "theme_color",
            "accent_color",
        ]

    def get_lowest_ticket_price(self, obj: Event):
        try:
            if hasattr(obj, "lowest_ticket_price_annotated"):
                return obj.lowest_ticket_price_annotated
            agg = obj.ticket_types.filter(is_active=True).aggregate(price=Min("price"))
            price = agg["price"]
            return price if isinstance(price, (int, float, Decimal)) else None
        except Exception:
            return None

    def get_is_free(self, obj: Event) -> bool:
        try:
            has_active = getattr(obj, "has_active_tickets_annotated", None)
            has_paid = getattr(obj, "has_paid_tickets_annotated", None)
            if has_active is not None and has_paid is not None:
                return bool(has_active and not has_paid)
            prices = obj.ticket_types.filter(is_active=True).values_list("price", flat=True)
            return all(Decimal(p or 0) == 0 for p in prices) if prices else False
        except Exception:
            return False

    def get_cover_image(self, obj: Event):
        return _safe_media_url(getattr(obj, "cover_image", None), self.context.get("request"))

    def get_display_priority(self, obj: Event):
        return get_event_attr(obj, "display_priority", 0) or 0

    def get_category_name(self, obj: Event):
        category = getattr(obj, "category", None)
        if not category:
            return None
        return serialize_category_payload(category)["name"]


class TicketTypeSerializer(serializers.ModelSerializer):
    quantity_available = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    is_almost_sold_out = serializers.BooleanField(read_only=True)
    is_on_sale = serializers.BooleanField(read_only=True)

    class Meta:
        model = TicketType
        fields = [
            "id",
            "event",
            "name",
            "ticket_class",
            "price",
            "currency",
            "quantity",
            "quantity_sold",
            "quantity_reserved",
            "description",
            "sale_start",
            "sale_end",
            "min_per_order",
            "max_per_order",
            "is_active",
            "sort_order",
            "quantity_available",
            "is_sold_out",
            "is_almost_sold_out",
            "is_on_sale",
        ]
        read_only_fields = [
            "quantity_sold",
            "quantity_reserved",
            "quantity_available",
            "is_sold_out",
            "is_almost_sold_out",
            "is_on_sale",
        ]


class EventDetailSerializer(EventTimeStateMixin, serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    organizer = OrganizerMiniSerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()
    tickets = serializers.SerializerMethodField()
    promo_codes = serializers.SerializerMethodField()
    mc = serializers.SerializerMethodField()
    speakers = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    sponsors = serializers.SerializerMethodField()
    registration_categories = serializers.SerializerMethodField()
    speakers_count = serializers.IntegerField(read_only=True)
    schedule_count = serializers.IntegerField(read_only=True)
    sponsors_count = serializers.IntegerField(read_only=True)
    approval_requested_at = serializers.SerializerMethodField()
    reviewed_at = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    review_notes = serializers.SerializerMethodField()
    display_priority = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        exclude_fields = kwargs.pop("exclude_fields", None)
        super().__init__(*args, **kwargs)
        if exclude_fields:
            for field in exclude_fields:
                self.fields.pop(field, None)

    def _can_view_review_data(self, obj: Event) -> bool:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or getattr(user, "role", None) == "admin" or obj.organizer_id == user.id)

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "category",
            "tags",
            "event_type",
            "format",
            "status",
            "display_priority",
            "time_state",
            "is_today",
            "is_past",
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
            "published_at",
            "scheduled_publish_at",
            "approval_requested_at",
            "reviewed_at",
            "reviewed_by_name",
            "review_notes",
            "attendee_count",
            "view_count",
            "organizer",
            "tickets",
            "promo_codes",
            "mc",
            "speakers",
            "schedule",
            "sponsors",
            "registration_categories",
            "speakers_count",
            "schedule_count",
            "sponsors_count",
            "send_reminders",
            "enable_waitlist",
        ]

    def get_approval_requested_at(self, obj: Event):
        if not self._can_view_review_data(obj):
            return None
        return get_event_attr(obj, "approval_requested_at")

    def get_reviewed_at(self, obj: Event):
        if not self._can_view_review_data(obj):
            return None
        return get_event_attr(obj, "reviewed_at")

    def get_reviewed_by_name(self, obj: Event):
        reviewed_by = get_event_attr(obj, "reviewed_by")
        if not self._can_view_review_data(obj) or not reviewed_by:
            return None
        return reviewed_by.get_full_name() or reviewed_by.email

    def get_review_notes(self, obj: Event):
        review_notes = get_event_attr(obj, "review_notes", "")
        return review_notes if self._can_view_review_data(obj) and review_notes else None

    def get_display_priority(self, obj: Event):
        return get_event_attr(obj, "display_priority", 0) or 0

    def get_cover_image(self, obj: Event):
        return _safe_media_url(getattr(obj, "cover_image", None), self.context.get("request"))

    def get_tickets(self, obj: Event):
        prefetched = getattr(obj, "prefetched_ticket_types_active", None)
        qs = prefetched if prefetched is not None else obj.ticket_types.filter(is_active=True).order_by("sort_order", "price")
        return [
            {
                "id": t.id,
                "type": t.name,
                "price": t.price,
                "quantity": t.quantity,
                "remaining": t.quantity_available,
                "description": t.description,
                "currency": t.currency,
                "ticket_class": t.ticket_class,
                "is_sold_out": t.is_sold_out,
                "is_almost_sold_out": t.is_almost_sold_out,
                "registration_category": str(t.registration_category_id) if t.registration_category_id else None,
                "registration_category_type": t.registration_category.category if t.registration_category else None,
                "registration_category_label": (
                    t.registration_category.label
                    if t.registration_category and t.registration_category.category == "guest" and t.registration_category.label
                    else (t.registration_category.get_category_display() if t.registration_category else None)
                ),
            }
            for t in qs
        ]

    def get_promo_codes(self, obj: Event):
        # For frontend convenience; validation will still happen server-side
        prefetched = getattr(obj, "prefetched_promo_codes_active", None)
        promo_codes = prefetched if prefetched is not None else obj.promo_codes.filter(is_active=True)
        return [
            {
                "code": p.code,
                "discountType": p.discount_type,
                "discountValue": p.discount_value,
                "expiry": p.expiry,
                "usageLimit": p.usage_limit,
            }
            for p in promo_codes
        ]

    def get_mc(self, obj: Event):
        prefetched = getattr(obj, "prefetched_speakers_ordered", None)
        if prefetched is not None:
            mc = next((speaker for speaker in prefetched if speaker.is_mc), None)
        else:
            mc = obj.speakers.filter(is_mc=True).first()
        if mc:
            return SpeakerSerializer(mc, context=self.context).data
        return None

    def get_speakers(self, obj: Event):
        """Return all non-MC speakers, sorted by sort_order."""
        prefetched = getattr(obj, "prefetched_speakers_ordered", None)
        if prefetched is not None:
            qs = [speaker for speaker in prefetched if not speaker.is_mc]
        else:
            qs = obj.speakers.filter(is_mc=False).order_by("sort_order", "name")
        return SpeakerSerializer(qs, many=True, context=self.context).data

    def get_schedule(self, obj: Event):
        """Return schedule items sorted by day then start_time."""
        from apps.schedules.serializers import ScheduleItemSerializer
        prefetched = getattr(obj, "prefetched_schedule_items", None)
        qs = prefetched if prefetched is not None else obj.schedule_items.select_related("speaker").order_by("day", "sort_order", "start_time")
        return ScheduleItemSerializer(qs, many=True, context=self.context).data

    def get_sponsors(self, obj: Event):
        prefetched = getattr(obj, "prefetched_sponsors", None)
        qs = prefetched if prefetched is not None else obj.event_sponsors.order_by("sort_order", "name")
        return SponsorSerializer(qs, many=True, context=self.context).data

    def get_registration_categories(self, obj: Event):
        qs = obj.registration_categories.filter(is_active=True).prefetch_related("questions").order_by("sort_order")
        return RegistrationCategorySerializer(qs, many=True).data


class EventCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "category",
            "tags",
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
            "display_priority",
            "theme_color",
            "accent_color",
            "refund_policy",
            "custom_refund_policy",
            "stickers",
            "scheduled_publish_at",
            "status",
            "send_reminders",
            "enable_waitlist",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "slug": {"read_only": True},
            "status": {"required": False},
        }

    # Accept a list of tag names for create/update instead of tag IDs.
    tags = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    stickers = serializers.JSONField(required=False)

    def validate_category(self, value):
        if value is None:
            return value

        ensure_curated_categories(Category, Event)
        resolved_name = resolve_category_name(getattr(value, "slug", None) or getattr(value, "name", None))
        return Category.objects.filter(name=resolved_name).first() or value

    def validate_stickers(self, value):
        if isinstance(value, str):
            import json
            try:
                return json.loads(value)
            except (ValueError, TypeError):
                return []
        return value

    def validate(self, attrs):
        allowed_statuses = {"draft", "pending"}
        if "status" in attrs and attrs["status"] not in allowed_statuses:
            raise serializers.ValidationError({"status": "Status can only be draft or pending."})

        request = self.context.get("request")
        requested_priority = attrs.get("display_priority")
        current_priority = getattr(self.instance, "display_priority", 0)
        if requested_priority is not None:
            if requested_priority < 0:
                raise serializers.ValidationError({"display_priority": "Priority must be zero or a positive number."})

            can_manage_priority = bool(
                request
                and request.user.is_authenticated
                and (request.user.is_staff or getattr(request.user, "role", None) == "admin")
            )
            if not can_manage_priority and requested_priority != current_priority:
                raise serializers.ValidationError(
                    {"display_priority": "Only admins can change homepage priority."}
                )

        start_date = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end_date = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        start_time = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end_time = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        format_value = attrs.get("format") or getattr(self.instance, "format", None)

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})

        if start_date and end_date and start_date == end_date and start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        if format_value in ("online", "hybrid"):
            if not (attrs.get("streaming_link") or getattr(self.instance, "streaming_link", "")):
                raise serializers.ValidationError({"streaming_link": "Streaming link is required for online events."})

        if format_value in ("in_person", "hybrid"):
            venue_name = attrs.get("venue_name") or getattr(self.instance, "venue_name", "")
            venue_address = attrs.get("venue_address") or getattr(self.instance, "venue_address", "")
            if not venue_name or not venue_address:
                raise serializers.ValidationError(
                    {"venue_name": "Venue name and address are required for in-person events."}
                )

        refund_policy = attrs.get("refund_policy") or getattr(self.instance, "refund_policy", None)
        if refund_policy == "custom":
            custom = attrs.get("custom_refund_policy") or getattr(self.instance, "custom_refund_policy", "")
            if not custom:
                raise serializers.ValidationError(
                    {"custom_refund_policy": "Custom refund policy text is required when using custom policy."}
                )

        return attrs

    def create(self, validated_data):
        from .models import Tag
        request = self.context["request"]
        user = request.user
        tags_data = validated_data.pop("tags", [])
        status = validated_data.pop("status", "draft")
        
        event = Event.objects.create(organizer=user, status=status, **validated_data)
        
        # Handle tags
        from django.template.defaultfilters import slugify
        for tag_name in tags_data:
            tag_name = tag_name.strip()
            if tag_name:
                tag, _ = Tag.objects.get_or_create(
                    name__iexact=tag_name,
                    defaults={"name": tag_name, "slug": slugify(tag_name)}
                )
                event.tags.add(tag)

        return event


    def update(self, instance, validated_data):
        from .models import Tag
        tags_data = validated_data.pop("tags", None)
        status = validated_data.pop("status", None)
        if status and status not in {"draft", "pending"}:
            raise serializers.ValidationError({"status": "Status can only be draft or pending."})
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if status:
            instance.status = status
            
        instance.save()
        
        if tags_data is not None:
            instance.tags.clear()
            from django.template.defaultfilters import slugify
            for tag_name in tags_data:
                tag_name = tag_name.strip()
                if tag_name:
                    tag, _ = Tag.objects.get_or_create(
                        name__iexact=tag_name,
                        defaults={"name": tag_name, "slug": slugify(tag_name)}
                    )
                    instance.tags.add(tag)
        return instance


class EventStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["status"]


class EventReviewQueueSerializer(serializers.ModelSerializer):
    organizer = OrganizerMiniSerializer(read_only=True)
    approval_requested_at = serializers.SerializerMethodField()
    reviewed_at = serializers.SerializerMethodField()
    review_notes = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "cover_image",
            "start_date",
            "start_time",
            "end_date",
            "end_time",
            "venue_name",
            "city",
            "country",
            "format",
            "status",
            "approval_requested_at",
            "reviewed_at",
            "review_notes",
            "organizer",
        ]

    def get_approval_requested_at(self, obj: Event):
        return get_event_attr(obj, "approval_requested_at")

    def get_reviewed_at(self, obj: Event):
        return get_event_attr(obj, "reviewed_at")

    def get_review_notes(self, obj: Event):
        return get_event_attr(obj, "review_notes", "")


class EventReviewRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(trim_whitespace=True)

    def validate_reason(self, value):
        reason = (value or "").strip()
        if not reason:
            raise serializers.ValidationError("Please provide a reason for rejecting this event.")
        return reason
