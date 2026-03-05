import base64
import io
import logging

import qrcode

from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def generate_qr_code_b64(data: str) -> str:
    """
    Generate a QR code PNG image from a string and return it as a base64-encoded string.
    Using base64 data URIs avoids CID attachment issues that cause Gmail/Yahoo to hide images.
    """
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
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def send_ticket_email(order, tickets=None):
    """
    Sends an email to the attendee with their ticket information.
    Each ticket has its own real QR code embedded as a base64 data URI directly
    in the HTML — works in Gmail, Yahoo, Outlook, and all webmail clients.
    """
    from apps.orders.models import Order

    if not isinstance(order, Order):
        return

    if tickets is None:
        tickets = list(order.tickets.select_related("ticket_type", "order_item").all())

    theme_color = getattr(order.event, "theme_color", None) or "#1E4DB7"
    subject = f"Your Ticket Confirmation: {order.event.title} — Order #{order.order_number}"

    venue_str = (
        getattr(order.event, "venue_name", "")
        or getattr(order.event, "city", "")
        or "Online"
    )
    start_date_str = order.event.start_date.strftime("%B %d, %Y")
    start_time_str = order.event.start_time.strftime("%I:%M %p")

    # ── Build per-ticket HTML blocks ──────────────────────────
    ticket_blocks_html = ""
    for i, ticket in enumerate(tickets):
        ticket_type_name = (
            ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        )
        # Generate QR as base64 PNG data URI (works in ALL email clients)
        qr_b64 = generate_qr_code_b64(str(ticket.qr_code_data))
        qr_data_uri = f"data:image/png;base64,{qr_b64}"

        ticket_blocks_html += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px; border:2px solid #e2e8f0; border-radius:12px;
                      border-collapse:separate; border-spacing:0; overflow:hidden;">
          <tr>
            <td style="padding:20px 24px; vertical-align:top;">
              <p style="margin:0; font-size:17px; font-weight:700; color:#0f172a; line-height:1.3;">
                {ticket_type_name}
              </p>
              <p style="margin:6px 0 4px; color:#64748b; font-size:13px;">
                Ticket #{i + 1} &nbsp;&bull;&nbsp; {ticket.attendee_name}
              </p>
              <p style="margin:0; color:#94a3b8; font-size:11px; font-family:monospace;">
                UUID: {ticket.qr_code_data}
              </p>
              <p style="margin:12px 0 0; color:#64748b; font-size:12px; background:#f8fafc;
                        border-radius:6px; padding:8px 10px; display:inline-block;">
                📱 Show this QR code at the entrance for entry
              </p>
            </td>
            <td style="padding:16px; vertical-align:middle; text-align:center;
                       border-left:2px solid #e2e8f0; width:160px; background:#f8fafc;">
              <img src="{qr_data_uri}"
                   width="140" height="140"
                   alt="QR Code for ticket {i + 1}"
                   style="display:block; margin:0 auto; border-radius:8px; border:2px solid #e2e8f0;" />
              <p style="margin:6px 0 0; font-size:10px; color:#94a3b8; font-weight:600;
                        text-transform:uppercase; letter-spacing:0.5px;">
                Scan at entry
              </p>
            </td>
          </tr>
        </table>
        """

    if not ticket_blocks_html:
        ticket_blocks_html = "<p>No ticket details available.</p>"

    # ── Full Email HTML ───────────────────────────────────────
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;
             font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#ffffff; border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08); max-width:600px; width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:{theme_color}; padding:36px 28px; text-align:center;">
              <p style="margin:0; font-size:32px;">🎟️</p>
              <h1 style="margin:8px 0 4px; color:#ffffff; font-size:24px; font-weight:800;
                          letter-spacing:-0.3px; line-height:1.2;">
                Your Tickets Are Confirmed!
              </h1>
              <p style="margin:0; color:rgba(255,255,255,0.85); font-size:15px; font-weight:500;">
                {order.event.title}
              </p>
            </td>
          </tr>

          <!-- ── Greeting ── -->
          <tr>
            <td style="padding:28px 28px 16px;">
              <p style="margin:0; font-size:16px; color:#0f172a; font-weight:600;">
                Hi {order.attendee_first_name},
              </p>
              <p style="margin:8px 0 0; color:#475569; font-size:14px; line-height:1.6;">
                Great news! Your booking is confirmed. Your unique entry QR codes are below —
                just show them at the door and you will be scanned right in.
              </p>
            </td>
          </tr>

          <!-- ── Order Details ── -->
          <tr>
            <td style="padding:0 28px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;
                            border-collapse:separate; border-spacing:0; overflow:hidden;">
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 16px; color:#64748b; font-size:13px;">📋 Order Number</td>
                  <td style="padding:12px 16px; font-weight:700; font-size:13px;
                              color:#0f172a; text-align:right;">{order.order_number}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 16px; color:#64748b; font-size:13px;">📅 Date &amp; Time</td>
                  <td style="padding:12px 16px; font-weight:700; font-size:13px;
                              color:#0f172a; text-align:right;">{start_date_str} at {start_time_str}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; color:#64748b; font-size:13px;">📍 Location</td>
                  <td style="padding:12px 16px; font-weight:700; font-size:13px;
                              color:#0f172a; text-align:right;">{venue_str}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Tickets with QR Codes ── -->
          <tr>
            <td style="padding:0 28px 8px;">
              <h3 style="margin:0 0 14px; color:#0f172a; font-size:16px; font-weight:700;">
                Your Entry QR Codes
              </h3>
              {ticket_blocks_html}
            </td>
          </tr>

          <!-- ── Tip box ── -->
          <tr>
            <td style="padding:0 28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe;">
                <tr>
                  <td style="padding:14px 16px; color:#1e40af; font-size:13px; line-height:1.6;">
                    <strong>💡 Tip:</strong> Each QR code above is unique to your ticket.
                    The event organizer will scan it at the entrance using the EventHub app.
                    Please do not share your QR codes publicly.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="padding:0 28px 28px;">
            <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 16px;" />
            <p style="margin:0; color:#94a3b8; font-size:11px; text-align:center; line-height:1.6;">
              Questions? Reply to this email or contact the event organizer.<br/>
              <strong>Keep this email — it is your entry pass.</strong>
            </p>
          </td></tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:{theme_color}; padding:16px; text-align:center;">
              <p style="margin:0; color:rgba(255,255,255,0.7); font-size:12px;">
                EventHub Ticketing System &nbsp;&bull;&nbsp; Powered by EventHub
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""
Your Tickets Are Confirmed!
{order.event.title}

Hi {order.attendee_first_name},

Your booking is confirmed. Please open this email in a browser or email client to view your QR codes.

Order Number: {order.order_number}
Date: {start_date_str} at {start_time_str}
Location: {venue_str}

Tickets:
""" + "\n".join(
        [
            f"  - Ticket #{i+1}: {t.ticket_type.name if t.ticket_type else 'General Admission'} (UUID: {t.qr_code_data})"
            for i, t in enumerate(tickets)
        ]
    ) + "\n\nPresent the QR code in this email at the venue for entry.\n"

    # ── Send ──────────────────────────────────────────────────
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    msg.attach_alternative(html_content, "text/html")

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
