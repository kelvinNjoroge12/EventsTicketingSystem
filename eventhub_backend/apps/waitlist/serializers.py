from rest_framework import serializers
from .models import WaitlistEntry


class WaitlistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "notes",
            "position",
            "status",
            "notified_at",
            "converted_at",
            "created_at",
        ]
        read_only_fields = ["id", "position", "status", "notified_at", "converted_at", "created_at"]


class WaitlistJoinSerializer(serializers.Serializer):
    """Lightweight serializer used by the public join endpoint."""
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value):
        return value.lower().strip()

    def validate_notes(self, value):
        return value or ""
