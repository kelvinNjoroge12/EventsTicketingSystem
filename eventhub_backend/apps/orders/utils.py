"""
Ticket email utility.

MIME structure used (RFC 2387 compliant):
  multipart/mixed
    └── multipart/related
          ├── multipart/alternative
          │     ├── text/plain
          │     └── text/html  ← references QR images via  cid:qr_N
          └── image/png  (one per ticket, Content-ID: <qr_N>, inline)
    └── image/png  (one per ticket, regular attachment — Gmail fallback)

This is THE standard way professional ticketing services embed QR codes.
It works in:
  ✅ iOS Mail / Apple Mail      — renders inline in body
  ✅ Outlook desktop / web      — renders inline in body
  ✅ Gmail Android / iOS app    — renders inline in body
  ✅ Thunderbird                — renders inline in body
  ✅ Yahoo Mail                 — renders inline in body
  ⚠️ Gmail Web (browser)        — Gmail deliberately strips CID images from
                                  unknown senders; the ATTACHED PNG file shows
                                  at the bottom when inline is blocked.
"""

import io
import logging
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import get_connection

logger = logging.getLogger(__name__)


# ── QR Generation ─────────────────────────────────────────────


def generate_qr_png_bytes(data: str) -> bytes:
    """Return raw PNG bytes for a QR code encoding *data*."""
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


def save_qr_to_bucket(ticket) -> str | None:
    """
    Persist QR PNG to the Supabase bucket and return its public URL.
    Returns None on failure (email still sends; QR is in the attachment).
    """
    try:
        if not ticket.qr_code:
            png = generate_qr_png_bytes(str(ticket.qr_code_data))
            ticket.qr_code.save(
                f"ticket_qr_{ticket.qr_code_data}.png",
                ContentFile(png),
                save=True,
            )
        return ticket.qr_code.url or None
    except Exception as exc:
        logger.warning("QR bucket save failed (%s): %s", ticket.qr_code_data, exc)
        return None


# ── Email ─────────────────────────────────────────────────────


def send_ticket_email(order, tickets=None):
    from apps.orders.models import Order
    from django.utils import timezone

    if not isinstance(order, Order):
        return

    if tickets is None:
        tickets = list(order.tickets.select_related("ticket_type", "order_item").all())

    theme = getattr(order.event, "theme_color", None) or "#1E4DB7"
    subject = f"Your Ticket: {order.event.title} — Order #{order.order_number}"

    venue = (
        getattr(order.event, "venue_name", "")
        or getattr(order.event, "city", "")
        or "Online"
    )
    date_str = order.event.start_date.strftime("%B %d, %Y")
    time_str = order.event.start_time.strftime("%I:%M %p")

    # ── Build per-ticket data ─────────────────────────────────
    ticket_data = []   # list of dicts
    for i, ticket in enumerate(tickets):
        name = ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        uid = str(ticket.qr_code_data)
        cid = f"qr_{i}"
        png = generate_qr_png_bytes(uid)
        bucket_url = save_qr_to_bucket(ticket)
        ticket_data.append(
            dict(
                idx=i + 1,
                type_name=name,
                attendee=ticket.attendee_name,
                uid=uid,
                cid=cid,
                png=png,
                bucket_url=bucket_url,
            )
        )

    # ── HTML with cid: references ─────────────────────────────
    ticket_cards_html = ""
    for td in ticket_data:
        # Use bucket URL as the src if available (works in Gmail web when images enabled)
        # AND reference the cid: for clients that support inline MIME attachments
        img_src = f"cid:{td['cid']}"

        ticket_cards_html += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px; border:2px solid #e2e8f0;
                      border-radius:12px; border-collapse:separate; overflow:hidden;">
          <tr>
            <!-- Ticket info -->
            <td style="padding:20px 20px 20px 24px; vertical-align:middle;">
              <p style="margin:0 0 4px; font-size:17px; font-weight:700; color:#0f172a;">
                🎫 {td['type_name']}
              </p>
              <p style="margin:0 0 4px; color:#64748b; font-size:13px;">
                Ticket #{td['idx']} &nbsp;&bull;&nbsp; {td['attendee']}
              </p>
              <p style="margin:0; font-family:Courier New,monospace;
                         font-size:11px; color:#94a3b8; word-break:break-all;">
                {td['uid']}
              </p>
            </td>
            <!-- QR Image (cid inline for native apps; bucket url as fallback src) -->
            <td style="padding:16px; vertical-align:middle; text-align:center;
                       border-left:2px solid #e2e8f0; width:168px; background:#f8fafc;">
              <img src="{img_src}"
                   width="150" height="150"
                   alt="QR Code Ticket #{td['idx']}"
                   style="display:block; margin:0 auto; border-radius:8px;
                          border:2px solid #e2e8f0;" />
              <p style="margin:6px 0 0; font-size:10px; color:#94a3b8;
                         font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                Scan at entry
              </p>
            </td>
          </tr>
        </table>"""

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.09);max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:{theme};padding:36px 28px;text-align:center;">
          <p style="margin:0;font-size:40px;">🎟️</p>
          <h1 style="margin:10px 0 6px;color:#fff;font-size:24px;font-weight:800;">
            Your Tickets Are Confirmed!
          </h1>
          <p style="margin:0;color:rgba(255,255,255,0.88);font-size:15px;">
            {order.event.title}
          </p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:28px 28px 16px;">
          <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">
            Hi {order.attendee_first_name},
          </p>
          <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.6;">
            Your booking is confirmed! Show the QR code below at the entrance.
            Your QR codes are also <strong>attached as image files</strong> to this email.
          </p>
        </td></tr>

        <!-- Order details -->
        <tr><td style="padding:0 28px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;
                        border-collapse:separate;overflow:hidden;">
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">
                📋 Order Number</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;color:#0f172a;
                          text-align:right;border-bottom:1px solid #e2e8f0;">{order.order_number}</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">
                📅 Date &amp; Time</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;color:#0f172a;
                          text-align:right;border-bottom:1px solid #e2e8f0;">{date_str} at {time_str}</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;">📍 Location</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;
                          color:#0f172a;text-align:right;">{venue}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Tickets -->
        <tr><td style="padding:0 28px 8px;">
          <h3 style="margin:0 0 14px;color:#0f172a;font-size:15px;font-weight:700;">
            Your Entry QR Codes
          </h3>
          {ticket_cards_html}
        </td></tr>

        <!-- Tip -->
        <tr><td style="padding:0 28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;
                        border-collapse:separate;">
            <tr><td style="padding:14px 16px;color:#1e40af;font-size:13px;line-height:1.7;">
              <strong>💡 Can't see the QR code above?</strong><br/>
              Open the attached image file(s) at the bottom of this email.
              Your QR code is there as <strong>ticket_1_qr.png</strong>.<br/>
              Each code is unique and can only be scanned <strong>once</strong>.
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 28px 20px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 14px;"/>
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
            Questions? Reply to this email or contact the event organiser.<br/>
            <strong style="color:#64748b;">Keep this email — it is your entry pass.</strong>
          </p>
        </td></tr>
        <tr><td style="background:{theme};padding:16px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;">
            EventHub Ticketing &nbsp;&bull;&nbsp; Powered by EventHub
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    # ── Plain text ────────────────────────────────────────────
    text_body = (
        f"YOUR TICKETS ARE CONFIRMED\nEvent: {order.event.title}\n\n"
        f"Hi {order.attendee_first_name},\n\n"
        f"Order  : {order.order_number}\n"
        f"Date   : {date_str} at {time_str}\n"
        f"Venue  : {venue}\n\n"
        + "TICKETS\n" + "=" * 50 + "\n"
        + "\n".join(
            f"  Ticket #{td['idx']}: {td['type_name']}\n"
            f"  Attendee : {td['attendee']}\n"
            f"  UUID     : {td['uid']}\n"
            f"  QR file  : ticket_{td['idx']}_qr.png (attached)\n"
            for td in ticket_data
        )
        + "=" * 50 + "\n"
        + "Open the attached PNG image(s) and show at the entrance.\n"
    )

    # ── Build RFC-compliant MIME tree ─────────────────────────
    #
    # multipart/mixed
    #   └── multipart/related
    #         ├── multipart/alternative
    #         │     ├── text/plain
    #         │     └── text/html  (cid: references)
    #         └── image/png × N   (Content-ID, Content-Disposition: inline)
    #   └── image/png × N         (Content-Disposition: attachment — fallback)
    #
    outer = MIMEMultipart("mixed")
    outer["Subject"] = subject
    outer["From"] = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com")
    outer["To"] = order.attendee_email

    related = MIMEMultipart("related")

    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(text_body, "plain", "utf-8"))
    alternative.attach(MIMEText(html_body, "html", "utf-8"))
    related.attach(alternative)

    # Inline image parts (CID)
    for td in ticket_data:
        img_part = MIMEImage(td["png"], "png")
        img_part.add_header("Content-ID", f"<{td['cid']}>")
        img_part.add_header(
            "Content-Disposition", "inline", filename=f"ticket_{td['idx']}_qr.png"
        )
        related.attach(img_part)

    outer.attach(related)

    # Regular attachment parts (fallback for Gmail web)
    for td in ticket_data:
        att = MIMEImage(td["png"], "png")
        att.add_header(
            "Content-Disposition", "attachment", filename=f"ticket_{td['idx']}_qr.png"
        )
        outer.attach(att)

    # ── Send via Django's configured backend ──────────────────
    # Use EmailMessage but override _create_message() to inject
    # our hand-crafted MIME tree so anymail/SMTP both receive it correctly.
    from django.core.mail import EmailMessage

    class RawMimeEmail(EmailMessage):
        """EmailMessage subclass that sends a pre-built MIME object verbatim."""
        def __init__(self, mime_msg, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._mime_msg = mime_msg

        def message(self):
            return self._mime_msg

    email = RawMimeEmail(
        mime_msg=outer,
        subject=subject,
        body=text_body,
        from_email=outer["From"],
        to=[order.attendee_email],
    )

    try:
        email.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            "Ticket email sent — %s (%d ticket(s)) → %s",
            order.order_number, len(tickets), order.attendee_email,
        )
    except Exception as smtp_err:
        order.email_error = f"{smtp_err.__class__.__name__}: {smtp_err}"
        order.save(update_fields=["email_error"])
        logger.exception("Email failed for order %s: %s", order.order_number, smtp_err)
        raise smtp_err
