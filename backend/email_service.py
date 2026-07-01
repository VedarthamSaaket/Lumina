# backend/email_service.py
"""
Transactional email for Lumina (Gmail SMTP).

Sends verification codes and password-reset codes. The HTML templates mirror
the Lumina chat page (light parchment) background and use one font everywhere:
EB Garamond. The heading is italic; all body text is normal. Dark cocoa ink on
warm cream keeps every line clearly visible. Rendered with email-safe inline
styles (no WebGL/canvas, no script). No em-dashes.
"""

import time
import smtplib
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from config import settings, logger


# ── Low-level senders ─────────────────────────────────────────────────────────
def _send_via_brevo(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send via the Brevo (Sendinblue) transactional HTTP API. Preferred over
    SMTP since it works on hosts that block outbound SMTP and carries a higher
    free-tier quota."""
    if not settings.BREVO_FROM_EMAIL:
        logger.error("[EMAIL] BREVO_API_KEY set but BREVO_FROM_EMAIL missing (must be a Brevo-verified sender)")
        return False

    payload = {
        "sender":      {"name": settings.BREVO_FROM_NAME, "email": settings.BREVO_FROM_EMAIL},
        "to":          [{"email": to}],
        "subject":     subject,
        "htmlContent": html,
    }
    if text:
        payload["textContent"] = text

    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key":      settings.BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept":       "application/json",
            },
            json=payload,
            timeout=15,
        )
        if 200 <= r.status_code < 300:
            logger.info(f"[EMAIL] sent to {to} via Brevo")
            return True
        logger.error(f"[EMAIL] Brevo {r.status_code}: {r.text[:200]}")
        return False
    except Exception as exc:
        logger.error(f"[EMAIL] Brevo transport error: {exc}")
        return False


def _send_via_smtp(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send a single email via Gmail SMTP. Returns True on success.

    Retries once on transient errors; SMTPAuthenticationError fails fast.
    Always includes a plain-text alternative to stay out of spam.
    """
    user = settings.GMAIL_USER
    pwd  = (settings.GMAIL_APP_PASSWORD or "").replace(" ", "")

    if not user or not pwd:
        logger.error("[EMAIL] GMAIL_USER / GMAIL_APP_PASSWORD not configured, cannot send")
        return False

    if text is None:
        text = "Open this email in an HTML-capable client to view your Lumina message."

    for attempt in range(2):
        try:
            msg            = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = formataddr((settings.EMAIL_FROM_NAME, user))
            msg["To"]      = to
            # Plain-text part first, HTML second (clients render the last part they support).
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, pwd)
                server.sendmail(user, to, msg.as_string())
            logger.info(f"[EMAIL] sent to {to} via SMTP")
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("[EMAIL] auth failed, check GMAIL_USER / GMAIL_APP_PASSWORD")
            return False
        except Exception as exc:
            if attempt == 0:
                logger.warning(f"[EMAIL] attempt 1 failed ({exc}), retrying in 2s")
                time.sleep(2)
            else:
                logger.error(f"[EMAIL] {exc}")
    return False


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send transactional email. Uses Brevo's HTTP API when BREVO_API_KEY is
    configured (works on hosts that block outbound SMTP, higher free quota);
    falls back to Gmail SMTP otherwise."""
    if settings.BREVO_API_KEY:
        return _send_via_brevo(to, subject, html, text)
    return _send_via_smtp(to, subject, html, text)


# ── Design tokens (mirrored from the Lumina frontend) ─────────────────────────
# Chat-page background: globals.css `.light .bg-chat` (the warm parchment look
# from the screenshot) layered over cream #ede3cb, plus the soft honeyed glow
# from `.light .bg-chat::before`. Email-safe (CSS background-image).
_CHAT_BG = (
    "background-color:#ede3cb;"
    "background-image:"
    "radial-gradient(ellipse 58% 30% at 50% 0%, rgba(160,118,28,0.08) 0%, transparent 55%),"
    "radial-gradient(ellipse 40% 50% at 5% 55%, rgba(130,88,18,0.06) 0%, transparent 55%),"
    "radial-gradient(ellipse 78% 52% at 15% 10%, rgba(218,192,142,0.58) 0%, transparent 52%),"
    "radial-gradient(ellipse 62% 52% at 84% 85%, rgba(198,170,118,0.45) 0%, transparent 55%),"
    "radial-gradient(ellipse 45% 65% at 50% 46%, rgba(210,184,130,0.35) 0%, transparent 65%);"
)

# ONE font everywhere: EB Garamond (the face that renders in the email).
# Heading is italic; body is normal. No other font family is used anywhere.
_FONT_BODY = "'EB Garamond',Georgia,'Times New Roman',serif"
_FONT_HEAD = _FONT_BODY

# Warm dark-cocoa ink so every line reads clearly on the light parchment.
_INK        = "#2a1a08"
_INK_SOFT   = "rgba(42,26,8,0.72)"
_INK_MUTED  = "rgba(42,26,8,0.55)"
_GOLD       = "#8b6410"   # light-mode gold (globals.css `.light --gold`)


# ── Shared layout ─────────────────────────────────────────────────────────────
def _shell(title: str, tagline: str, body_html: str) -> str:
    """Wrap content in the Lumina chat-page (light parchment) aesthetic.

    Background = the chat page's `.light .bg-chat` warm cream gradient, so it is
    clearly visible. One font everywhere: EB Garamond. The heading is italic; all
    body text is normal. Dark cocoa ink on cream keeps every line high-contrast.
    A premium card floats over the background. No em-dashes anywhere.
    """
    ttl = settings.EMAIL_CODE_TTL_MINUTES
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>{title}</title>
  <!-- One font everywhere: EB Garamond (italic for the heading, normal for body). -->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital@0;1&display=swap');
    body, table, td {{ margin:0; padding:0; }}
    a {{ text-decoration:none; }}
  </style>
</head>
<body style="margin:0;padding:0;{_CHAT_BG}">
  <!-- Chat-page (light parchment) background -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="{_CHAT_BG}min-height:100%;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- premium parchment card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:460px;width:100%;
                 background:rgba(255,250,238,0.86);
                 border:1px solid rgba(139,100,16,0.28);
                 border-radius:26px;
                 box-shadow:0 24px 60px rgba(90,60,15,0.22),
                            0 2px 0 rgba(255,255,255,0.7) inset,
                            0 0 0 1px rgba(255,255,255,0.4) inset;">
          <tr>
            <td style="padding:44px 44px 38px 44px;font-family:{_FONT_BODY};">

              <!-- Header -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="font-family:{_FONT_BODY};
                            font-size:12px;letter-spacing:0.42em;text-transform:uppercase;
                            font-weight:500;color:{_GOLD};margin-bottom:20px;">LUMINA</div>
                <!-- Heading: EB Garamond italic -->
                <h1 style="margin:0 0 10px 0;font-family:{_FONT_BODY};
                           font-weight:400;font-style:italic;font-size:34px;line-height:1.2;
                           letter-spacing:-0.005em;color:{_INK};">{title}</h1>
                <!-- Tagline: EB Garamond italic -->
                <p style="margin:0;font-family:{_FONT_BODY};font-style:italic;
                          font-size:18px;font-weight:400;color:{_INK_SOFT};">{tagline}</p>
                <!-- gold divider -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 0 auto;">
                  <tr>
                    <td style="width:52px;height:1px;background:linear-gradient(to right,rgba(139,100,16,0),{_GOLD});"></td>
                    <td style="padding:0 9px;color:{_GOLD};font-size:11px;opacity:0.8;">&#10022;</td>
                    <td style="width:52px;height:1px;background:linear-gradient(to left,rgba(139,100,16,0),{_GOLD});"></td>
                  </tr>
                </table>
              </div>

              {body_html}

              <!-- Footer -->
              <div style="margin-top:32px;padding-top:22px;border-top:1px solid rgba(139,100,16,0.18);
                          text-align:center;">
                <p style="margin:0 0 7px 0;font-family:{_FONT_BODY};font-size:15px;line-height:1.7;color:{_INK_MUTED};">
                  This code expires in {ttl} minutes. If you didn&rsquo;t request it, you can safely ignore this email. Your account stays untouched.
                </p>
                <p style="margin:0;font-family:{_FONT_BODY};font-style:italic;
                          font-size:14px;color:rgba(139,100,16,0.75);">
                  Your sanctuary, kept private.
                </p>
              </div>

            </td>
          </tr>
        </table>

        <p style="max-width:460px;margin:20px auto 0 auto;font-family:{_FONT_BODY};
                  font-size:13px;color:rgba(42,26,8,0.42);text-align:center;">
          Sent by Lumina &middot; a personal sanctuary. Please don&rsquo;t reply to this address.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>"""


def _code_block(code: str) -> str:
    """The code chip, in EB Garamond like the rest of the email."""
    spaced = " ".join(list(code))
    return f"""\
              <div style="margin:8px auto 4px auto;text-align:center;">
                <div style="display:inline-block;padding:18px 32px;border-radius:16px;
                            background:rgba(139,100,16,0.10);
                            border:1px solid rgba(139,100,16,0.38);
                            font-family:{_FONT_HEAD};
                            font-weight:600;font-size:40px;letter-spacing:0.30em;
                            color:{_INK};">
                  {spaced}
                </div>
              </div>"""


# ── Public template senders ───────────────────────────────────────────────────
def send_verification_email(to: str, code: str) -> bool:
    body = f"""\
              <p style="margin:0 0 20px 0;font-family:{_FONT_BODY};font-size:19px;line-height:1.7;color:{_INK};text-align:center;">
                Welcome. To finish creating your sanctuary, enter the code below
                on the verification screen.
              </p>
              {_code_block(code)}
              <p style="margin:20px 0 0 0;font-family:{_FONT_BODY};font-size:17px;line-height:1.7;color:{_INK_SOFT};text-align:center;">
                Until this is verified, no account is created. Your details
                are held only for the next few minutes.
              </p>"""
    html = _shell("Verify your email", "One step from your sanctuary", body)
    text = (
        f"Welcome to Lumina.\n\n"
        f"Your verification code is: {code}\n\n"
        f"Enter it on the verification screen to finish creating your account. "
        f"It expires in {settings.EMAIL_CODE_TTL_MINUTES} minutes. "
        f"If you didn't request this, you can ignore this email."
    )
    return send_email(to, "Your Lumina verification code", html, text)


def send_password_reset_email(to: str, code: str) -> bool:
    body = f"""\
              <p style="margin:0 0 20px 0;font-family:{_FONT_BODY};font-size:19px;line-height:1.7;color:{_INK};text-align:center;">
                We received a request to reset your password. Enter the code below
                on the reset screen, then choose a new password.
              </p>
              {_code_block(code)}
              <p style="margin:20px 0 0 0;font-family:{_FONT_BODY};font-size:17px;line-height:1.7;color:{_INK_SOFT};text-align:center;">
                If you didn&rsquo;t ask to reset your password, no action is needed.
                This code does nothing on its own.
              </p>"""
    html = _shell("Reset your password", "Let&rsquo;s get you back in", body)
    text = (
        f"Lumina password reset.\n\n"
        f"Your reset code is: {code}\n\n"
        f"Enter it on the reset screen to choose a new password. "
        f"It expires in {settings.EMAIL_CODE_TTL_MINUTES} minutes. "
        f"If you didn't request this, you can ignore this email."
    )
    return send_email(to, "Your Lumina password reset code", html, text)
