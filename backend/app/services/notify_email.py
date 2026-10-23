"""E-mail to matching donors when a new blood request is posted. Runs in the background after the request is saved."""
import logging
from typing import List

from backend.app.config import settings
from backend.app.utils.email import send_many

log = logging.getLogger("lifora.notify")


def request_link(request_id: str) -> str:
    return f"{settings.FRONTEND_URL}/?request={request_id}"


def build_request_emails(recipients: List[dict], req: dict) -> list:
    """Private details (patient name, contact phone, reason) are never put in the e-mail; the link shows only the basics."""
    link = request_link(req["id"])
    units = req.get("unitsNeeded", 1)
    subject = f"Blood needed: {req['bloodGroup']} at {req['hospitalName']} ({req['urgency']}) | রক্ত দরকার"
    messages = []
    for r in recipients:
        body = (
            f"Hello {r['name']},\n\n"
            f"Someone needs {units} unit(s) of {req['bloodGroup']} blood at {req['hospitalName']}, {req['city']}.\n"
            f"Urgency: {req['urgency']}. Needed: {req['deadline']}.\n\n"
            f"Your blood group ({r['bloodGroup']}) can donate to this group. If you can help, open this link and press Accept:\n"
            f"{link}\n\n"
            f"---\n\n"
            f"{r['name']}, {req['hospitalName']} ({req['city']}) এ {units} ব্যাগ {req['bloodGroup']} রক্ত দরকার।\n"
            f"জরুরি অবস্থা: {req['urgency']}। সময়সীমা: {req['deadline']}।\n"
            f"আপনার রক্তের গ্রুপ ({r['bloodGroup']}) এই অনুরোধের সাথে মেলে। সাহায্য করতে পারলে লিংকটি খুলে Accept চাপুন:\n"
            f"{link}\n\n"
            f"This is a convenience match, not medical clearance. To stop these e-mails, set your availability to "
            f"'Unavailable' in your donor dashboard.\n"
            f"এই ইমেইল আর না পেতে ডোনার ড্যাশবোর্ডে আপনার অবস্থা 'Unavailable' করে দিন।\n"
        )
        messages.append((r["email"], subject, body))
    return messages


def send_request_emails(recipients: List[dict], req: dict) -> None:
    try:
        sent = send_many(build_request_emails(recipients, req))
        log.info("Request %s: %d of %d donor e-mail(s) sent", req.get("id"), sent, len(recipients))
    except Exception:
        log.exception("Sending request e-mails failed")
