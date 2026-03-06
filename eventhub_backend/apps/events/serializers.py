from __future__ import annotations

from decimal import Decimal

from django.db.models import Min
from rest_framework import serializers

from apps.accounts.models import OrganizerProfile, User
from apps.tickets.models import TicketType
from apps.speakers.serializers import SpeakerSerializer
from apps.schedules.serializers import ScheduleItemSerializer
from apps.sponsors.serializers import SponsorSerializer
from .models import Category, Event, Tag


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


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
        
        if not image:
            return None
            
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image.url)
        return image.url

    def get_brand_color(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.brand_color if profile else "#1E4DB7"

    def get_total_events(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.total_events if profile else 0

    def get_total_attendees(self, obj):
        profile: OrganizerProfile | None = getattr(obj, "organizer_profile", None)
        return profile.total_attendees if profile else 0


class EventListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    organizer = OrganizerMiniSerializer(read_only=True)
    lowest_ticket_price = serializers.SerializerMethodField()
    is_free = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "slug",
            "title",
            "cover_image",
            "start_date",
            "start_time",
            "city",
            "country",
            "format",
            "category_name",
            "lowest_ticket_price",
            "is_free",
            "attendee_count",
            "is_featured",
            "status",
            "organizer",
            "stickers",
            "theme_color",
            "accent_color",
        ]

    def get_lowest_ticket_price(self, obj: Event):
        agg = obj.ticket_types.filter(is_active=True).aggregate(price=Min("price"))
        price = agg["price"]
        return price if isinstance(price, (int, float, Decimal)) else None

    def get_is_free(self, obj: Event) -> bool:
        prices = obj.ticket_types.filter(is_active=True).values_list("price", flat=True)
        return all(Decimal(p or 0) == 0 for p in prices) if prices else False


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


class EventDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    organizer = OrganizerMiniSerializer(read_only=True)
    tickets = serializers.SerializerMethodField()
    promo_codes = serializers.SerializerMethodField()
    mc = serializers.SerializerMethodField()
    speakers = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    sponsors = serializers.SerializerMethodField()

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
            "attendee_count",
            "view_count",
            "organizer",
            "tickets",
            "promo_codes",
            "mc",
            "speakers",
            "schedule",
            "sponsors",
        ]

    def get_tickets(self, obj: Event):
        qs = obj.ticket_types.filter(is_active=True).order_by("sort_order", "price")
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
            }
            for t in qs
        ]

    def get_promo_codes(self, obj: Event):
        # For frontend convenience; validation will still happen server-side
        return [
            {
                "code": p.code,
                "discountType": p.discount_type,
                "discountValue": p.discount_value,
                "expiry": p.expiry,
                "usageLimit": p.usage_limit,
            }
            for p in obj.promo_codes.filter(is_active=True)
        ]

    def get_mc(self, obj: Event):
        mc = obj.speakers.filter(is_mc=True).first()
        if mc:
            return SpeakerSerializer(mc, context=self.context).data
        return None

    def get_speakers(self, obj: Event):
        """Return all non-MC speakers, sorted by sort_order."""
        qs = obj.speakers.filter(is_mc=False).order_by("sort_order", "name")
        return SpeakerSerializer(qs, many=True, context=self.context).data

    def get_schedule(self, obj: Event):
        """Return schedule items sorted by day then start_time."""
        from apps.schedules.serializers import ScheduleItemSerializer
        qs = obj.schedule_items.select_related("speaker").order_by("day", "sort_order", "start_time")
        return ScheduleItemSerializer(qs, many=True, context=self.context).data

    def get_sponsors(self, obj: Event):
        qs = obj.event_sponsors.order_by("tier", "sort_order", "name")
        return SponsorSerializer(qs, many=True, context=self.context).data


class EventCreateSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    status = serializers.CharField(required=False)

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
            "theme_color",
            "accent_color",
            "refund_policy",
            "custom_refund_policy",
            "stickers",
            "scheduled_publish_at",
            "status",
        ]
        read_only_fields = ["id"]

    slug = serializers.SlugField(read_only=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    stickers = serializers.JSONField(required=False)
    status = serializers.ChoiceField(choices=["draft", "pending"], default="pending", required=False)

    def validate_stickers(self, value):
        if isinstance(value, str):
            import json
            try:
                return json.loads(value)
            except (ValueError, TypeError):
                return []
        return value

    def validate(self, attrs):
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
        status = validated_data.pop("status", "pending")
        
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

        if not getattr(request, "auto_approve_events", False):
            pass
        else:
            event.status = "published"
            event.save(update_fields=["status"])
        return event


    def update(self, instance, validated_data):
        from .models import Tag
        tags_data = validated_data.pop("tags", None)
        status = validated_data.pop("status", None)
        
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

