import io
import logging
import qrcode
from PIL import Image

from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def generate_qr_code_image(data: str) -> bytes:
    """Generate a PNG QR code image from a string and return raw bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(str(data))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def send_ticket_email(order, tickets=None):
    """
    Sends an email to the attendee with their ticket information,
    including a QR code image inline for each ticket.
    If tickets is None, all tickets for the order are used.
    """
    from apps.orders.models import Order, Ticket

    if not isinstance(order, Order):
        return

    if tickets is None:
        tickets = list(order.tickets.select_related("ticket_type", "order_item").all())

    theme_color = getattr(order.event, "theme_color", None) or "#1E4DB7"
    subject = f"Your Tickets for {order.event.title} - #{order.order_number}"

    # Build per-ticket HTML blocks with embedded QR codes
    ticket_blocks_html = ""
    ticket_attachments = []

    for i, ticket in enumerate(tickets):
        cid = f"qr_ticket_{i}"
        ticket_type_name = (
            ticket.ticket_type.name if ticket.ticket_type else ticket.attendee_name
        )

        # Generate QR code image bytes
        qr_bytes = generate_qr_code_image(str(ticket.qr_code_data))
        ticket_attachments.append((cid, qr_bytes, "image/png"))

        ticket_blocks_html += f"""
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px;
                    margin-bottom:20px; padding:20px; display:flex; align-items:center;
                    gap:20px; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px;">
                <p style="margin:0; font-size:18px; font-weight:700; color:#0f172a;">
                    {ticket_type_name}
                </p>
                <p style="margin:6px 0 0; color:#64748b; font-size:14px;">
                    Ticket #{i + 1} &nbsp;|&nbsp; {ticket.attendee_name}
                </p>
                <p style="margin:4px 0 0; color:#94a3b8; font-size:12px;">
                    UUID: {ticket.qr_code_data}
                </p>
            </div>
            <div style="text-align:center;">
                <img src="cid:{cid}" width="130" height="130"
                     alt="QR Code" style="border-radius:8px; border:1px solid #e2e8f0;" />
                <p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">Scan at entry</p>
            </div>
        </div>
        """

    if not ticket_blocks_html:
        ticket_blocks_html = "<p>No ticket details available.</p>"

    venue_str = getattr(order.event, "venue_name", "") or getattr(order.event, "city", "") or "Online"
    start_date_str = order.event.start_date.strftime("%B %d, %Y")
    start_time_str = order.event.start_time.strftime("%I:%M %p")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#f8fafc;
                 margin:0; padding:0; color:#333;">
      <div style="max-width:620px; margin:32px auto; background:#ffffff;
                  border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background:{theme_color}; padding:32px 24px; text-align:center;">
          <h1 style="color:#fff; margin:0; font-size:26px; font-weight:800; letter-spacing:-0.5px;">
            🎟️ Your Tickets Are Confirmed!
          </h1>
          <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:15px;">
            {order.event.title}
          </p>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;">
          <p style="font-size:16px; color:#0f172a;">Hi <strong>{order.attendee_first_name}</strong>,</p>
          <p style="color:#475569;">
            Thank you for your order! Your tickets are confirmed and ready.
            Present any of the QR codes below at the entrance — they will be scanned for entry.
          </p>

          <!-- Event Details -->
          <div style="background:#f1f5f9; border-radius:10px; padding:16px; margin:20px 0;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="color:#64748b; font-size:13px; padding:4px 0;">📋 Order Number</td>
                <td style="font-weight:700; font-size:13px; text-align:right;">
                  {order.order_number}
                </td>
              </tr>
              <tr>
                <td style="color:#64748b; font-size:13px; padding:4px 0;">📅 Date &amp; Time</td>
                <td style="font-weight:700; font-size:13px; text-align:right;">
                  {start_date_str} at {start_time_str}
                </td>
              </tr>
              <tr>
                <td style="color:#64748b; font-size:13px; padding:4px 0;">📍 Location</td>
                <td style="font-weight:700; font-size:13px; text-align:right;">{venue_str}</td>
              </tr>
            </table>
          </div>

          <!-- Tickets -->
          <h3 style="color:#0f172a; font-size:16px; margin:24px 0 12px;">Your Tickets</h3>
          {ticket_blocks_html}

          <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0;" />

          <p style="color:#94a3b8; font-size:12px; text-align:center;">
            If you have any issues, contact the organizer or reply to this email.<br/>
            <strong>Keep this email safe — it is your entry pass.</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background:{theme_color}; padding:16px; text-align:center;">
          <p style="color:rgba(255,255,255,0.7); margin:0; font-size:12px;">
            EventHub Ticketing System &nbsp;|&nbsp; Powered by EventHub
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = strip_tags(html_content)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    msg.mixed_subtype = "related"
    msg.attach_alternative(html_content, "text/html")

    # Attach each QR code image as inline CID
    for cid, img_bytes, mime_type in ticket_attachments:
        msg.attach(filename=f"{cid}.png", content=img_bytes, mimetype=mime_type)
        msg.attachments[-1].add_header("Content-ID", f"<{cid}>")
        msg.attachments[-1].add_header("Content-Disposition", "inline", filename=f"{cid}.png")

    from django.utils import timezone
    try:
        msg.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            f"Sent ticket email with {len(tickets)} QR code(s) for order "
            f"{order.order_number} to {order.attendee_email}"
        )
    except Exception as smtp_err:
        order.email_error = f"{smtp_err.__class__.__name__}: {smtp_err}"
        order.save(update_fields=["email_error"])
        logger.exception(f"Email failed for order {order.order_number}: {smtp_err}")
        raise smtp_err
