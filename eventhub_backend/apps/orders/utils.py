"""
Ticket Email — Production Grade
================================
Layout (single ticket, no clutter):

  ┌─────────────────────────────────────────┐
  │  [BRAND COLOR BAR]                      │
  │  🎟 Your Ticket Is Confirmed            │
  │  Event Name                             │
  ├─────────────────────────────────────────┤
  │  Hi Kelvin,                             │
  │  Present the QR code below for entry.  │
  │                                         │
  │  Aug 22 · 5:00 PM · iHub Nairobi       │
  │  Order: EH260305BCFC83                  │
  ├─────────────────────────────────────────┤
  │  [  QR CODE  — full width, centred  ]  │
  │  Kelvin Njoroge — Terraces              │
  │  Ticket Code: EH26A8F                  │
  │  [ View Ticket → ]                     │
  ├─────────────────────────────────────────┤
  │  Powered by EventHub                   │
  └─────────────────────────────────────────┘

Design rules followed:
  • Zero long UUIDs visible to users.
  • Zero instruction paragraphs.
  • QR is the hero — 200×200 px, centred.
  • Every ticket gets its own clear section.
  • No localhost URLs — enforced via settings.FRONTEND_URL.
  • Table-based layout, all CSS inline, no JS, no SVG.
"""

import io
import logging
import threading

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.db import transaction

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────

def _short_ticket_code(uuid_val) -> str:
    """
    Converts a UUID like 37a8960c-1f01-4d1d-87af-ef6c4bebd5ab
    into a short, human-friendly code like  EH37A89
    (prefix "EH" + first 5 UUID hex digits uppercased)
    """
    hex_clean = str(uuid_val).replace("-", "")[:5].upper()
    return f"EH{hex_clean}"


def _generate_qr_png(data: str) -> bytes:
    """
    Generates a high-contrast, scan-optimised QR code PNG.
    Error correction level H (30%) ensures scanning works
    even if part of the code is obscured.
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
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _get_or_create_qr_url(ticket, frontend_url: str) -> str | None:
    """
    Uploads the QR PNG to Supabase object storage and returns its
    fully-qualified public HTTPS URL for direct embedding in HTML email.
    The QR encodes the full ticket verification URL: /t/{uuid}
    """
    from common.qr_security import generate_secure_qr_payload
    
    secure_payload = generate_secure_qr_payload(str(ticket.qr_code_data))
    ticket_url = f"{frontend_url}/t/{secure_payload}"

    try:
        if not ticket.qr_code:
            png = _generate_qr_png(ticket_url)
            ticket.qr_code.save(
                f"ticket_qr_{ticket.qr_code_data}.png",
                ContentFile(png),
                save=True,
            )

        url = ticket.qr_code.url
        # Ensure the URL is always absolute HTTPS — never localhost
        if url and not url.startswith("http"):
            url = f"https://eventsticketingsystem.onrender.com{url}"

        return url or None
    except Exception as exc:
        logger.warning(
            "QR bucket save failed for Ticket UUID (%s): %s",
            ticket.qr_code_data,
            exc,
        )
        return None


# ── Email Builder ──────────────────────────────────────────────


def send_ticket_email(order, tickets=None):
    from apps.orders.models import Order
    from django.utils import timezone

    if not isinstance(order, Order):
        return

    if tickets is None:
        tickets = list(order.tickets.select_related("ticket_type", "order_item").all())

    # Brand / Event data
    theme       = getattr(order.event, "theme_color", None) or "#1E4DB7"
    event_title = order.event.title
    venue       = (
        getattr(order.event, "venue_name", "")
        or getattr(order.event, "city", "")
        or "Online"
    )
    date_str = order.event.start_date.strftime("%b") + " " + str(order.event.start_date.day)  # e.g. "Aug 22"
    # Cross-platform 12h time without leading zero (%-I fails on Windows)
    raw_time = order.event.start_time.strftime("%I:%M %p")  # "05:00 PM"
    time_str = raw_time.lstrip("0")  # "5:00 PM"

    subject = f"🎟 Your Ticket: {event_title}"

    # Ensure we never use localhost — FRONTEND_URL must be set in production env
    _PRODUCTION_FRONTEND = "https://events-ticketing-system.vercel.app"
    frontend_url = getattr(settings, "FRONTEND_URL", _PRODUCTION_FRONTEND).rstrip("/")
    # Safety net: if someone left the default localhost value in env, override it
    if "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        frontend_url = _PRODUCTION_FRONTEND

    # ── Per-ticket sections ──────────────────────────────────
    ticket_sections_html = ""
    plain_ticket_lines = []

    for i, ticket in enumerate(tickets):
        type_name   = ticket.ticket_type.name if ticket.ticket_type else "General Admission"
        short_code  = _short_ticket_code(ticket.qr_code_data)
        qr_url      = _get_or_create_qr_url(ticket, frontend_url)
        from common.qr_security import generate_secure_qr_payload
        secure_payload = generate_secure_qr_payload(str(ticket.qr_code_data))
        verify_link = f"{frontend_url}/t/{secure_payload}"
        attendee    = ticket.attendee_name

        # ── QR Image block (200px, centred, clickable) ──────
        if qr_url:
            qr_block = f"""
            <tr>
              <td align="center" style="padding:28px 32px 12px;">
                <a href="{verify_link}" target="_blank" style="display:inline-block;text-decoration:none;">
                  <img
                    src="{qr_url}"
                    width="200"
                    height="200"
                    alt="Entry QR Code"
                    style="display:block;border:3px solid #e2e8f0;border-radius:12px;
                           padding:8px;background:#fff;"
                  />
                </a>
              </td>
            </tr>"""
        else:
            # Fallback when QR image upload failed — show a prominent link button
            qr_block = f"""
            <tr>
              <td align="center" style="padding:28px 32px 12px;">
                <a href="{verify_link}" target="_blank"
                   style="display:inline-block;padding:14px 28px;background:{theme};
                          color:#fff;font-size:15px;font-weight:700;border-radius:8px;
                          text-decoration:none;">
                  View Digital Ticket
                </a>
              </td>
            </tr>"""

        # ── Ticket meta row (name + type + code) ─────────────
        ticket_meta = f"""
            <tr>
              <td align="center" style="padding:0 32px 8px;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">
                  {attendee}
                </p>
                <p style="margin:4px 0;font-size:14px;color:#64748b;">
                  {type_name}
                </p>
                <p style="margin:4px 0;font-size:13px;font-family:Courier New,monospace;
                          color:#94a3b8;letter-spacing:1px;">
                  {short_code}
                </p>
              </td>
            </tr>"""

        # ── "View Ticket" CTA button ─────────────────────────
        cta_button = f"""
            <tr>
              <td align="center" style="padding:16px 32px 28px;">
                <a href="{verify_link}" target="_blank"
                   style="display:inline-block;padding:13px 36px;
                          background:{theme};color:#ffffff;font-size:15px;
                          font-weight:700;border-radius:8px;text-decoration:none;
                          letter-spacing:0.3px;">
                  View Ticket &rarr;
                </a>
              </td>
            </tr>"""

        # ── Divider between multiple tickets (skip for last) ─
        divider = ""
        if i < len(tickets) - 1:
            divider = """
            <tr>
              <td style="padding:0 32px;">
                <hr style="border:none;border-top:1px dashed #e2e8f0;"/>
              </td>
            </tr>"""

        ticket_sections_html += qr_block + ticket_meta + cta_button + divider

        plain_ticket_lines.append(
            f"  Ticket: {type_name} — {attendee}\n"
            f"  Code:   {short_code}\n"
            f"  Link:   {verify_link}\n"
        )

    # ── Full HTML email ──────────────────────────────────────
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">

      <!-- Outer card -->
      <table width="560" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;width:100%;background:#ffffff;
                    border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,.10);">

        <!-- ── HEADER ── -->
        <tr>
          <td align="center"
              style="background:{theme};padding:32px 28px 28px;">
            <p style="margin:0 0 10px;font-size:36px;line-height:1;">🎟</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;
                       font-weight:800;letter-spacing:-0.3px;">
              Your Ticket Is Confirmed
            </h1>
            <p style="margin:0;color:rgba(255,255,255,.85);font-size:15px;
                      font-weight:500;">
              {event_title}
            </p>
          </td>
        </tr>

        <!-- ── GREETING ── -->
        <tr>
          <td style="padding:26px 32px 10px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;
                      color:#0f172a;">
              Hi {order.attendee_first_name},
            </p>
            <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5;">
              Present the QR code below for entry.
            </p>
          </td>
        </tr>

        <!-- ── EVENT INFO STRIP ── -->
        <tr>
          <td style="padding:14px 32px 20px;">
            <table cellpadding="0" cellspacing="0" border="0"
                   style="background:#f8fafc;border:1px solid #e2e8f0;
                          border-radius:10px;width:100%;border-collapse:separate;">
              <tr>
                <td style="padding:12px 16px;font-size:14px;color:#0f172a;
                           font-weight:600;">
                  📅 &nbsp;{date_str} &nbsp;·&nbsp; {time_str}
                </td>
                <td style="padding:12px 16px;font-size:14px;color:#0f172a;
                           font-weight:600;text-align:right;">
                  📍 &nbsp;{venue}
                </td>
              </tr>
              <tr>
                <td colspan="2"
                    style="padding:0 16px 12px;font-size:12px;
                           color:#94a3b8;border-top:1px solid #f1f5f9;">
                  Order: <strong style="color:#475569;">{order.order_number}</strong>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── TICKET SECTIONS (QR + name + CTA) ── -->
        {ticket_sections_html}

        <!-- ── FOOTER ── -->
        <tr>
          <td style="padding:6px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center"
                    style="background:{theme};padding:14px;
                           border-radius:0 0 16px 16px;">
                  <p style="margin:0;color:rgba(255,255,255,.70);font-size:12px;">
                    Powered by EventHub
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""

    # ── Plain-text fallback ──────────────────────────────────
    text_content = (
        f"YOUR TICKET IS CONFIRMED\n"
        f"{'=' * 40}\n"
        f"{event_title}\n\n"
        f"Hi {order.attendee_first_name},\n"
        f"Present the QR code below for entry.\n\n"
        f"Date:  {date_str} at {time_str}\n"
        f"Venue: {venue}\n"
        f"Order: {order.order_number}\n\n"
        + "\n".join(plain_ticket_lines)
        + f"\nPowered by EventHub\n"
    )

    # ── Dispatch ─────────────────────────────────────────────
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventhub.com"),
        to=[order.attendee_email],
    )
    msg.attach_alternative(html_content, "text/html")

    try:
        msg.send(fail_silently=False)
        order.email_sent = True
        order.email_sent_at = timezone.now()
        order.email_error = ""
        order.save(update_fields=["email_sent", "email_sent_at", "email_error"])
        logger.info(
            "Ticket email dispatched — %s (%d ticket(s)) → %s",
            order.order_number,
            len(tickets),
            order.attendee_email,
        )
    except Exception as err:
        order.email_error = f"{err.__class__.__name__}: {err}"
        order.save(update_fields=["email_error"])
        logger.exception(
            "Email send failed for order %s: %s", order.order_number, err
        )
        raise

def _dispatch_ticket_email_async(order) -> None:
    """
    Dispatch ticket email via Celery task instead of raw threads (issue #5).
    Uses transaction.on_commit to avoid enqueueing before DB changes are visible.
    """
    from apps.notifications.tasks import send_ticket_email_task

    order_id = str(order.pk)

    def _enqueue():
        send_ticket_email_task.delay(order_id)

    try:
        transaction.on_commit(_enqueue)
    except RuntimeError:
        # No transaction active — fire immediately
        _enqueue()
