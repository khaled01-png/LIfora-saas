
import json
import logging
import os
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from backend.app.config import settings

log = logging.getLogger("lifora.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def email_configured() -> bool:
    return bool(
        os.getenv("BREVO_API_KEY", "").strip()
        and settings.SMTP_FROM.strip()
    )


def send_email(to: str, subject: str, body: str) -> bool:
    if not email_configured():
        log.error("Email not configured: BREVO_API_KEY or SMTP_FROM missing")
        return False

    sender_name, sender_email = parseaddr(settings.SMTP_FROM)
    if not sender_email or "@" not in sender_email:
        log.error("SMTP_FROM must contain a valid sender email")
        return False

    payload = {
        "sender": {
            "name": sender_name or "LIFORA",
            "email": sender_email,
        },
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }

    request = Request(
        BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": os.environ["BREVO_API_KEY"].strip(),
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            log.info("Brevo API accepted email; status=%s", response.status)
            return 200 <= response.status < 300
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")[:1000]
        log.error("Brevo API error: status=%s response=%s", exc.code, details)
    except (URLError, TimeoutError, OSError) as exc:
        log.error("Brevo API connection failed: %s", exc)
    except Exception:
        log.exception("Unexpected error sending email through Brevo")

    return False


def send_many(messages) -> int:
    sent = 0
    for to, subject, body in messages:
        if send_email(to, subject, body):
            sent += 1
    return sent
