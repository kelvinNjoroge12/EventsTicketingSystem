from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import PromoCode, TicketType


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
        ]
        read_only_fields = ["id", "event"]


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


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = "__all__"


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

