import io
import logging

import qrcode

from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_qr_png_bytes(data: str) -> bytes:
    """Generate a crisp QR code PNG and return raw bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(str(data))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def get_public_qr_url(ticket) -> str | None:
    """
    Saves the QR PNG to the Ticket ImageField (Supabase/S3 bucket) and returns
    the fully-qualified PUBLIC object URL so it can be embedded in the email body.

    The bucket is confirmed public (HTTP 200 without auth). Django's
    AWS_S3_CUSTOM_DOMAIN setting already rewrites the URL to the
    /storage/v1/object/public/… form that works in browsers and email clients.
    """
    try:
        if not ticket.qr_code:
            png_bytes = generate_qr_png_bytes(str(ticket.qr_code_data))
            filename = f"ticket_qr_{ticket.qr_code_data}.png"
            ticket.qr_code.save(filename, ContentFile(png_bytes), save=True)
        url = ticket.qr_code.url
        # Ensure it's an absolute URL even if the custom domain strip didn't fire
        if url.startswith("/"):
            url = f"https://eventsticketingsystem.onrender.com{url}"
        return url
    except Exception as exc:
        logger.warning(f"QR bucket save failed for {ticket.qr_code_data}: {exc}")
        return None


def send_ticket_email(order, tickets=None):
    """
    Sends a ticket confirmation email with QR codes shown:
      1. INLINE in the HTML body via the public Supabase bucket URL
         (Gmail proxies public HTTPS images automatically → shows in body)
      2. ALSO attached as a PNG file
         (guaranteed fallback for Outlook, Apple Mail, Yahoo and any client
          that doesn't load remote images)
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

    # ── Per-ticket data ───────────────────────────────────────
    ticket_html_blocks = ""
    ticket_attachments = []        # (filename, png_bytes)
    text_ticket_lines = []

    for i, ticket in enumerate(tickets):
        ticket_type_name = (
            ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        )
        uuid_str = str(ticket.qr_code_data)
        attach_name = f"ticket_{i + 1}_qr.png"

        # Always generate fresh PNG bytes for attachment
        png_bytes = generate_qr_png_bytes(uuid_str)
        ticket_attachments.append((attach_name, png_bytes))

        # Try to get a public URL for the inline img tag
        qr_url = get_public_qr_url(ticket)

        if qr_url:
            qr_img_html = f"""
              <td style="padding:16px; vertical-align:middle; text-align:center;
                         border-left:2px solid #e2e8f0; width:168px;
                         background:#f8fafc;">
                <img src="{qr_url}" width="150" height="150"
                     alt="QR Code — Ticket #{i+1}"
                     style="display:block; margin:0 auto;
                            border-radius:8px; border:2px solid #e2e8f0;" />
                <p style="margin:6px 0 0; font-size:10px; color:#94a3b8;
                           font-weight:600; text-transform:uppercase;
                           letter-spacing:0.5px;">Scan at entry</p>
              </td>"""
        else:
            # Bucket URL unavailable — tell user QR is in the attachment
            qr_img_html = f"""
              <td style="padding:16px; vertical-align:middle; text-align:center;
                         border-left:2px solid #e2e8f0; width:168px;
                         background:#eff6ff;">
                <p style="margin:0; font-size:12px; color:#1e40af; font-weight:600;">
                  See attached<br/><strong>{attach_name}</strong>
                </p>
              </td>"""

        ticket_html_blocks += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px; border:2px solid #e2e8f0;
                      border-radius:12px; border-collapse:separate; overflow:hidden;">
          <tr>
            <td style="padding:20px 20px 20px 24px; vertical-align:middle;">
              <p style="margin:0 0 4px; font-size:17px; font-weight:700; color:#0f172a;">
                🎫 {ticket_type_name}
              </p>
              <p style="margin:0 0 4px; color:#64748b; font-size:13px;">
                Ticket #{i+1} &nbsp;&bull;&nbsp; {ticket.attendee_name}
              </p>
              <p style="margin:0; font-family:Courier New,monospace;
                         font-size:11px; color:#94a3b8; word-break:break-all;">
                {uuid_str}
              </p>
            </td>
            {qr_img_html}
          </tr>
        </table>"""

        text_ticket_lines.append(
            f"  Ticket #{i+1}: {ticket_type_name}\n"
            f"  Attendee : {ticket.attendee_name}\n"
            f"  UUID     : {uuid_str}\n"
            f"  QR file  : {attach_name} (attached)\n"
        )

    if not ticket_html_blocks:
        ticket_html_blocks = "<p style='color:#64748b;'>No ticket details available.</p>"

    # ── Full HTML ─────────────────────────────────────────────
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
         style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.09);
                    max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:{theme_color};padding:36px 28px;text-align:center;">
            <p style="margin:0;font-size:40px;">🎟️</p>
            <h1 style="margin:10px 0 6px;color:#fff;font-size:24px;
                        font-weight:800;letter-spacing:-0.3px;line-height:1.2;">
              Your Tickets Are Confirmed!
            </h1>
            <p style="margin:0;color:rgba(255,255,255,0.88);font-size:15px;">
              {order.event.title}
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="padding:28px 28px 16px;">
            <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">
              Hi {order.attendee_first_name},
            </p>
            <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.6;">
              Your booking is confirmed! Show the QR code(s) below at the entrance —
              they are also <strong>attached as image files</strong> in this email.
            </p>
          </td>
        </tr>

        <!-- ORDER DETAILS -->
        <tr>
          <td style="padding:0 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border-radius:10px;
                          border:1px solid #e2e8f0;border-collapse:separate;overflow:hidden;">
              <tr>
                <td style="padding:11px 16px;color:#64748b;font-size:13px;
                            border-bottom:1px solid #e2e8f0;">📋 Order Number</td>
                <td style="padding:11px 16px;font-weight:700;font-size:13px;
                            color:#0f172a;text-align:right;
                            border-bottom:1px solid #e2e8f0;">{order.order_number}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#64748b;font-size:13px;
                            border-bottom:1px solid #e2e8f0;">📅 Date &amp; Time</td>
                <td style="padding:11px 16px;font-weight:700;font-size:13px;
                            color:#0f172a;text-align:right;
                            border-bottom:1px solid #e2e8f0;">{start_date_str} at {start_time_str}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#64748b;font-size:13px;">📍 Location</td>
                <td style="padding:11px 16px;font-weight:700;font-size:13px;
                            color:#0f172a;text-align:right;">{venue_str}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TICKET + QR CARDS -->
        <tr>
          <td style="padding:0 28px 8px;">
            <h3 style="margin:0 0 14px;color:#0f172a;font-size:15px;font-weight:700;">
              Your Entry QR Codes
            </h3>
            {ticket_html_blocks}
          </td>
        </tr>

        <!-- TIP -->
        <tr>
          <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#eff6ff;border-radius:10px;
                          border:1px solid #bfdbfe;border-collapse:separate;">
              <tr>
                <td style="padding:14px 16px;color:#1e40af;font-size:13px;line-height:1.7;">
                  <strong>💡 Tip:</strong> If you can't see the QR image above,
                  tap the <strong>attachment</strong> at the bottom of this email — your
                  QR code is there as a PNG file. Each code is unique and works once only.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:0 28px 20px;">
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;"/>
            <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
              Questions? Reply to this email or contact the event organiser.<br/>
              <strong style="color:#64748b;">Keep this email — it is your entry pass.</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:{theme_color};padding:16px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;">
              EventHub Ticketing &nbsp;&bull;&nbsp; Powered by EventHub
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_content = (
        f"YOUR TICKETS ARE CONFIRMED\nEvent: {order.event.title}\n\n"
        f"Hi {order.attendee_first_name},\n\n"
        f"Order  : {order.order_number}\n"
        f"Date   : {start_date_str} at {start_time_str}\n"
        f"Venue  : {venue_str}\n\n"
        f"TICKETS\n{'=' * 50}\n"
        + "\n".join(text_ticket_lines)
        + f"\n{'=' * 50}\n"
        f"Your QR codes are attached as image files.\n"
    )

    # ── Compose ───────────────────────────────────────────────
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    msg.attach_alternative(html_content, "text/html")

    # Attach each QR as a real PNG file (works in 100% of email clients)
    for filename, png_bytes in ticket_attachments:
        msg.attach(filename, png_bytes, "image/png")

    # ── Send ─────────────────────────────────────────────────
    from django.utils import timezone
    try:
        msg.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            f"Ticket email sent — {order.order_number} "
            f"({len(tickets)} ticket(s)) → {order.attendee_email}"
        )
    except Exception as smtp_err:
        order.email_error = f"{smtp_err.__class__.__name__}: {smtp_err}"
        order.save(update_fields=["email_error"])
        logger.exception(f"Email failed for order {order.order_number}: {smtp_err}")
        raise smtp_err
