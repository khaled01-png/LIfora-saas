import logging
import smtplib
import ssl
from email.message import EmailMessage

from backend.app.config import settings

log = logging.getLogger("lifora.email")


def email_configured() -> bool:
    return bool(settings.SMTP_HOST)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns False (and sends nothing) when SMTP is not configured."""
    if not email_configured():
        if not settings.IS_PRODUCTION:
            log.warning("SMTP not configured. Email to %s not sent. Subject: %s\n%s", to, subject, body)
        return False
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception:
        log.exception("Failed to send email")
        return False


def send_many(messages) -> int:
    """Send several plain-text e-mails over ONE SMTP connection. `messages` is a list of (to, subject, body).
    Returns how many were sent. One bad address never stops the others."""
    if not messages:
        return 0
    if not email_configured():
        if not settings.IS_PRODUCTION:
            log.warning("SMTP not configured. %d notification e-mail(s) not sent.", len(messages))
        return 0
    sent = 0
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            for to, subject, body in messages:
                msg = EmailMessage()
                msg["From"] = settings.SMTP_FROM
                msg["To"] = to
                msg["Subject"] = subject
                msg.set_content(body)
                try:
                    smtp.send_message(msg)
                    sent += 1
                except Exception:
                    log.exception("Could not send one notification e-mail")
    except Exception:
        log.exception("Could not open the SMTP connection for notification e-mails")
    return sent
