from rest_framework import serializers
from .models import Sponsor


class SponsorSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Sponsor
        fields = ["id", "name", "logo_url", "website", "sort_order"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None


class SponsorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sponsor
        fields = ["name", "logo", "website", "sort_order"]
