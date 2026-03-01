from django.contrib.auth import get_user_model

User = get_user_model()

class EmailService:
    def send_verification_email(self, user):
        pass

    def send_password_reset(self, user):
        pass

    def send_organizer_welcome(self, user):
        pass
