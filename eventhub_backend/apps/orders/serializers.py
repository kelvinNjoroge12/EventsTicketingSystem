from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import serializers

from apps.events.models import Event
from apps.payments.simulation import issue_simulation_token
from apps.tickets.models import PromoCode, TicketType, RegistrationCategory, RegistrationQuestion, School, Course
from .models import Order, OrderItem, Ticket, OrderRegistration, OrderAnswer
# send_ticket_email imported in view to decouple from transaction.atomic()


class OrderItemInputSerializer(serializers.Serializer):
    ticket_type_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    attendee_name = serializers.CharField(max_length=300)
    attendee_email = serializers.EmailField()


class RegistrationAnswerInputSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    value = serializers.CharField(allow_blank=True, required=False)


class OrderRegistrationInputSerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=False, allow_null=True)
    category_type = serializers.CharField(required=False, allow_blank=True)
    category_label = serializers.CharField(required=False, allow_blank=True)
    graduation_year = serializers.IntegerField(required=False, allow_null=True)
    course_id = serializers.UUIDField(required=False, allow_null=True)
    school_id = serializers.UUIDField(required=False, allow_null=True)
    admission_number = serializers.CharField(required=False, allow_blank=True)
    student_email = serializers.EmailField(required=False, allow_blank=True)
    location_text = serializers.CharField(required=False, allow_blank=True)
    location_city = serializers.CharField(required=False, allow_blank=True)
    location_country = serializers.CharField(required=False, allow_blank=True)
    location_lat = serializers.DecimalField(required=False, allow_null=True, max_digits=9, decimal_places=6)
    location_lng = serializers.DecimalField(required=False, allow_null=True, max_digits=9, decimal_places=6)
    answers = RegistrationAnswerInputSerializer(many=True, required=False)


class OrderCreateSerializer(serializers.Serializer):
    event_slug = serializers.SlugField()
    items = OrderItemInputSerializer(many=True)
    promo_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    payment_method = serializers.ChoiceField(choices=[("card", "Card"), ("stripe", "Stripe"), ("free", "Free"), ("mpesa", "M-Pesa")])
    attendee_first_name = serializers.CharField(max_length=150)
    attendee_last_name = serializers.CharField(max_length=150)
    attendee_email = serializers.EmailField()
    attendee_phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    registration = OrderRegistrationInputSerializer(required=False)

    def validate(self, attrs):
        event = get_object_or_404(Event, slug=attrs["event_slug"], status="published")
        attrs["event"] = event
        items = attrs["items"]
        if not items:
            raise serializers.ValidationError({"items": "At least one ticket item is required."})

        ticket_ids = [str(i["ticket_type_id"]) for i in items]
        tickets_by_id: dict[str, TicketType] = {
            str(t.id): t
            for t in TicketType.objects.filter(event=event, id__in=ticket_ids, is_active=True)
        }
        if len(tickets_by_id) != len(ticket_ids):
            raise serializers.ValidationError({"items": "One or more ticket types are invalid for this event."})

        subtotal = Decimal("0")
        for item in items:
            t = tickets_by_id[str(item["ticket_type_id"])]
            qty = item["quantity"]
            if qty < t.min_per_order or qty > t.max_per_order:
                raise serializers.ValidationError(
                    {
                        "items": f"Quantity for {t.name} must be between {t.min_per_order} and {t.max_per_order}."
                    }
                )
            if t.quantity_available < qty:
                raise serializers.ValidationError(
                    {"items": f"Only {t.quantity_available} tickets available for {t.name}."}
                )
            if not t.is_on_sale:
                raise serializers.ValidationError({"items": f"Ticket type {t.name} is not currently on sale."})
            subtotal += t.price * qty

        attrs["tickets_by_id"] = tickets_by_id
        attrs["subtotal"] = subtotal

        promo_code = attrs.get("promo_code") or ""
        promo_obj: PromoCode | None = None
        discount_amount = Decimal("0")
        if promo_code:
            try:
                promo_obj = PromoCode.objects.get(
                    event=event, code__iexact=promo_code.strip(), is_active=True
                )
            except PromoCode.DoesNotExist:
                raise serializers.ValidationError({"promo_code": "Invalid promo code."})
            ok, msg = promo_obj.is_valid()
            if not ok:
                raise serializers.ValidationError({"promo_code": msg})
            if subtotal < promo_obj.minimum_order_amount:
                raise serializers.ValidationError(
                    {"promo_code": "Order amount is below the minimum required for this promo code."}
                )
            discount_amount = promo_obj.calculate_discount(subtotal)

        attrs["promo_obj"] = promo_obj
        attrs["discount_amount"] = discount_amount

        # Registration validation
        registration_data = attrs.get("registration") or {}
        registration_category = None
        category_from_items = None
        categories = set()
        for item in items:
            ticket = tickets_by_id[str(item["ticket_type_id"])]
            if ticket.registration_category_id:
                categories.add(str(ticket.registration_category_id))
                category_from_items = ticket.registration_category

        if categories:
            if len(categories) > 1:
                raise serializers.ValidationError({"items": "Please select tickets from a single category per order."})
            registration_category = category_from_items

        if registration_category:
            # If payload provided category_id, ensure it matches
            payload_category_id = registration_data.get("category_id")
            if payload_category_id and str(payload_category_id) != str(registration_category.id):
                raise serializers.ValidationError({"registration": "Selected category does not match tickets."})

            # Validate required fixed fields
            if registration_category.require_student_email:
                student_email = (registration_data.get("student_email") or "").strip().lower()
                if not student_email:
                    raise serializers.ValidationError({"registration": "Student email is required."})
                if not student_email.endswith("@strathmore.edu"):
                    raise serializers.ValidationError({"registration": "Student email must be a @strathmore.edu address."})

            if registration_category.require_admission_number:
                admission_number = (registration_data.get("admission_number") or "").strip()
                if not admission_number:
                    raise serializers.ValidationError({"registration": "Admission number is required."})

            if registration_category.ask_graduation_year and not registration_data.get("graduation_year"):
                raise serializers.ValidationError({"registration": "Graduation year is required."})
            if registration_category.ask_course:
                course_id = registration_data.get("course_id")
                if not course_id:
                    raise serializers.ValidationError({"registration": "Course is required."})
                if not Course.objects.filter(id=course_id).exists():
                    raise serializers.ValidationError({"registration": "Selected course is invalid."})
            if registration_category.ask_school:
                school_id = registration_data.get("school_id")
                if not school_id:
                    raise serializers.ValidationError({"registration": "School is required."})
                if not School.objects.filter(id=school_id).exists():
                    raise serializers.ValidationError({"registration": "Selected school is invalid."})
            if registration_category.ask_location and not registration_data.get("location_text"):
                raise serializers.ValidationError({"registration": "Location is required."})

            # Validate custom questions
            answers = registration_data.get("answers") or []
            answers_map = {str(a.get("question_id")): a.get("value") for a in answers}
            questions = RegistrationQuestion.objects.filter(category=registration_category)
            for q in questions:
                if q.is_required and not answers_map.get(str(q.id)):
                    raise serializers.ValidationError({"registration": f"{q.label} is required."})

        attrs["registration_category"] = registration_category
        attrs["registration_data"] = registration_data

        # Verify free payment method genuinely applies to free orders
        if attrs.get("payment_method") == "free" and (subtotal - discount_amount) > 0:
            raise serializers.ValidationError(
                {"payment_method": "The 'Free' payment method can only be used for free orders."}
            )
            
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        event: Event = validated_data["event"]
        items_data = validated_data["items"]
        tickets_by_id: dict[str, TicketType] = validated_data["tickets_by_id"]
        subtotal: Decimal = validated_data["subtotal"]
        discount_amount: Decimal = validated_data["discount_amount"]
        promo_obj: PromoCode | None = validated_data["promo_obj"]
        registration_category: RegistrationCategory | None = validated_data.get("registration_category")
        registration_data = validated_data.get("registration_data") or {}

        net_amount = subtotal - discount_amount
        is_free_order = net_amount == Decimal("0") or validated_data.get("payment_method") == "free"

        # No service fee on free orders
        service_percent = getattr(settings, "STRIPE_SERVICE_FEE_PERCENT", 3.0)
        service_fee = Decimal("0") if is_free_order else (net_amount * Decimal(service_percent) / Decimal("100"))
        total = net_amount + service_fee

        ip_addr = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if ip_addr:
            ip_addr = ip_addr.split(",")[0].strip()
        else:
            ip_addr = request.META.get("REMOTE_ADDR", "").split(",")[0].strip()
        try:
            attendee = request.user if request.user.is_authenticated else None
        except Exception:
            attendee = None
        
        order = Order.objects.create(
            attendee=attendee,
            event=event,
            status="pending",
            subtotal=subtotal,
            service_fee=service_fee,
            discount_amount=discount_amount,
            total=total,
            currency="KES",
            promo_code=promo_obj,
            promo_code_discount=discount_amount,
            attendee_first_name=validated_data["attendee_first_name"],
            attendee_last_name=validated_data["attendee_last_name"],
            attendee_email=validated_data["attendee_email"],
            attendee_phone=validated_data.get("attendee_phone", ""),
            payment_method=validated_data["payment_method"],
            ip_address=ip_addr if ip_addr else None,
        )

        for item in items_data:
            t = tickets_by_id[str(item["ticket_type_id"])]
            qty = item["quantity"]
            OrderItem.objects.create(
                order=order,
                ticket_type=t,
                ticket_type_name=t.name,
                ticket_class=t.ticket_class,
                unit_price=t.price,
                quantity=qty,
                subtotal=t.price * qty,
            )
            # Atomically reserve tickets only if enough are available.
            # This single UPDATE prevents overselling even under high concurrency:
            # it only succeeds when (quantity - quantity_sold - quantity_reserved) >= qty
            rows_updated = TicketType.objects.filter(
                id=t.id,
                quantity__gte=F("quantity_sold") + F("quantity_reserved") + qty,
            ).update(
                quantity_reserved=F("quantity_reserved") + qty
            )
            if rows_updated == 0:
                # Atomic check failed — not enough tickets
                # Roll back: delete the order (CASCADE deletes items)
                order.delete()
                t.refresh_from_db()
                raise serializers.ValidationError(
                    {"items": f"Sorry, only {t.quantity_available} tickets left for {t.name}."}
                )

        # Auto-confirm free orders and generate tickets
        if is_free_order:
            order.status = "confirmed"
            order.save(update_fields=["status"])
            # For each item, move reserved -> sold and create individual Ticket rows
            for item in order.items.select_related("ticket_type"):
                tt = item.ticket_type
                if not tt:
                    continue
                TicketType.objects.filter(id=tt.id).update(
                    quantity_reserved=F("quantity_reserved") - item.quantity,
                    quantity_sold=F("quantity_sold") + item.quantity,
                )
                # Create one Ticket row per unit purchased
                for _ in range(item.quantity):
                    Ticket.objects.create(
                        order=order,
                        order_item=item,
                        event=order.event,
                        ticket_type=tt,
                        attendee_name=f"{order.attendee_first_name} {order.attendee_last_name}",
                        attendee_email=order.attendee_email,
                    )

        # Store registration data if present
        if registration_category:
            category_label = registration_category.label if registration_category.category == "guest" and registration_category.label else registration_category.get_category_display()
            reg = OrderRegistration.objects.create(
                order=order,
                registration_category=registration_category,
                category=registration_category.category,
                category_label=category_label,
                graduation_year=registration_data.get("graduation_year") or None,
                course=Course.objects.filter(id=registration_data.get("course_id")).first() if registration_data.get("course_id") else None,
                school=School.objects.filter(id=registration_data.get("school_id")).first() if registration_data.get("school_id") else None,
                admission_number=registration_data.get("admission_number", "") or "",
                student_email=registration_data.get("student_email", "") or "",
                location_text=registration_data.get("location_text", "") or "",
                location_city=registration_data.get("location_city", "") or "",
                location_country=registration_data.get("location_country", "") or "",
                location_lat=registration_data.get("location_lat"),
                location_lng=registration_data.get("location_lng"),
            )

            answers = registration_data.get("answers") or []
            for answer in answers:
                q = RegistrationQuestion.objects.filter(id=answer.get("question_id"), category=registration_category).first()
                if not q:
                    continue
                OrderAnswer.objects.create(
                    registration=reg,
                    question=q,
                    value=answer.get("value", "") or "",
                )

        return order


class OrderDetailSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    simulation_token = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "status",
            "subtotal",
            "service_fee",
            "discount_amount",
            "total",
            "currency",
            "attendee_first_name",
            "attendee_last_name",
            "attendee_email",
            "attendee_phone",
            "payment_method",
            "created_at",
            "items",
            "simulation_token",
        ]

    def get_items(self, obj: Order):
        return [
            {
                "ticket_type_name": i.ticket_type_name,
                "ticket_class": i.ticket_class,
                "unit_price": i.unit_price,
                "quantity": i.quantity,
                "subtotal": i.subtotal,
            }
            for i in obj.items.all()
        ]

    def get_simulation_token(self, obj: Order):
        if obj.status != "pending":
            return None
        return issue_simulation_token(obj.order_number)


class OrderPublicDetailSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    simulation_token = serializers.SerializerMethodField()
    attendee_email_masked = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "status",
            "subtotal",
            "service_fee",
            "discount_amount",
            "total",
            "currency",
            "created_at",
            "items",
            "simulation_token",
            "attendee_email_masked",
        ]

    def get_items(self, obj: Order):
        return [
            {
                "ticket_type_name": i.ticket_type_name,
                "ticket_class": i.ticket_class,
                "unit_price": i.unit_price,
                "quantity": i.quantity,
                "subtotal": i.subtotal,
            }
            for i in obj.items.all()
        ]

    def get_simulation_token(self, obj: Order):
        if obj.status != "pending":
            return None
        return issue_simulation_token(obj.order_number)

    def get_attendee_email_masked(self, obj: Order):
        email = (obj.attendee_email or "").strip()
        if "@" not in email:
            return None
        name_part, domain_part = email.split("@", 1)
        prefix = name_part[:2]
        return f"{prefix}***@{domain_part}"
