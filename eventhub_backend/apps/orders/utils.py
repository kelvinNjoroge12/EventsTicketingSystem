"""
Ticket email utility.

Delivery strategy:
──────────────────
1. The QR code PNG is generated in-memory, saved to the Supabase bucket,
   and the resulting PUBLIC URL is embedded as a normal <img src="https://...">
   in the HTML body.

2. The SAME QR PNG is ALSO attached as a file (image/png) so that email
   clients that block external images still give the user access to the code.

3. Both use Django's EmailMultiAlternatives which is fully compatible with
   django-anymail / SendGrid HTTP API backend.

Why "src=https://" works:
  • Gmail has proxied all external email images through Google servers since 2013.
  • When Gmail sees an <img src="https://…"> in a received email it fetches the
    image via its own proxy and caches it — the user sees it inline in the body
    WITHOUT having to click "Show images", PROVIDED the email scores well on
    spam filters and the sender has good reputation.
  • The Supabase bucket is confirmed publicly accessible (HTTP 200 OK verified).

What to do if images still don't show in Gmail web:
  Gmail → Settings → General → Images → select "Always display external images"
  (This is a one-time Gmail setting, not something we control server-side.)
"""

import io
import logging

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


# ── QR Helpers ────────────────────────────────────────────────


def _generate_qr_png(data: str) -> bytes:
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


def _get_or_create_qr_url(ticket) -> str | None:
    """Save QR to Supabase bucket (once) and return its public HTTPS URL."""
    try:
        if not ticket.qr_code:
            png = _generate_qr_png(str(ticket.qr_code_data))
            ticket.qr_code.save(
                f"ticket_qr_{ticket.qr_code_data}.png",
                ContentFile(png),
                save=True,
            )
        url = ticket.qr_code.url
        if url and not url.startswith("http"):
            url = f"https://eventsticketingsystem.onrender.com{url}"
        return url or None
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

    # ── Gather per-ticket data ────────────────────────────────
    ticket_rows = []
    for i, ticket in enumerate(tickets):
        type_name = (
            ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        )
        uuid_str = str(ticket.qr_code_data)
        png_bytes = _generate_qr_png(uuid_str)
        qr_url = _get_or_create_qr_url(ticket)
        ticket_rows.append(
            dict(
                idx=i + 1,
                type_name=type_name,
                attendee=ticket.attendee_name,
                uuid=uuid_str,
                png=png_bytes,
                qr_url=qr_url,
            )
        )

    # ── Build HTML ticket cards ───────────────────────────────
    cards_html = ""
    for td in ticket_rows:
        if td["qr_url"]:
            qr_cell = f"""
              <td style="padding:16px;vertical-align:middle;text-align:center;
                         border-left:2px solid #e2e8f0;width:164px;background:#f8fafc;">
                <img src="{td['qr_url']}" width="148" height="148"
                     alt="QR Code Ticket #{td['idx']}"
                     style="display:block;margin:0 auto;border-radius:8px;
                            border:2px solid #e2e8f0;" />
                <p style="margin:6px 0 0;font-size:10px;color:#94a3b8;
                           font-weight:600;text-transform:uppercase;letter-spacing:.5px;">
                  Scan at entry
                </p>
              </td>"""
        else:
            qr_cell = f"""
              <td style="padding:16px;vertical-align:middle;text-align:center;
                         border-left:2px solid #e2e8f0;width:164px;background:#eff6ff;">
                <p style="margin:0;font-size:12px;color:#1e40af;font-weight:600;">
                  See attached<br/><strong>ticket_{td['idx']}_qr.png</strong>
                </p>
              </td>"""

        cards_html += f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px;border:2px solid #e2e8f0;
                      border-radius:12px;border-collapse:separate;overflow:hidden;">
          <tr>
            <td style="padding:20px 20px 20px 24px;vertical-align:middle;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#0f172a;">
                🎫 {td['type_name']}
              </p>
              <p style="margin:0 0 4px;color:#64748b;font-size:13px;">
                Ticket #{td['idx']} &nbsp;&bull;&nbsp; {td['attendee']}
              </p>
              <p style="margin:0;font-family:Courier New,monospace;font-size:11px;
                         color:#94a3b8;word-break:break-all;">{td['uuid']}</p>
            </td>
            {qr_cell}
          </tr>
        </table>"""

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,.09);max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:{theme};padding:36px 28px;text-align:center;">
          <p style="margin:0;font-size:40px;">🎟️</p>
          <h1 style="margin:10px 0 6px;color:#fff;font-size:24px;font-weight:800;">
            Your Tickets Are Confirmed!
          </h1>
          <p style="margin:0;color:rgba(255,255,255,.88);font-size:15px;">
            {order.event.title}
          </p>
        </td></tr>
        <!-- Greeting -->
        <tr><td style="padding:28px 28px 16px;">
          <p style="margin:0;font-size:16px;color:#0f172a;font-weight:600;">
            Hi {order.attendee_first_name},
          </p>
          <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.6;">
            Your booking is confirmed. Show the QR code(s) below at the
            entrance — they are also <strong>attached as image files</strong>.
          </p>
        </td></tr>
        <!-- Order details -->
        <tr><td style="padding:0 28px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;
                        border-collapse:separate;overflow:hidden;">
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;
                          border-bottom:1px solid #e2e8f0;">📋 Order</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;
                          color:#0f172a;text-align:right;
                          border-bottom:1px solid #e2e8f0;">{order.order_number}</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;
                          border-bottom:1px solid #e2e8f0;">📅 Date &amp; Time</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;
                          color:#0f172a;text-align:right;
                          border-bottom:1px solid #e2e8f0;">{date_str} at {time_str}</td>
            </tr>
            <tr>
              <td style="padding:11px 16px;color:#64748b;font-size:13px;">📍 Location</td>
              <td style="padding:11px 16px;font-weight:700;font-size:13px;
                          color:#0f172a;text-align:right;">{venue}</td>
            </tr>
          </table>
        </td></tr>
        <!-- QR Ticket cards -->
        <tr><td style="padding:0 28px 8px;">
          <h3 style="margin:0 0 14px;color:#0f172a;font-size:15px;font-weight:700;">
            Your Entry QR Codes
          </h3>
          {cards_html}
        </td></tr>
        <!-- Tip -->
        <tr><td style="padding:0 28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#eff6ff;border-radius:10px;
                        border:1px solid #bfdbfe;border-collapse:separate;">
            <tr><td style="padding:14px 16px;color:#1e40af;
                            font-size:13px;line-height:1.7;">
              <strong>💡 Can't see a QR image above?</strong><br/>
              Open the <strong>attached PNG file(s)</strong> at the bottom of
              this email. Each code is unique and works <strong>once only</strong>.
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:0 28px 20px;">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 14px;"/>
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
            Keep this email — it is your entry pass.
          </p>
        </td></tr>
        <tr><td style="background:{theme};padding:16px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:12px;">
            EventHub Ticketing &nbsp;&bull;&nbsp; Powered by EventHub
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    text_content = (
        f"YOUR TICKETS ARE CONFIRMED\nEvent: {order.event.title}\n\n"
        f"Hi {order.attendee_first_name},\n\n"
        f"Order: {order.order_number} | {date_str} at {time_str} | {venue}\n\n"
        + "\n".join(
            f"Ticket #{td['idx']}: {td['type_name']} — {td['attendee']}\n"
            f"  UUID: {td['uuid']}\n  QR: ticket_{td['idx']}_qr.png (attached)\n"
            for td in ticket_rows
        )
        + "\nShow the attached QR image at the entrance.\n"
    )

    # ── Compose email (anymail-compatible) ────────────────────
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    msg.attach_alternative(html_content, "text/html")

    # Attach each QR PNG as a regular file (works in ALL clients)
    for td in ticket_rows:
        msg.attach(f"ticket_{td['idx']}_qr.png", td["png"], "image/png")

    # ── Send ─────────────────────────────────────────────────
    try:
        msg.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            "Ticket email sent — %s (%d ticket(s)) → %s",
            order.order_number,
            len(tickets),
            order.attendee_email,
        )
    except Exception as err:
        order.email_error = f"{err.__class__.__name__}: {err}"
        order.save(update_fields=["email_error"])
        logger.exception("Email failed for order %s: %s", order.order_number, err)
        raise
