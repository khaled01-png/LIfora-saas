"""Security & business-logic regression tests (synthetic data only)."""
import datetime
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


# ---------- authentication ----------
def test_cannot_self_register_as_admin(client):
    # A "role" sent at sign-up is ignored: new accounts are "pending" until onboarding, and onboarding refuses admin.
    r = client.post("/api/auth/register", json={
        "name": "Mallory Person", "email": "mallory@example.org", "password": "StrongPass123", "role": "admin"})
    assert r.status_code == 201
    v = client.post("/api/auth/verify-email", json={"email": "mallory@example.org", "code": r.json()["devCode"]})
    assert v.json()["user"]["role"] == "pending"
    h = {"Authorization": f"Bearer {v.json()['token']}"}
    bad = client.post("/api/auth/onboarding", headers=h, json={
        "role": "admin", "bloodGroup": "A+", "age": 30, "city": "Sylhet", "location": "X Road",
        "radiusKm": 10, "phone": "+880 1711-000111"})
    assert bad.status_code == 422


def test_weak_password_rejected(client):
    r = client.post("/api/auth/register", json={
        "name": "Weak", "email": "weak@example.org", "password": "abc123", "role": "donor"})
    assert r.status_code == 422


def test_demo_password_backdoor_is_closed(client):
    for pw in ("lifora2026", "LiforaDemo2026!"):
        r = client.post("/api/auth/login", json={"email": "admin@lifora.org", "password": pw})
        assert r.status_code == 401, pw


def test_wrong_password_and_unknown_email_look_identical(client):
    a = client.post("/api/auth/login", json={"email": "admin@lifora.org", "password": "nope-nope"})
    b = client.post("/api/auth/login", json={"email": "ghost@example.org", "password": "nope-nope"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_new_users_are_never_verified_or_admin(client, make_user):
    user, h = make_user("plain1@example.org")
    _, hreq = make_user("plain1-viewer@example.org", role="requester")
    assert user["role"] == "donor"
    donors = client.get("/api/donors", headers=hreq).json()["donors"]
    mine = [d for d in donors if d["name"] == "Test User"]
    assert mine and all(d["verified"] is False for d in mine)


# ---------- privacy ----------
def test_guests_cannot_read_members_only_data(client):
    """Signed-out visitors get a 401 on every list/detail endpoint (only /stats and /health are public)."""
    for path in ["/api/donors", "/api/donors/x", "/api/donors/x/history", "/api/requests", "/api/requests/x",
                 "/api/requests/feed", "/api/requests/x/my-response", "/api/centers", "/api/centers/x",
                 "/api/inventory", "/api/inventory/donations"]:
        assert client.get(path).status_code == 401, path
    assert client.get("/api/stats").status_code == 200
    assert client.get("/api/health").status_code == 200


def test_member_donor_list_hides_other_peoples_contact_details(client, make_user):
    _, h = make_user("member-viewer@example.org", role="requester")
    donors = client.get("/api/donors", headers=h).json()["donors"]
    assert donors
    for d in donors:
        assert "•" in d["phone"] and "•" in d["email"]


def test_contact_info_requires_login(client, make_user):
    _, h = make_user("viewer1@example.org", role="requester")
    donor_id = client.get("/api/donors", headers=h).json()["donors"][0]["id"]
    assert client.get(f"/api/donors/{donor_id}/contact-info").status_code == 401
    assert client.post(f"/api/donors/{donor_id}/contact", json={"message": "hi"}).status_code == 401
    r = client.get(f"/api/donors/{donor_id}/contact-info", headers=h)
    assert r.status_code == 200 and "•" not in r.json()["phone"]


def test_members_see_request_contact_phone_but_guests_get_nothing(client, make_user):
    _, h = make_user("member-req-viewer@example.org", role="donor")
    reqs = client.get("/api/requests", headers=h).json()["requests"]
    assert reqs and all("•" not in r["contactPhone"] for r in reqs)
    assert client.get("/api/requests").status_code == 401


def test_donation_history_masks_names_for_non_admins(client, make_user):
    _, h = make_user("member-hist-viewer@example.org", role="donor")
    for rec in client.get("/api/inventory/donations", headers=h).json()["donations"]:
        assert rec["donorId"] is None
        assert len(rec["donorName"].split()) <= 2


# ---------- authorization ----------
def test_inventory_write_requires_admin(client, make_user, admin_headers):
    assert client.put("/api/inventory/A+", json={"availableUnits": 1}).status_code == 401
    assert client.post("/api/inventory/A+/adjust", json={"delta": 5}).status_code == 401
    _, h = make_user("plain2@example.org")
    assert client.put("/api/inventory/A+", json={"availableUnits": 1}, headers=h).status_code == 403
    assert client.put("/api/inventory/A+", json={"availableUnits": 40}, headers=admin_headers).status_code == 200


def test_notifications_are_private(client, make_user):
    u1, h1 = make_user("n1@example.org", role="requester")
    u2, h2 = make_user("n2@example.org", role="requester")
    assert client.get("/api/notifications").json()["count"] == 0          # guest sees nothing
    assert client.get(f"/api/notifications?user_id={u1['id']}", headers=h2).status_code == 403
    assert client.put("/api/notifications/read-all").status_code == 401
    assert client.delete("/api/notifications/anything").status_code == 401


def test_create_request_requires_login(client):
    r = client.post("/api/requests", json=_req_payload())
    assert r.status_code == 401


def _req_payload(**kw):
    p = {"patientName": "Test Patient", "bloodGroup": "B+", "unitsNeeded": 1,
         "hospitalName": "Test Hospital", "city": "Sylhet", "urgency": "Urgent",
         "deadline": "Within 4 hours", "reason": "Synthetic test", "contactPerson": "Tester",
         "contactPhone": "+880 1700-111222"}
    p.update(kw)
    return p


def test_request_ownership_enforced(client, make_user, admin_headers):
    owner, ho = make_user("owner1@example.org", role="requester", blood="O+")
    _, ho2 = make_user("stranger1@example.org", role="requester", blood="O+")
    r = client.post("/api/requests", json=_req_payload(), headers=ho)
    assert r.status_code == 201, r.text
    rid = r.json()["request"]["id"]

    # duplicates are refused
    assert client.post("/api/requests", json=_req_payload(), headers=ho).status_code == 409
    # strangers cannot change, book, confirm or read responses
    assert client.put(f"/api/requests/{rid}/status", json={"status": "Cancelled"}, headers=ho2).status_code == 403
    assert client.post(f"/api/requests/{rid}/book", json={"responseId": "x"}, headers=ho2).status_code == 403
    assert client.post(f"/api/requests/{rid}/confirm-donation", json={}, headers=ho2).status_code == 403
    assert client.get(f"/api/requests/{rid}/responses", headers=ho2).status_code == 403
    # anonymous cannot either
    assert client.put(f"/api/requests/{rid}/status", json={"status": "Cancelled"}).status_code == 401
    # owner can cancel
    assert client.put(f"/api/requests/{rid}/status", json={"status": "Cancelled"}, headers=ho).status_code == 200
    # finished requests can't be reopened by the owner
    assert client.put(f"/api/requests/{rid}/status", json={"status": "Pending"}, headers=ho).status_code == 400


# ---------- blood request flow ----------
def test_full_flow_matching_response_and_notifications(client, make_user):
    req_user, hr = make_user("flow-requester@example.org", role="requester", blood="AB+", name="Flow Requester")
    don_ok, hd = make_user("flow-donor-ok@example.org", role="donor", blood="O-", name="Flow Donor")
    don_bad, hb = make_user("flow-donor-bad@example.org", role="donor", blood="A+", name="Flow BadMatch")

    r = client.post("/api/requests", json=_req_payload(bloodGroup="B-", patientName="Flow Patient"), headers=hr)
    assert r.status_code == 201, r.text
    rid = r.json()["request"]["id"]

    # O- can give to B-, A+ cannot -> only compatible donor was notified
    n_ok = client.get("/api/notifications", headers=hd).json()["notifications"]
    n_bad = client.get("/api/notifications", headers=hb).json()["notifications"]
    assert any(n["requestId"] == rid for n in n_ok)
    assert not any(n["requestId"] == rid for n in n_bad)

    # feed shows the request only to the compatible donor
    assert any(x["id"] == rid for x in client.get("/api/requests/feed", headers=hd).json()["requests"])
    assert not any(x["id"] == rid for x in client.get("/api/requests/feed", headers=hb).json()["requests"])
    assert client.get("/api/requests/feed").status_code == 401           # guests: login required

    # incompatible donor is refused, compatible donor accepted once
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hb).status_code == 400
    ok = client.post(f"/api/requests/{rid}/respond", json={"message": "on my way"}, headers=hd)
    assert ok.status_code == 200, ok.text
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hd).status_code == 409
    # a requester account cannot respond at all (that is a donor feature)
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hr).status_code == 403

    # requester received a notification and can see responses (with contact data)
    rn = client.get("/api/notifications", headers=hr).json()["notifications"]
    assert any(n["type"] == "donor_responded" and n["requestId"] == rid for n in rn)
    resp = client.get(f"/api/requests/{rid}/responses", headers=hr).json()
    assert resp["count"] == 1
    # other people can not fetch the response list
    assert client.get(f"/api/requests/{rid}/responses", headers=hd).status_code == 403
    # request detail hides responses from non-owners
    assert client.get(f"/api/requests/{rid}", headers=hd).json()["request"]["responses"] == []

    # confirm donation: owner only, donor must have responded
    rsp_id = resp["responses"][0]["id"]
    assert client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": rsp_id}, headers=hd).status_code == 403
    done = client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": rsp_id, "units": 1}, headers=hr)
    assert done.status_code == 200, done.text
    assert done.json()["request"]["status"] == "Fulfilled"
    # cannot confirm twice, cannot respond after fulfilment
    assert client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": rsp_id}, headers=hr).status_code == 400


def test_requests_expire(client, make_user):
    from backend.app.database import SessionLocal
    from backend.app.models.blood_request import BloodRequest
    _, h = make_user("expire-owner@example.org", role="requester", blood="O+")
    rid = client.post("/api/requests", json=_req_payload(patientName="Expiring", deadline="Within 1 hours"),
                      headers=h).json()["request"]["id"]
    db = SessionLocal()
    try:
        r = db.query(BloodRequest).filter(BloodRequest.id == rid).first()
        r.expires_at = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        db.commit()
    finally:
        db.close()
    assert client.get(f"/api/requests/{rid}", headers=h).json()["request"]["status"] == "Expired"


# ---------- privacy rights ----------
def test_account_deletion_removes_personal_data(client, make_user):
    user, h = make_user("goner@example.org", name="Goner Person")
    _, other = make_user("goner-observer@example.org", role="requester")
    assert client.delete("/api/auth/me", headers=h).status_code == 200
    assert client.post("/api/auth/login", json={"email": "goner@example.org", "password": "StrongPass123"}).status_code == 401
    assert not any(d["name"] == "Goner Person" for d in client.get("/api/donors", headers=other).json()["donors"])


# ---------- production configuration ----------
def _run_prod(env_extra):
    import os
    env = {k: v for k, v in os.environ.items() if k not in ("SECRET_KEY", "ALLOWED_ORIGINS")}
    env.update({"ENVIRONMENT": "production", "DATABASE_URL": "sqlite:///:memory:"})
    env.update(env_extra)
    return subprocess.run([sys.executable, "-c", "import backend.app.config"], cwd=ROOT, env=env,
                          capture_output=True, text=True)


def test_production_refuses_to_start_without_secret_or_with_wildcard_cors():
    assert _run_prod({}).returncode != 0
    assert _run_prod({"SECRET_KEY": "x" * 64}).returncode != 0                       # no ALLOWED_ORIGINS
    assert _run_prod({"SECRET_KEY": "x" * 64, "ALLOWED_ORIGINS": "*"}).returncode != 0
    assert _run_prod({"SECRET_KEY": "short", "ALLOWED_ORIGINS": "https://a.example"}).returncode != 0
    assert _run_prod({"SECRET_KEY": "x" * 64, "ALLOWED_ORIGINS": "https://a.example"}).returncode == 0


def test_security_headers_and_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["database"] == "ok"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


# ---------- password reset ----------
def test_password_reset_flow(client, make_user):
    from backend.app.auth.security import create_reset_token, create_access_token
    from backend.app.database import SessionLocal
    from backend.app.models.user import User

    user, _ = make_user("reset-me@example.org", password="OldPassword123")
    # same answer for existing and unknown accounts (no enumeration)
    a = client.post("/api/auth/forgot-password", json={"email": "reset-me@example.org"})
    b = client.post("/api/auth/forgot-password", json={"email": "nobody-here@example.org"})
    assert a.status_code == b.status_code == 200 and a.json() == b.json()

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == "reset-me@example.org").first()
        token = create_reset_token(u.id, u.hashed_password)
    finally:
        db.close()

    # a reset token is not a login token
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    # weak passwords refused, valid one accepted, token is single-use
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "short"}).status_code == 422
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "BrandNewPass456"}).status_code == 200
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "AnotherPass789"}).status_code == 400
    assert client.post("/api/auth/login", json={"email": "reset-me@example.org", "password": "OldPassword123"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "reset-me@example.org", "password": "BrandNewPass456"}).status_code == 200
    # a login token can't be used as a reset token
    assert client.post("/api/auth/reset-password", json={"token": create_access_token({"sub": user["id"]}) , "newPassword": "BrandNewPass456"}).status_code == 400


# ---------- contact form & center management ----------
def test_contact_form_is_stored_and_admin_only_readable(client, make_user, admin_headers):
    r = client.post("/api/contact", json={"name": "Visitor", "email": "visitor@example.org", "message": "Hello team, a question."})
    assert r.status_code == 201
    assert client.post("/api/contact", json={"name": "V", "email": "bad", "message": "x"}).status_code == 422
    assert client.get("/api/contact/messages").status_code == 401
    _, h = make_user("notadmin@example.org")
    assert client.get("/api/contact/messages", headers=h).status_code == 403
    rows = client.get("/api/contact/messages", headers=admin_headers).json()["messages"]
    assert any(m["email"] == "visitor@example.org" for m in rows)


def test_center_management_is_admin_only_and_has_no_invented_numbers(client, make_user, admin_headers):
    body = {"name": "Test Center Alpha", "address": "1 Test Road", "phone": "+880 100000000",
            "bloodGroupsAvailable": ["O+"]}
    assert client.post("/api/centers", json=body).status_code == 401
    _, h = make_user("notadmin2@example.org")
    assert client.post("/api/centers", json=body, headers=h).status_code == 403
    r = client.post("/api/centers", json=body, headers=admin_headers)
    assert r.status_code == 201, r.text
    c = r.json()["center"]
    assert c["rating"] == 0 and c["totalReviews"] == 0 and c["availableUnits"] == 0
    assert client.delete(f"/api/centers/{c['id']}", headers=h).status_code == 403
    assert client.delete(f"/api/centers/{c['id']}", headers=admin_headers).status_code == 200


def test_production_start_has_no_demo_people_or_fake_centers():
    import os, subprocess, sys, tempfile
    from pathlib import Path
    root = Path(__file__).resolve().parents[2]
    db = tempfile.mkdtemp() + "/p.db"
    env = {k: v for k, v in os.environ.items()}
    env.update({"ENVIRONMENT": "production", "SECRET_KEY": "x" * 64, "ALLOWED_ORIGINS": "https://a.example",
                "DATABASE_URL": f"sqlite:///{db}"})
    code = (
        "from fastapi.testclient import TestClient\n"
        "from backend.app.main import app\n"
        "with TestClient(app) as c:\n"
        "    from backend.app.database import SessionLocal\n"
        "    from backend.app.models.user import User\n"
        "    from backend.app.auth.security import create_access_token\n"
        "    db = SessionLocal(); db.add(User(id='u-prod', email='prod@example.org', hashed_password='x', name='Prod Check', role='requester', email_verified=True, profile_completed=True)); db.commit(); db.close()\n"
        "    r = c.post('/api/auth/register', json={'name':'Nora Smith','email':'nosmtp@example.org','password':'StrongPass123'})\n"
        "    assert r.status_code == 503\n"
        "    h = {'Authorization': 'Bearer ' + create_access_token({'sub':'u-prod'})}\n"
        "    assert c.get('/api/donors', headers=h).json()['count']==0\n"
        "    assert c.get('/api/requests', headers=h).json()['count']==0\n"
        "    assert c.get('/api/centers', headers=h).json()['count']==0\n"
        "    assert c.get('/api/stats').json()['stats']['totalDonors']==0\n"
        "print('OK')\n")
    r = subprocess.run([sys.executable, "-c", code], cwd=root, env=env, capture_output=True, text=True)
    assert r.returncode == 0 and "OK" in r.stdout, r.stderr[-800:]


# ---------- garbage input is rejected ----------
def test_garbage_registration_is_rejected(client):
    base = {"name": "Real Person", "email": "garbage@example.org", "password": "StrongPass123"}
    for patch in [{"name": "12345"}, {"name": "x"}, {"name": "<script>"}, {"name": "a@b.co"},
                  {"email": "not-an-email"}, {"password": "short"}]:
        assert client.post("/api/auth/register", json={**base, **patch}).status_code == 422, patch
    ok = client.post("/api/auth/register", json=base)
    assert ok.status_code == 201

    # profile step: bad phone / blood group / age / radius are refused
    v = client.post("/api/auth/verify-email", json={"email": base["email"], "code": ok.json()["devCode"]})
    h = {"Authorization": f"Bearer {v.json()['token']}"}
    good = {"role": "donor", "bloodGroup": "A+", "age": 30, "city": "Sylhet", "location": "Zindabazar",
            "radiusKm": 10, "phone": "+880 1711-000111"}
    for patch in [{"phone": "abc"}, {"phone": "00000000"}, {"phone": "123"}, {"bloodGroup": "Z+"},
                  {"age": 17}, {"age": 70}, {"radiusKm": 0}, {"radiusKm": 500}, {"role": "wizard"}, {"city": "x"}]:
        assert client.post("/api/auth/onboarding", headers=h, json={**good, **patch}).status_code == 422, patch
    assert client.post("/api/auth/onboarding", headers=h, json=good).status_code == 200


def test_garbage_request_is_rejected(client, make_user):
    _, h = make_user("garbage-req@example.org", role="requester")
    good = {"patientName": "Real Patient", "bloodGroup": "B+", "unitsNeeded": 2, "hospitalName": "Some Hospital",
            "city": "Sylhet", "urgency": "Urgent", "deadline": "Within 4 hours", "reason": "Surgery",
            "contactPerson": "Family Member", "contactPhone": "+880 1700-111222"}
    for patch in [{"patientName": "999"}, {"contactPhone": "hello"}, {"contactPhone": "11111111"},
                  {"unitsNeeded": 0}, {"unitsNeeded": 99}, {"bloodGroup": "Q"}, {"hospitalName": "x"}]:
        assert client.post("/api/requests", json={**good, **patch}, headers=h).status_code == 422, patch
    assert client.post("/api/requests", json=good, headers=h).status_code == 201


# ---------- e-mail verification & onboarding ----------
def test_unverified_account_cannot_log_in_or_use_the_api(client):
    r = client.post("/api/auth/register", json={"name": "Unverified Person", "email": "unver@example.org", "password": "StrongPass123"})
    assert r.status_code == 201 and "token" not in r.json() and r.json()["needsVerification"] is True
    login = client.post("/api/auth/login", json={"email": "unver@example.org", "password": "StrongPass123"})
    assert login.status_code == 403 and login.json()["needsVerification"] is True
    # registering the same address again while still unverified is allowed (owner retrying) but never leaks a token
    again = client.post("/api/auth/register", json={"name": "Unverified Person", "email": "unver@example.org", "password": "StrongPass123"})
    assert again.status_code == 201 and "token" not in again.json()


def test_wrong_code_locks_after_five_attempts(client):
    r = client.post("/api/auth/register", json={"name": "Locked Person", "email": "locked@example.org", "password": "StrongPass123"})
    real = r.json()["devCode"]
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(5):
        assert client.post("/api/auth/verify-email", json={"email": "locked@example.org", "code": wrong}).status_code == 400
    # even the correct code is refused now: a new code must be requested
    assert client.post("/api/auth/verify-email", json={"email": "locked@example.org", "code": real}).status_code == 400
    # resend is rate-limited per account (60 s cool-down), so force the cool-down to have passed
    from backend.app.database import SessionLocal
    from backend.app.models.user import User
    import datetime
    db = SessionLocal()
    u = db.query(User).filter(User.email == "locked@example.org").first()
    u.verification_sent_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
    db.commit(); db.close()
    fresh = client.post("/api/auth/resend-code", json={"email": "locked@example.org"}).json()["devCode"]
    assert client.post("/api/auth/verify-email", json={"email": "locked@example.org", "code": fresh}).status_code == 200


def test_expired_code_is_refused(client):
    r = client.post("/api/auth/register", json={"name": "Late Person", "email": "late@example.org", "password": "StrongPass123"})
    from backend.app.database import SessionLocal
    from backend.app.models.user import User
    import datetime
    db = SessionLocal()
    u = db.query(User).filter(User.email == "late@example.org").first()
    u.verification_expires = datetime.datetime.utcnow() - datetime.timedelta(minutes=1)
    db.commit(); db.close()
    assert client.post("/api/auth/verify-email", json={"email": "late@example.org", "code": r.json()["devCode"]}).status_code == 400


def test_resend_does_not_reveal_which_emails_exist(client):
    a = client.post("/api/auth/resend-code", json={"email": "nobody-at-all@example.org"}).json()
    assert "devCode" not in a and a["needsVerification"] is True


def test_pending_member_cannot_see_members_only_data_until_onboarding(client):
    r = client.post("/api/auth/register", json={"name": "Half Done", "email": "half@example.org", "password": "StrongPass123"})
    v = client.post("/api/auth/verify-email", json={"email": "half@example.org", "code": r.json()["devCode"]})
    h = {"Authorization": f"Bearer {v.json()['token']}"}
    assert client.get("/api/auth/me", headers=h).json()["user"]["profileCompleted"] is False
    for path in ["/api/donors", "/api/requests", "/api/centers", "/api/inventory"]:
        assert client.get(path, headers=h).status_code == 403, path
    assert client.post("/api/requests", json=_req_payload(), headers=h).status_code == 403
    done = client.post("/api/auth/onboarding", headers=h, json={
        "role": "requester", "bloodGroup": "O+", "age": 40, "city": "Sylhet", "location": "Ambarkhana",
        "radiusKm": 15, "phone": "+880 1711-000111"})
    assert done.status_code == 200 and done.json()["user"]["profileCompleted"] is True
    assert client.get("/api/donors", headers=h).status_code == 200


def test_profile_is_kept_in_the_user_and_the_donor_card(client, make_user):
    user, h = make_user("profile-donor@example.org", role="donor", blood="AB-", age=28, city="Sylhet",
                        location="Subid Bazar", radius=25)
    assert user["age"] == 28 and user["radiusKm"] == 25 and user["bloodGroup"] == "AB-"
    _, hviewer = make_user("profile-viewer@example.org", role="requester")
    mine = [d for d in client.get("/api/donors", headers=hviewer).json()["donors"] if d["name"] == "Test User" and d["bloodGroup"] == "AB-"]
    assert mine and mine[0]["travelKm"] == 25 and mine[0]["verified"] is False
    upd = client.put("/api/auth/profile", headers=h, json={"radiusKm": 40, "location": "Zindabazar"})
    assert upd.status_code == 200 and upd.json()["user"]["radiusKm"] == 40
    assert client.put("/api/auth/profile", headers=h, json={"age": 12}).status_code == 422


def test_donor_matching_uses_the_city(client, make_user):
    _, hr = make_user("city-req@example.org", role="requester", blood="O+", city="Dhaka")
    _, hd_far = make_user("city-donor-far@example.org", role="donor", blood="O-", city="Sylhet")
    _, hd_near = make_user("city-donor-near@example.org", role="donor", blood="O-", city="Dhaka")
    rid = client.post("/api/requests", json=_req_payload(city="Dhaka", patientName="City Patient"), headers=hr).json()["request"]["id"]
    assert any(n["requestId"] == rid for n in client.get("/api/notifications", headers=hd_near).json()["notifications"])
    assert not any(n["requestId"] == rid for n in client.get("/api/notifications", headers=hd_far).json()["notifications"])


# ---------- role-based features: donor feed vs requester features ----------
def test_donors_and_requesters_get_different_features(client, make_user):
    _, hd = make_user("role-donor@example.org", role="donor", blood="O-")
    _, hr = make_user("role-req@example.org", role="requester", blood="B+")
    _, hr2 = make_user("role-req2@example.org", role="requester", blood="B+")

    # a donor cannot search other donors, cannot post requests, cannot contact donors
    assert client.get("/api/donors", headers=hd).status_code == 403
    assert client.post("/api/requests", json=_req_payload(patientName="Role Patient"), headers=hd).status_code == 403
    donor_id = client.get("/api/donors", headers=hr).json()["donors"][0]["id"]
    assert client.get(f"/api/donors/{donor_id}/contact-info", headers=hd).status_code == 403
    # a requester can search donors and post, but has no donor feed and cannot respond
    assert client.get("/api/donors", headers=hr).status_code == 200
    rid = client.post("/api/requests", json=_req_payload(patientName="Role Patient"), headers=hr).json()["request"]["id"]
    assert client.get("/api/requests/feed", headers=hr).status_code == 403
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hr).status_code == 403

    # requesters only ever see their OWN requests; another requester sees none of them
    mine = client.get("/api/requests", headers=hr).json()["requests"]
    other = client.get("/api/requests", headers=hr2).json()["requests"]
    assert any(x["id"] == rid for x in mine) and all(x.get("userId") for x in mine)
    assert not any(x["id"] == rid for x in other)
    assert client.get(f"/api/requests/{rid}", headers=hr2).status_code == 403
    # donors see open requests and can respond
    assert any(x["id"] == rid for x in client.get("/api/requests", headers=hd).json()["requests"])
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hd).status_code == 200
    # a donor can open only their own donor card
    own = [d for d in client.get("/api/donors", headers=hr).json()["donors"] if d["name"] == "Test User" and d["bloodGroup"] == "O-"][0]
    assert client.get(f"/api/donors/{own['id']}", headers=hd).status_code in (200, 403)


# ---------- one account, two dashboards ----------
def test_one_account_can_switch_between_requester_and_donor(client, make_user):
    user, h = make_user("both@example.org", role="requester", blood="O-", age=30, city="Sylhet")
    _, hd = make_user("both-donor@example.org", role="donor", blood="O-", city="Sylhet")
    rid = client.post("/api/requests", json=_req_payload(patientName="Switch Patient"), headers=h).json()["request"]["id"]

    # as a requester: no donor feed, cannot respond
    assert client.get("/api/requests/feed", headers=h).status_code == 403
    sw = client.post("/api/auth/switch-role", headers=h, json={"role": "donor"})
    assert sw.status_code == 200 and sw.json()["user"]["role"] == "donor"
    assert sw.json()["user"]["bloodGroup"] == "O-" and sw.json()["user"]["age"] == 30   # profile kept, nothing re-asked
    # as a donor: has the feed, can no longer post
    assert client.get("/api/requests/feed", headers=h).status_code == 200
    assert client.post("/api/requests", json=_req_payload(patientName="Another"), headers=h).status_code == 403
    # but can never answer their OWN request
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=h).status_code == 400
    # another donor answers; switching back, the requester sees the response and the notification
    assert client.post(f"/api/requests/{rid}/respond", json={"message": "coming"}, headers=hd).status_code == 200
    back = client.post("/api/auth/switch-role", headers=h, json={"role": "requester"})
    assert back.json()["user"]["role"] == "requester"
    assert client.get(f"/api/requests/{rid}/responses", headers=h).json()["count"] == 1
    notes = client.get("/api/notifications", headers=h).json()["notifications"]
    assert any(n["type"] == "donor_responded" and n["requestId"] == rid for n in notes)


def test_switch_role_rules(client, make_user, admin_headers):
    assert client.post("/api/auth/switch-role", json={"role": "donor"}).status_code == 401
    assert client.post("/api/auth/switch-role", headers=admin_headers, json={"role": "donor"}).status_code == 400
    _, h = make_user("switch-rules@example.org", role="requester", blood="A+", age=70)   # too old to donate
    assert client.post("/api/auth/switch-role", headers=h, json={"role": "donor"}).status_code == 422
    assert client.post("/api/auth/switch-role", headers=h, json={"role": "admin"}).status_code == 422
    # half-registered accounts cannot switch
    r = client.post("/api/auth/register", json={"name": "Half Way", "email": "halfway@example.org", "password": "StrongPass123"})
    v = client.post("/api/auth/verify-email", json={"email": "halfway@example.org", "code": r.json()["devCode"]})
    hh = {"Authorization": f"Bearer {v.json()['token']}"}
    assert client.post("/api/auth/switch-role", headers=hh, json={"role": "donor"}).status_code == 403


# ---------- fake-looking data is refused ----------
def test_gibberish_names_are_refused_and_real_names_pass(client):
    for bad in ["hsjsj", "asdfgh", "qwerty", "aaaaaa", "hdhd", "bcdfgh", "x y"]:
        r = client.post("/api/auth/register", json={"name": bad, "email": "gib@example.org", "password": "StrongPass123"})
        assert r.status_code == 422, bad
    for good in ["Karim Hossain", "Md. Rahim Uddin", "Nusrat Jahan", "Shrabon Rhythm", "রহিম উদ্দিন", "Mst. Rina"]:
        email = good.replace(" ", "").replace(".", "").lower()[:8] + "@example.org"
        r = client.post("/api/auth/register", json={"name": good, "email": email if email.isascii() else "bangla@example.org", "password": "StrongPass123"})
        assert r.status_code == 201, good


def test_only_real_bangladesh_mobile_numbers_are_accepted(client, make_user):
    _, h = make_user("phone-check@example.org", role="requester")
    good = {"patientName": "Real Patient", "bloodGroup": "B+", "unitsNeeded": 1, "hospitalName": "Osmani Medical College Hospital",
            "city": "Sylhet", "urgency": "Urgent", "deadline": "Within 6 hours", "reason": "Surgery",
            "contactPerson": "Family Member", "contactPhone": "01711000111"}
    for bad in ["12345678901", "01111111111", "01011000111", "+1 202 555 0143", "0171100011", "017110001112", "hello", "00000000000"]:
        assert client.post("/api/requests", json={**good, "contactPhone": bad}, headers=h).status_code == 422, bad
    for ok_number, rid in [("01711000111", 0), ("+8801711-000112", 1)]:
        r = client.post("/api/requests", json={**good, "contactPhone": ok_number, "patientName": f"Real Patient {'Aa' if rid==0 else 'Bb'}"}, headers=h)
        assert r.status_code == 201, (ok_number, r.text)
        assert r.json()["request"]["contactPhone"].startswith("+880 1711-")       # stored in one tidy format


def test_hospital_and_deadline_must_make_sense(client, make_user):
    _, h = make_user("hospital-check@example.org", role="requester")
    base = {"patientName": "Real Patient", "bloodGroup": "O+", "unitsNeeded": 2, "hospitalName": "Square Hospital",
            "city": "Dhaka", "urgency": "Urgent", "deadline": "Within 6 hours", "reason": "Surgery",
            "contactPerson": "Family Member", "contactPhone": "01819345678"}
    for patch in [{"hospitalName": "hdhd"}, {"hospitalName": "12345"}, {"hospitalName": "ab"}, {"hospitalName": "<b>x</b>"},
                  {"deadline": "tomorrow lol"}, {"deadline": "Within 400 days"}, {"deadline": "5 PM"}, {"unitsNeeded": 0},
                  {"unitsNeeded": 11}, {"patientName": "hsjsj"}, {"contactPerson": "asdfgh"}]:
        assert client.post("/api/requests", json={**base, **patch}, headers=h).status_code == 422, patch
    assert client.post("/api/requests", json=base, headers=h).status_code == 201


def test_a_person_cannot_keep_more_than_three_open_requests(client, make_user):
    _, h = make_user("spammer@example.org", role="requester", blood="A+")
    base = {"bloodGroup": "B+", "unitsNeeded": 1, "hospitalName": "Evercare Hospital", "city": "Dhaka", "urgency": "Urgent",
            "deadline": "Within 12 hours", "reason": "Surgery", "contactPerson": "Family Member", "contactPhone": "01711222333"}
    names = ["Anika Rahman", "Bilal Hossain", "Chandra Das", "Dilruba Akter"]
    codes = [client.post("/api/requests", json={**base, "patientName": n}, headers=h).status_code for n in names]
    assert codes == [201, 201, 201, 429]


# ---------- status labels follow the real cycle ----------
def test_status_label_goes_waiting_accepted_booked_donated(client, make_user):
    _, hr = make_user("label-req@example.org", role="requester", blood="A+")
    _, hd = make_user("label-donor@example.org", role="donor", blood="O-")
    rid = client.post("/api/requests", json=_req_payload(patientName="Label Patient", bloodGroup="A+"), headers=hr).json()["request"]["id"]

    def label():
        mine = client.get("/api/requests", headers=hr).json()["requests"]
        return [x for x in mine if x["id"] == rid][0]["displayStatus"]

    assert label() == "Waiting for a donor"
    assert client.post(f"/api/requests/{rid}/respond", json={"message": "I can come"}, headers=hd).status_code == 200
    assert label() == "Donor accepted"
    resp = client.get(f"/api/requests/{rid}/responses", headers=hr).json()["responses"][0]
    assert resp["status"] == "accepted"
    assert client.post(f"/api/requests/{rid}/book", json={"responseId": resp["id"]}, headers=hr).status_code == 200
    assert label() == "Donor booked"
    # the donor is told they were booked
    notes = client.get("/api/notifications", headers=hd).json()["notifications"]
    assert any(n["title"] == "You were booked" and n["requestId"] == rid for n in notes)
    done = client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": resp["id"], "units": 1}, headers=hr)
    assert done.status_code == 200
    assert label() == "Donated"
    assert client.get(f"/api/requests/{rid}/responses", headers=hr).json()["responses"][0]["status"] == "completed"
    notes = client.get("/api/notifications", headers=hd).json()["notifications"]
    assert any(n["title"] == "Donation confirmed" for n in notes)


# ---------- launch-hardening additions ----------
def test_old_token_of_a_deleted_account_stops_working(client, make_user):
    _, h = make_user("deleted-token@example.org", name="Token Person")
    assert client.get("/api/auth/me", headers=h).status_code == 200
    assert client.delete("/api/auth/me", headers=h).status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_rate_limit_ip_is_taken_from_the_proxy_not_from_the_client(monkeypatch):
    from types import SimpleNamespace
    from backend.app.config import settings
    from backend.app.utils import rate_limiter
    req = SimpleNamespace(headers={"x-forwarded-for": "6.6.6.6, 9.9.9.9"}, client=SimpleNamespace(host="10.0.0.1"))
    monkeypatch.setattr(settings, "TRUST_PROXY", True)
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 1)
    assert rate_limiter.client_ip(req) == "9.9.9.9"
    monkeypatch.setattr(settings, "TRUST_PROXY", False)
    assert rate_limiter.client_ip(req) == "10.0.0.1"


def test_donor_cooldown_blocks_early_availability_and_ends_by_itself(client, make_user):
    import datetime
    from backend.app.database import SessionLocal
    from backend.app.models.donor import Donor
    _, h = make_user("cooldown-donor@example.org")
    db = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.email == "cooldown-donor@example.org").first()
        donor_id = donor.id
        donor.last_donation_date = (datetime.date.today() - datetime.timedelta(days=10)).isoformat()
        donor.availability = "Recently Donated"
        db.commit()
    finally:
        db.close()
    early = client.put(f"/api/donors/{donor_id}/availability", headers=h, json={"availability": "Available"})
    assert early.status_code == 400
    db = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.id == donor_id).first()
        donor.last_donation_date = (datetime.date.today() - datetime.timedelta(days=400)).isoformat()
        db.commit()
    finally:
        db.close()
    assert client.get("/api/requests/feed", headers=h).status_code == 200  # any list call frees finished cool-downs
    db = SessionLocal()
    try:
        assert db.query(Donor).filter(Donor.id == donor_id).first().availability == "Available"
    finally:
        db.close()


def test_a_donor_can_only_have_one_response_per_request_in_the_database(client, make_user):
    import pytest
    from sqlalchemy.exc import IntegrityError
    from backend.app.database import SessionLocal
    from backend.app.models.blood_request import BloodRequest
    from backend.app.models.donor import Donor
    from backend.app.models.response import BloodRequestResponse
    make_user("unique-response@example.org")
    db = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.email == "unique-response@example.org").first()
        req = db.query(BloodRequest).first()
        db.add(BloodRequestResponse(id="res-unique-1", request_id=req.id, donor_id=donor.id, status="accepted"))
        db.commit()
        db.add(BloodRequestResponse(id="res-unique-2", request_id=req.id, donor_id=donor.id, status="accepted"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_lists_accept_limit_and_offset(client, make_user):
    _, requester = make_user("pager@example.org", role="requester")
    r = client.get("/api/donors?limit=2&offset=0", headers=requester)
    assert r.status_code == 200
    assert r.json()["count"] <= 2
    assert client.get("/api/donors?limit=0", headers=requester).status_code == 422


def test_new_centers_carry_no_invented_location_or_rating(client, admin_headers):
    r = client.post("/api/centers", headers=admin_headers, json={
        "name": "Plain Test Blood Bank", "address": "Test Road", "phone": "01711000222"})
    assert r.status_code == 201, r.text
    c = r.json()["center"]
    assert c["coordinates"]["lat"] is None and c["coordinates"]["lng"] is None
    assert c["rating"] == 0 and c["totalReviews"] == 0 and c["availableUnits"] == 0


def test_stats_count_every_registered_account_not_only_donor_profiles(client, make_user):
    before = client.get("/api/stats").json()["stats"]
    make_user("count-requester@example.org", role="requester")
    make_user("count-donor@example.org", role="donor")
    after = client.get("/api/stats").json()["stats"]
    assert after["registeredAccounts"] == before["registeredAccounts"] + 2
    assert after["requesterAccounts"] == before["requesterAccounts"] + 1
    assert after["totalDonors"] == before["totalDonors"] + 1
    assert after["verifiedDonors"] <= after["totalDonors"]
