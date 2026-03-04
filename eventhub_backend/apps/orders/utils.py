import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

def send_ticket_email(order):
    """
    Sends an email to the attendee with their ticket information.
    """
    try:
        from apps.orders.models import Order
        if not isinstance(order, Order):
            return

        subject = f"Your Tickets for {order.event.title} - #{order.order_number}"
        
        # We will build a simple HTML email body since we might not have a formal template yet.
        # It's better to just inline the HTML directly if no template exists.
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: {order.event.theme_color or '#1E4DB7'}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">{order.event.title}</h1>
                </div>
                <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                    <h2>Hi {order.attendee_first_name},</h2>
                    <p>Thank you for your order! Your tickets are confirmed.</p>
                    
                    <h3>Order Summary</h3>
                    <p><strong>Order Number:</strong> {order.order_number}</p>
                    <p><strong>Date/Time:</strong> {order.event.start_date.strftime('%B %d, %Y')} at {order.event.start_time.strftime('%I:%M %p')}</p>
                    <p><strong>Location:</strong> {order.event.venue_name or order.event.city or 'Online'}</p>
                    
                    <h3>Your Tickets</h3>
                    <ul style="list-style-type: none; padding: 0;">
        """
        
        for item in order.items.all():
            html_content += f"""
                        <li style="background-color: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px; border-left: 4px solid {order.event.theme_color or '#1E4DB7'};">
                            <strong>{item.quantity}x {item.ticket_type_name}</strong>
                        </li>
            """
            
        html_content += f"""
                    </ul>
                    <p style="margin-top: 30px;">Present this email at the venue for entry. If you have any questions, please contact the organizer.</p>
                </div>
            </body>
        </html>
        """
        
        text_content = strip_tags(html_content)
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@eventhub.com'),
            to=[order.attendee_email]
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Completely decouple SMTP from Gunicorn workers to prevent deadlocks and proxy 500s
        import threading
        def _send_email_thread():
            try:
                msg.send(fail_silently=False)
                logger.info(f"Successfully sent ticket email for order {order.order_number} to {order.attendee_email}")
            except Exception as inner_e:
                logger.exception(f"Failed to send ticket email async for order {order.order_number}: {str(inner_e)}")
                
        threading.Thread(target=_send_email_thread, daemon=True).start()
        
    except Exception as e:
        logger.error(f"Failed to prep ticket email for order {order.order_number}: {str(e)}")
