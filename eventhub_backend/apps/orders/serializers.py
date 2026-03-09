from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import serializers

from apps.events.models import Event
from apps.payments.simulation import issue_simulation_token
from apps.tickets.models import PromoCode, TicketType
from .models import Order, OrderItem, Ticket
# send_ticket_email imported in view to decouple from transaction.atomic()


class OrderItemInputSerializer(serializers.Serializer):
    ticket_type_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    attendee_name = serializers.CharField(max_length=300)
    attendee_email = serializers.EmailField()


class OrderCreateSerializer(serializers.Serializer):
    event_slug = serializers.SlugField()
    items = OrderItemInputSerializer(many=True)
    promo_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    payment_method = serializers.ChoiceField(choices=[("card", "Card"), ("stripe", "Stripe"), ("free", "Free"), ("mpesa", "M-Pesa")])
    attendee_first_name = serializers.CharField(max_length=150)
    attendee_last_name = serializers.CharField(max_length=150)
    attendee_email = serializers.EmailField()
    attendee_phone = serializers.CharField(max_length=20, allow_blank=True, required=False)

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
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        event: Event = validated_data["event"]
        items_data = validated_data["items"]
        tickets_by_id: dict[str, TicketType] = validated_data["tickets_by_id"]
        subtotal: Decimal = validated_data["subtotal"]
        discount_amount: Decimal = validated_data["discount_amount"]
        promo_obj: PromoCode | None = validated_data["promo_obj"]

        service_percent = getattr(settings, "STRIPE_SERVICE_FEE_PERCENT", 3.0)
        service_fee = (subtotal - discount_amount) * Decimal(service_percent) / Decimal("100")
        total = subtotal - discount_amount + service_fee

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
        if total == 0 or validated_data["payment_method"] == "free":
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
