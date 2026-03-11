from django.conf import settings
from django.core.mail import send_mail
from common.tokens import generate_secure_token, email_verification_token_generator
from django.contrib.auth.tokens import default_token_generator

class EmailService:
    def __init__(self):
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'https://events-ticketing-system.vercel.app').rstrip('/')
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@eventhub.com')

    def send_verification_email(self, user):
        token = generate_secure_token(user, email_verification_token_generator)
        verification_url = f"{self.frontend_url}/verify-email?token={token}"
        
        subject = "Verify your EventHub email"
        message = f"Hi {user.first_name},\n\nPlease verify your email by clicking the link below:\n\n{verification_url}\n\nThanks!\nEventHub Team"
        
        send_mail(subject, message, self.from_email, [user.email], fail_silently=True)

    def send_password_reset(self, user):
        token = generate_secure_token(user, default_token_generator)
        reset_url = f"{self.frontend_url}/reset-password?token={token}"
        
        subject = "Reset your EventHub password"
        message = f"Hi {user.first_name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_url}\n\nIf you didn't request this, you can safely ignore this email.\n\nThanks!\nEventHub Team"
        
        send_mail(subject, message, self.from_email, [user.email], fail_silently=True)

    def send_organizer_welcome(self, user):
        subject = "Welcome to EventHub Organizer!"
        message = f"Hi {user.first_name},\n\nYour organizer account has been created. You can now start creating and managing events.\n\nEnjoy!\nEventHub Team"
        
        send_mail(subject, message, self.from_email, [user.email], fail_silently=True)
