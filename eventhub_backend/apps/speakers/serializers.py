from rest_framework import serializers
from .models import Speaker


class SpeakerSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Speaker
        fields = [
            "id",
            "name",
            "title",
            "organization",
            "bio",
            "avatar_url",
            "twitter",
            "linkedin",
            "is_mc",
            "sort_order",
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class SpeakerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Speaker
        fields = [
            "name",
            "title",
            "organization",
            "bio",
            "avatar",
            "twitter",
            "linkedin",
            "is_mc",
            "sort_order",
        ]
