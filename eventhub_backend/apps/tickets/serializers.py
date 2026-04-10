from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import (
    PromoCode,
    TicketType,
    RegistrationCategory,
    RegistrationQuestion,
    School,
    Course,
)


class TicketTypeCreateSerializer(serializers.ModelSerializer):
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
            "description",
            "sale_start",
            "sale_end",
            "min_per_order",
            "max_per_order",
            "is_active",
            "sort_order",
            "registration_category",
        ]
        read_only_fields = ["id", "event"]


class TicketTypeSerializer(serializers.ModelSerializer):
    quantity_available = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    is_almost_sold_out = serializers.BooleanField(read_only=True)
    is_on_sale = serializers.BooleanField(read_only=True)
    registration_category_type = serializers.SerializerMethodField()
    registration_category_label = serializers.SerializerMethodField()

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
            "registration_category",
            "registration_category_type",
            "registration_category_label",
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

    def get_registration_category_type(self, obj):
        return obj.registration_category.category if obj.registration_category else None

    def get_registration_category_label(self, obj):
        if not obj.registration_category:
            return None
        if obj.registration_category.category == "guest" and obj.registration_category.label:
            return obj.registration_category.label
        return obj.registration_category.get_category_display()


class RegistrationQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationQuestion
        fields = [
            "id",
            "label",
            "field_type",
            "is_required",
            "options",
            "sort_order",
        ]


class RegistrationQuestionWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = RegistrationQuestion
        fields = [
            "id",
            "label",
            "field_type",
            "is_required",
            "options",
            "sort_order",
        ]


class RegistrationCategorySerializer(serializers.ModelSerializer):
    questions = RegistrationQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = RegistrationCategory
        fields = [
            "id",
            "category",
            "label",
            "is_active",
            "sort_order",
            "require_student_email",
            "require_admission_number",
            "ask_graduation_year",
            "ask_course",
            "ask_school",
            "ask_location",
            "questions",
        ]


class RegistrationCategoryWriteSerializer(serializers.ModelSerializer):
    questions = RegistrationQuestionWriteSerializer(many=True, required=False)

    class Meta:
        model = RegistrationCategory
        fields = [
            "id",
            "category",
            "label",
            "is_active",
            "sort_order",
            "require_student_email",
            "require_admission_number",
            "ask_graduation_year",
            "ask_course",
            "ask_school",
            "ask_location",
            "questions",
        ]


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "code", "is_active", "sort_order"]


class CourseSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)

    class Meta:
        model = Course
        fields = ["id", "name", "code", "school", "school_name", "is_active", "sort_order"]


class PromoCodeSerializer(serializers.ModelSerializer):
    applicable_ticket_types = serializers.PrimaryKeyRelatedField(
        queryset=TicketType.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = PromoCode
        fields = [
            "id",
            "event",
            "code",
            "discount_type",
            "discount_value",
            "expiry",
            "usage_limit",
            "times_used",
            "applicable_ticket_types",
            "is_active",
            "minimum_order_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "event", "times_used", "created_at", "updated_at"]
        extra_kwargs = {
            "discount_type": {"required": False},
            "discount_value": {"required": False},
            "expiry": {"required": False, "allow_null": True},
            "usage_limit": {"required": False, "allow_null": True},
            "is_active": {"required": False},
            "minimum_order_amount": {"required": False, "allow_null": True},
        }
        validators = []

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            mutable = data.copy()
        else:
            mutable = dict(data)

        aliases = {
            "discountType": "discount_type",
            "discountValue": "discount_value",
            "usageLimit": "usage_limit",
            "applicableTicketTypes": "applicable_ticket_types",
            "isActive": "is_active",
            "minimumOrderAmount": "minimum_order_amount",
        }

        for source_key, target_key in aliases.items():
            if source_key in mutable and target_key not in mutable:
                mutable[target_key] = mutable[source_key]

        if "code" in mutable and mutable["code"] is not None:
            mutable["code"] = str(mutable["code"]).strip().upper().replace(" ", "")

        if "discount_type" in mutable and mutable["discount_type"] is not None:
            discount_type = str(mutable["discount_type"]).strip().lower()
            if discount_type in {"percentage", "pct", "%"}:
                mutable["discount_type"] = "percent"
            elif discount_type in {"amount", "flat", "value"}:
                mutable["discount_type"] = "fixed"

        for number_field in ("discount_value", "usage_limit", "minimum_order_amount"):
            if number_field in mutable and mutable[number_field] == "":
                mutable[number_field] = None

        if "expiry" in mutable and mutable["expiry"] == "":
            mutable["expiry"] = None

        return super().to_internal_value(mutable)

    def validate(self, attrs):
        event = self.context.get("event")
        required_fields = {
            "code": "Please add a promo code name.",
            "discount_type": "Please choose a discount type.",
            "discount_value": "Please add a discount value.",
            "usage_limit": "Please add a usage limit.",
            "expiry": "Please add an expiry date.",
        }

        for field, message in required_fields.items():
            value = attrs.get(field, serializers.empty)
            if self.instance:
                provided = field in attrs
                if provided and value in (None, "", [], ()):
                    raise serializers.ValidationError({field: message})
                continue

            if value in (serializers.empty, None, "", [], ()):
                raise serializers.ValidationError({field: message})

        if attrs.get("minimum_order_amount", serializers.empty) in (serializers.empty, None):
            attrs["minimum_order_amount"] = Decimal("0")

        code = attrs.get("code") or (self.instance.code if self.instance else None)
        if event and code:
            qs = PromoCode.objects.filter(event=event, code__iexact=code)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"code": "That promo code already exists for this event."})
        return super().validate(attrs)

    def validate_code(self, value):
        normalized = str(value or "").strip().upper().replace(" ", "")
        if not normalized:
            raise serializers.ValidationError("Promo code is required.")
        return normalized

    def validate_discount_value(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Discount value must be greater than zero.")
        return value

    def validate_usage_limit(self, value):
        if value is None:
            raise serializers.ValidationError("Please add a usage limit.")
        if value <= 0:
            raise serializers.ValidationError("Usage limit must be greater than zero.")
        return value

    def validate_minimum_order_amount(self, value):
        if value in ("", None):
            return Decimal("0")
        if value < 0:
            raise serializers.ValidationError("Minimum order amount cannot be negative.")
        return value

    def validate_expiry(self, value):
        if value in ("", None):
            raise serializers.ValidationError("Please add an expiry date.")
        return value

    def validate_applicable_ticket_types(self, value):
        event = self.context.get("event")
        if not event or not value:
            return value

        valid_ticket_ids = set(event.ticket_types.values_list("id", flat=True))
        invalid_ids = [ticket.id for ticket in value if ticket.id not in valid_ticket_ids]
        if invalid_ids:
            raise serializers.ValidationError("Selected ticket types do not belong to this event.")
        return value


class PromoCodeValidateSerializer(serializers.Serializer):
    event_id = serializers.UUIDField()
    code = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate(self, attrs):
        code = attrs["code"].strip()
        event_id = attrs["event_id"]
        subtotal: Decimal = attrs["subtotal"]

        try:
            promo = PromoCode.objects.get(event_id=event_id, code__iexact=code)
        except PromoCode.DoesNotExist:
            raise serializers.ValidationError({"code": "Invalid promo code."})

        ok, message = promo.is_valid()
        if not ok:
            raise serializers.ValidationError({"code": message})

        if subtotal < promo.minimum_order_amount:
            raise serializers.ValidationError(
                {"subtotal": "Order amount is below the minimum required for this promo code."}
            )

        discount_amount = promo.calculate_discount(subtotal)
        attrs["promo"] = promo
        attrs["discount_amount"] = discount_amount
        return attrs
