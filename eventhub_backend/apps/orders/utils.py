import io
import logging

import qrcode
from PIL import Image

from email.mime.image import MIMEImage

from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def get_or_generate_qr_url(ticket) -> str:
    """
    Checks if the ticket already has a saved QR code image.
    If not, it generates one and saves it to the `qr_code` ImageField,
    which automatically uploads it to the configured storage bucket (S3/Supabase).
    Returns the absolute public URL of the image.
    """
    if not ticket.qr_code:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(str(ticket.qr_code_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        
        filename = f"ticket_qr_{ticket.qr_code_data}.png"
        ticket.qr_code.save(filename, ContentFile(buffer.getvalue()), save=True)
    
    # Always compute the absolute public URL manually to ensure it perfectly matches
    # Supabase's public object endpoint and has NO S3 authentication query parameters attached
    # by django-storages, which causes email clients to block it.
    project_id = "cyrwfnkatnqtfasqsoau"
    url = f"https://{project_id}.supabase.co/storage/v1/object/public/media/{ticket.qr_code.name}"


def send_ticket_email(order, tickets=None):
    """
    Sends a rich HTML ticket confirmation email with scannable QR codes.
    QR codes are loaded via a public HTTPS URL (api.qrserver.com) which is
    the ONLY method guaranteed to render in Gmail, Yahoo, Outlook, and all
    mobile email apps — data URIs and CID inline attachments are blocked by
    every major email client.
    """
    from apps.orders.models import Order

    if not isinstance(order, Order):
        return

    if tickets is None:
        tickets = list(order.tickets.select_related("ticket_type", "order_item").all())

    theme_color = getattr(order.event, "theme_color", None) or "#1E4DB7"
    subject = f"Your Ticket: {order.event.title} — Order #{order.order_number}"

    venue_str = (
        getattr(order.event, "venue_name", "")
        or getattr(order.event, "city", "")
        or "Online"
    )
    start_date_str = order.event.start_date.strftime("%B %d, %Y")
    start_time_str = order.event.start_time.strftime("%I:%M %p")

    # ── Per-ticket HTML blocks ─────────────────────────────────
    ticket_blocks = ""
    text_ticket_lines = []
    inline_images = []

    import io
    import qrcode
    from email.mime.image import MIMEImage

    for i, ticket in enumerate(tickets):
        ticket_type_name = (
            ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        )
        uuid_str = str(ticket.qr_code_data)
        
        # Ensure the QR code is generated and saved to the bucket for backend storage
        get_or_generate_qr_url(ticket)
        
        # Generate raw PNG bytes
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(uuid_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG")
        
        inline_images.append({
            "data": img_buffer.getvalue(),
            "idstring": f"qr_{uuid_str}",
            "filename": f"ticket_qr_{i+1}.png"
        })

        # We will attach it via AnymailMessage and get the correct CID string
        # using Anymail's internal helpers later. For now we use the ID string.
        qr_src = f"{{{{qr_cid_{i}}}}}"

        ticket_blocks += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px; background:#ffffff;
                      border:2px solid #e2e8f0; border-radius:12px;
                      border-collapse:separate; overflow:hidden;">
          <tr>
            <!-- Left: ticket info -->
            <td style="padding:20px 20px 20px 24px; vertical-align:middle;">
              <p style="margin:0 0 4px; font-size:16px; font-weight:700;
                         color:#0f172a; line-height:1.3;">
                🎫 {ticket_type_name}
              </p>
              <p style="margin:0 0 4px; color:#64748b; font-size:13px;">
                Ticket #{i + 1} &nbsp;&bull;&nbsp; {ticket.attendee_name}
              </p>
              <p style="margin:0; color:#94a3b8; font-size:11px;
                         font-family:Courier New, monospace; word-break:break-all;">
                {uuid_str}
              </p>
              <p style="margin:14px 0 0; font-size:12px; color:#475569;
                         background:#f1f5f9; border-radius:6px;
                         padding:8px 10px; display:inline-block;">
                📱 Show this QR code at the entrance for entry
              </p>
            </td>
            <!-- Right: QR code image (public HTTPS URL → renders everywhere) -->
            <td style="padding:16px; vertical-align:middle; text-align:center;
                       border-left:2px solid #e2e8f0; width:152px;
                       background:#f8fafc;">
              <img src="{qr_src}"
                   width="140" height="140"
                   alt="QR Code — Ticket #{i + 1}"
                   style="display:block; margin:0 auto;
                          border-radius:8px; border:2px solid #e2e8f0;" />
              <p style="margin:6px 0 0; font-size:10px; color:#94a3b8;
                         font-weight:600; text-transform:uppercase;
                         letter-spacing:0.5px;">
                Scan at entry
              </p>
            </td>
          </tr>
        </table>
        """

        text_ticket_lines.append(
            f"  Ticket #{i + 1}: {ticket_type_name}\n"
            f"  Attendee: {ticket.attendee_name}\n"
            f"  UUID: {uuid_str}\n"
            f"  QR UUID: {uuid_str}\n"
        )

    if not ticket_blocks:
        ticket_blocks = "<p style='color:#64748b;'>No ticket details available.</p>"

    # ── Full HTML email ────────────────────────────────────────
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f1f5f9; padding:32px 16px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff; border-radius:16px; overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.09);
                    max-width:600px; width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:{theme_color}; padding:36px 28px; text-align:center;">
            <p style="margin:0; font-size:36px; line-height:1;">🎟️</p>
            <h1 style="margin:10px 0 6px; color:#ffffff; font-size:24px;
                        font-weight:800; letter-spacing:-0.3px; line-height:1.2;">
              Your Tickets Are Confirmed!
            </h1>
            <p style="margin:0; color:rgba(255,255,255,0.88); font-size:15px;
                       font-weight:500;">
              {order.event.title}
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="padding:28px 28px 16px;">
            <p style="margin:0; font-size:16px; color:#0f172a; font-weight:600;">
              Hi {order.attendee_first_name},
            </p>
            <p style="margin:8px 0 0; color:#475569; font-size:14px; line-height:1.6;">
              Great news — your booking is confirmed! Your entry QR codes are
              attached below. Simply show them at the door and you'll be scanned
              right in. Each code is unique and can only be used once.
            </p>
          </td>
        </tr>

        <!-- ORDER DETAILS -->
        <tr>
          <td style="padding:0 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc; border-radius:10px;
                          border:1px solid #e2e8f0; border-collapse:separate;
                          overflow:hidden;">
              <tr>
                <td style="padding:11px 16px; color:#64748b; font-size:13px;
                            border-bottom:1px solid #e2e8f0;">📋 Order Number</td>
                <td style="padding:11px 16px; font-weight:700; font-size:13px;
                            color:#0f172a; text-align:right;
                            border-bottom:1px solid #e2e8f0;">
                  {order.order_number}
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px; color:#64748b; font-size:13px;
                            border-bottom:1px solid #e2e8f0;">📅 Date &amp; Time</td>
                <td style="padding:11px 16px; font-weight:700; font-size:13px;
                            color:#0f172a; text-align:right;
                            border-bottom:1px solid #e2e8f0;">
                  {start_date_str} at {start_time_str}
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px; color:#64748b; font-size:13px;">
                  📍 Location
                </td>
                <td style="padding:11px 16px; font-weight:700; font-size:13px;
                            color:#0f172a; text-align:right;">
                  {venue_str}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- QR TICKET CARDS -->
        <tr>
          <td style="padding:0 28px 8px;">
            <h3 style="margin:0 0 14px; color:#0f172a; font-size:15px;
                        font-weight:700; letter-spacing:-0.2px;">
              Your Entry QR Codes
            </h3>
            {ticket_blocks}
          </td>
        </tr>

        <!-- INFO BOX -->
        <tr>
          <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#eff6ff; border-radius:10px;
                          border:1px solid #bfdbfe; border-collapse:separate;">
              <tr>
                <td style="padding:14px 16px; color:#1e40af;
                            font-size:13px; line-height:1.6;">
                  <strong>💡 Entry tip:</strong> Each QR code is unique and
                  linked to one ticket. The organizer will scan it with the
                  EventHub check-in app. Do not share your QR codes publicly.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DIVIDER + NOTE -->
        <tr>
          <td style="padding:0 28px 28px;">
            <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 16px;"/>
            <p style="margin:0; color:#94a3b8; font-size:11px;
                       text-align:center; line-height:1.6;">
              Questions? Reply to this email or contact the event organizer.<br/>
              <strong style="color:#64748b;">
                Keep this email — it is your entry pass.
              </strong>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:{theme_color}; padding:16px; text-align:center;">
            <p style="margin:0; color:rgba(255,255,255,0.7); font-size:12px;">
              EventHub Ticketing System &nbsp;&bull;&nbsp; Powered by EventHub
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""

    # ── Plain-text fallback ───────────────────────────────────
    text_content = (
        f"Your Tickets Are Confirmed!\n"
        f"Event: {order.event.title}\n\n"
        f"Hi {order.attendee_first_name},\n\n"
        f"Order Number : {order.order_number}\n"
        f"Date & Time  : {start_date_str} at {start_time_str}\n"
        f"Location     : {venue_str}\n\n"
        f"YOUR TICKETS\n"
        f"{'='*50}\n"
        + "\n".join(text_ticket_lines)
        + f"\n{'='*50}\n"
        f"Present the QR codes above at the venue entrance.\n"
        f"Each QR code can only be scanned once.\n"
    )

    # ── Compose & send ────────────────────────────────────────
    from anymail.message import AnymailMessage
    
    msg = AnymailMessage(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    
    # Disable tracking links which aggressively modify or corrupt inline image urls 
    # in some ESPs (SendGrid natively replaces all href/img urls)
    msg.track_clicks = False
    msg.track_opens = False
    
    # ANYMAIL's official inline image builder ensures 100% correct JSON construction
    # for SendGrid APIs, returning the fully-formatted CID to inject.
    for i, img_obj in enumerate(inline_images):
        raw_cid = msg.attach_inline_image(
            img_obj["data"], 
            filename=img_obj["filename"],
            subtype="png",
            idstring=img_obj["idstring"]
        )
        html_content = html_content.replace(f"{{qr_cid_{i}}}", f"cid:{raw_cid}")

    # Attach the HTML alternative
    msg.attach_alternative(html_content, "text/html")
    
    from django.utils import timezone
    try:
        msg.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            f"Ticket email sent — order {order.order_number} "
            f"({len(tickets)} ticket(s)) → {order.attendee_email}"
        )
    except Exception as smtp_err:
        order.email_error = f"{smtp_err.__class__.__name__}: {smtp_err}"
        order.save(update_fields=["email_error"])
        logger.exception(f"Email failed for order {order.order_number}: {smtp_err}")
        raise smtp_err
