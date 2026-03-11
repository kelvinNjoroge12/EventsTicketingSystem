from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        # Email verification shouldn't invalidate on password change, 
        # but it should invalidate if the email changes.
        return (
            str(user.pk) + str(user.is_email_verified) + str(timestamp) + str(user.email)
        )

email_verification_token_generator = EmailVerificationTokenGenerator()

def generate_secure_token(user, generator):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = generator.make_token(user)
    return f"{uid}.{token}"

def verify_secure_token(combined_token, generator):
    try:
        if "." not in combined_token:
            return None
        uidb64, token = combined_token.split(".", 1)
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        if generator.check_token(user, token):
            return user
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        pass
    return None
