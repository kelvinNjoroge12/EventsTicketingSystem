import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from celery import shared_task
from apps.events.models import Event
from apps.orders.models import Order
from .utils import should_send_email_notification, build_opt_out_link, is_email_opted_out

logger = logging.getLogger(__name__)

@shared_task(name="send_event_reminders")
def send_event_reminders():
    """
    Finds events that are scheduled to start in roughly ~24 hours and have
    'send_reminders' enabled, but haven't sent reminders yet.
    For each, grab confirmed orders and dispatch an email to the attendees.
    """
    now = timezone.now()
    target_start = now + timedelta(hours=24)
    target_end = target_start + timedelta(hours=1) # 1 hr window

    events = Event.objects.filter(
        send_reminders=True,
        reminders_sent=False,
        status="published",
        start_date=target_start.date() # Simplified: checking just the target date
    )
    
    # Optional: We could get more accurate to find events starting within the next exactly 24 hours.
    # For now, fetching upcoming events for 'tomorrow' by start_date is standard,
    # Let's verify we only send it once when it's exactly 1 day away or the date matches tomorrow.
    
    frontend_url = getattr(settings, "FRONTEND_URL", "https://events-ticketing-system.vercel.app").rstrip("/")

    for event in events:
        # Check if the event's start datetime is roughly 24 hours from now
        # If we just do it globally once a day, we might miss some due to timezone mismatch,
        # but matching exactly `start_date` by UTC or event local date works. Let's just 
        # proceed with all events whose start_date is tomorrow, as this script can run daily.
        
        logger.info(f"Sending reminders for event: {event.title} [ID: {event.id}]")
        
        # Get all confirmed orders for this event
        orders = Order.objects.filter(
            event=event,
            status="confirmed"
        )
        
        email_count = 0
        for order in orders:
            if not order.attendee_email:
                continue
            if is_email_opted_out(order.attendee_email, "reminders"):
                continue
            if order.attendee and not should_send_email_notification(order.attendee, "event_reminders"):
                continue
                
            subject = f"Reminder: Upcoming Event - {event.title}"
            
            # Format time beautifully
            time_str = event.start_time.strftime("%I:%M %p").lstrip("0")
            date_str = event.start_date.strftime("%b %d, %Y")
            venue_str = event.venue_name or event.city or "Online"
            
            opt_out_link = build_opt_out_link(order.attendee_email, "reminders")
            text_content = (
                f"We can't wait to see you!\n\n"
                f"Hi {order.attendee_first_name},\n"
                f"This is a quick reminder that '{event.title}' is happening soon!\n\n"
                f"Date: {date_str} at {time_str}\n"
                f"Location: {venue_str}\n\n"
                f"Your digital ticket is available here: {frontend_url}/tickets\n\n"
                f"See you there!\nPowered by EventHub\n\n"
                f"Stop event reminders: {opt_out_link}"
            )
            
            html_content = f"""
            <html>
            <body style="font-family: sans-serif; background-color: #f1f5f9; padding: 20px;">
                <div style="max-width: 600px; background-color: white; padding: 30px; border-radius: 8px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="color: {event.theme_color or '#1E4DB7'}">We can't wait to see you!</h2>
                    <p style="font-size: 16px;">Hi {order.attendee_first_name},</p>
                    <p style="font-size: 16px;">This is a quick reminder that <strong>{event.title}</strong> is happening soon!</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <p style="margin: 5px 0;"><strong>Date:</strong> {date_str} at {time_str}</p>
                        <p style="margin: 5px 0;"><strong>Location:</strong> {venue_str}</p>
                    </div>
                    <p style="margin-top: 30px; text-align: center;">
                        <a href="{frontend_url}/tickets" style="background-color: {event.theme_color or '#1E4DB7'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Tickets</a>
                    </p>
                    <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <a href="{opt_out_link}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe from event reminders</a>
                    </p>
                    <p style="margin-top: 12px; font-size: 12px; color: #94a3b8; text-align: center;">Powered by EventHub</p>
                </div>
            </body>
            </html>
            """
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
                to=[order.attendee_email],
            )
            msg.attach_alternative(html_content, "text/html")
            
            try:
                msg.send(fail_silently=False)
                email_count += 1
            except Exception as err:
                logger.error(f"Failed to send reminder for Order {order.order_number}: {err}")
                
        # Mark event as reminders sent to prevent running again.
        event.reminders_sent = True
        event.save(update_fields=["reminders_sent"])
        logger.info(f"Dispatched {email_count} reminder emails for Event ID: {event.id}")
