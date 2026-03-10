from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from common.validators import validate_upload_image
from .models import OrganizerProfile, OrganizerTeamMember

User = get_user_model()


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in password):
        raise serializers.ValidationError("Password must contain at least one number.")


class OrganizerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerProfile
        fields = [
            "organization_name",
            "organization_bio",
            "website",
            "logo",
            "brand_color",
            "is_approved",
            "is_verified",
            "twitter",
            "linkedin",
            "instagram",
            "total_events",
            "total_attendees",
            "stripe_account_id",
        ]
        read_only_fields = ("is_approved", "is_verified", "total_events", "total_attendees", "stripe_account_id")


class UserProfileSerializer(serializers.ModelSerializer):
    organizer_profile = OrganizerProfileSerializer(read_only=True)
    organization_name = serializers.CharField(
        source="organizer_profile.organization_name", required=False, allow_blank=True
    )
    organization_bio = serializers.CharField(
        source="organizer_profile.organization_bio", required=False, allow_blank=True
    )
    website = serializers.CharField(
        source="organizer_profile.website", required=False, allow_blank=True
    )
    logo = serializers.ImageField(
        source="organizer_profile.logo", required=False, allow_null=True
    )
    assigned_events = serializers.SerializerMethodField()
    assigned_event_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "avatar",
            "role",
            "is_email_verified",
            "must_reset_password",
            "organizer_profile",
            "organization_name",
            "organization_bio",
            "website",
            "logo",
            "assigned_events",
            "assigned_event_details",
            "created_at",
        ]
        read_only_fields = (
            "role",
            "is_email_verified",
            "must_reset_password",
            "organizer_profile",
            "assigned_events",
            "created_at",
        )

    def validate_avatar(self, value):
        if value:
            validate_upload_image(value)
        return value

    def validate_email(self, value):
        value = value.lower().strip()
        if self.instance and self.instance.email.lower() == value:
            return value
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def get_assigned_events(self, obj):
        memberships = OrganizerTeamMember.objects.filter(member=obj).prefetch_related("assigned_events")
        event_ids = set()
        for membership in memberships:
            for event in membership.assigned_events.all():
                event_ids.add(str(event.id))
        return list(event_ids)

    def get_assigned_event_details(self, obj):
        memberships = OrganizerTeamMember.objects.filter(member=obj).prefetch_related("assigned_events")
        details = []
        seen = set()
        for membership in memberships:
            for event in membership.assigned_events.all():
                if event.id in seen:
                    continue
                seen.add(event.id)
                details.append({
                    "id": str(event.id),
                    "slug": event.slug,
                    "title": event.title,
                    "date": event.date.isoformat() if event.date else None,
                    "time": event.time if event.time else None,
                })
        return details

    def update(self, instance, validated_data):
        organizer_data = validated_data.pop("organizer_profile", {})
        instance = super().update(instance, validated_data)

        if organizer_data:
            profile, _ = OrganizerProfile.objects.get_or_create(user=instance, defaults={
                "organization_name": organizer_data.get("organization_name", ""),
            })
            for field, value in organizer_data.items():
                setattr(profile, field, value)
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "password",
            "confirm_password",
        ]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm = attrs.pop("confirm_password", None)
        if password != confirm:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        _validate_password_strength(password)
        return attrs

    def create(self, validated_data):
        role = validated_data.get("role", "attendee")
        if role in ["admin", "staff"]:
            role = "attendee"
            
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone_number=validated_data.get("phone_number", ""),
            role=role,
        )
        return user

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)
        return {
            "user": UserProfileSerializer(instance).data,
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
        }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").lower()
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        
        if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False) and not user.is_email_verified:
            raise serializers.ValidationError("Email is not verified.")
        
        attrs["user"] = user
        return attrs

    def to_representation(self, instance):
        user = self.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return {
            "user": UserProfileSerializer(user).data,
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        _validate_password_strength(attrs["new_password"])
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs["token"]
        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid token."})

        if not user.password_reset_token_expires or user.password_reset_token_expires < timezone.now():
            raise serializers.ValidationError({"token": "Token has expired."})

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        _validate_password_strength(attrs["new_password"])
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.password_reset_token = None
        user.password_reset_token_expires = None
        user.must_reset_password = False
        user.save(update_fields=["password", "password_reset_token", "password_reset_token_expires", "must_reset_password"])
        return user


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class OrganizerTeamMemberSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="member.email", read_only=True)
    assigned_events = serializers.SerializerMethodField()

    class Meta:
        model = OrganizerTeamMember
        fields = ["id", "name", "email", "role", "assigned_events"]

    def get_name(self, obj):
        return obj.member.get_full_name() or obj.member.email

    def get_assigned_events(self, obj):
        return [str(event.id) for event in obj.assigned_events.all()]


class UserSessionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    device = serializers.CharField()
    location = serializers.CharField(allow_blank=True)
    current = serializers.BooleanField()


class SecuritySettingsSerializer(serializers.Serializer):
    two_factor_enabled = serializers.BooleanField()
