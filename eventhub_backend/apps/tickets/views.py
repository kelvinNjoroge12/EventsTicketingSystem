from __future__ import annotations

from decimal import Decimal

from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.accounts.permissions import IsOrganizer, IsOrganizerRole
from apps.events.models import Event
from .models import PromoCode, TicketType
from .serializers import (
    PromoCodeSerializer,
    PromoCodeValidateSerializer,
    TicketTypeCreateSerializer,
    TicketTypeSerializer,
)


class EventTicketTypesView(generics.ListAPIView):
    serializer_class = TicketTypeSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs["slug"]
        event = Event.objects.get(slug=slug, status="published")
        return event.ticket_types.filter(is_active=True)


class TicketTypeCreateView(generics.CreateAPIView):
    serializer_class = TicketTypeCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizerRole]

    def perform_create(self, serializer):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        serializer.save(event=event)


class TicketTypeUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketTypeCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]
    lookup_url_kwarg = "ticket_id"
    lookup_field = "id"

    def get_queryset(self):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        return event.ticket_types.all()


class PromoCodeManageView(generics.ListCreateAPIView):
    serializer_class = PromoCodeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]

    def get_queryset(self):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        return event.promo_codes.all()

    def perform_create(self, serializer):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        serializer.save(event=event)


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PromoCodeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizer]
    lookup_url_kwarg = "promo_id"
    lookup_field = "id"

    def get_queryset(self):
        event = Event.objects.get(slug=self.kwargs["slug"], organizer=self.request.user)
        return event.promo_codes.all()


class PromoCodeValidateView(generics.GenericAPIView):
    serializer_class = PromoCodeValidateSerializer
    permission_classes = [permissions.IsAuthenticated]

    @ratelimit(key="user", rate="10/m", block=True)
    def post(self, request, *args, **kwargs):
        event = Event.objects.get(slug=self.kwargs["slug"], status="published")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        promo: PromoCode = serializer.validated_data["promo"]
        discount_amount: Decimal = serializer.validated_data["discount_amount"]
        subtotal: Decimal = serializer.validated_data["subtotal"]
        final_price = subtotal - discount_amount
        return Response(
            {
                "discount_amount": discount_amount,
                "discount_type": promo.discount_type,
                "final_price": final_price,
            },
            status=status.HTTP_200_OK,
        )

