from rest_framework import serializers
from .models import ScheduleItem


class ScheduleItemSerializer(serializers.ModelSerializer):
    speaker_name = serializers.CharField(source="speaker.name", read_only=True, default=None)

    class Meta:
        model = ScheduleItem
        fields = [
            "id",
            "title",
            "description",
            "speaker",
            "speaker_name",
            "start_time",
            "end_time",
            "day",
            "session_type",
            "location",
            "sort_order",
        ]


class ScheduleItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleItem
        fields = [
            "title",
            "description",
            "speaker",
            "start_time",
            "end_time",
            "day",
            "session_type",
            "location",
            "sort_order",
        ]

    def validate_speaker(self, speaker):
        """Ensure speaker belongs to the same event."""
        if speaker and speaker.event_id != self.context.get("event_id"):
            raise serializers.ValidationError(
                "Speaker does not belong to this event."
            )
        return speaker
