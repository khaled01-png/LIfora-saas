"""Tests for the launch-day changes: compatibility feed, share link, 'I donated', automatic confirmation,
verified donors, safer sign-up, ended sessions after a password reset, and the admin overview."""
import datetime

from backend.app.database import SessionLocal


def _req_payload(**kw):
    p = {"patientName": "Test Patient", "bloodGroup": "B+", "unitsNeeded": 1,
         "hospitalName": "Test Hospital", "city": "Sylhet", "urgency": "Urgent",
         "deadline": "Within 4 hours", "reason": "Synthetic test", "contactPerson": "Tester",
         "contactPhone": "+880 1700-111222"}
    p.update(kw)
    return p


def _accepted_request(client, make_user, tag, units=1):
    """A requester posts a B+ request and an O- donor accepts it. Returns (request id, response id, requester headers, donor headers)."""
    _, hr = make_user(f"{tag}-req@example.org", role="requester", blood="B+", name="Launch Requester")
    _, hd = make_user(f"{tag}-don@example.org", role="donor", blood="O-", name="Launch Donor")
    rid = client.post("/api/requests", json=_req_payload(unitsNeeded=units, patientName=f"Launch Patient {tag}"), headers=hr).json()["request"]["id"]
    assert client.post(f"/api/requests/{rid}/respond", json={}, headers=hd).status_code == 200
    resp_id = client.get(f"/api/requests/{rid}/responses", headers=hr).json()["responses"][0]["id"]
    return rid, resp_id, hr, hd


def test_a_donor_only_sees_requests_their_blood_group_can_give_to(client, make_user):
    _, hr = make_user("compat-req@example.org", role="requester", blood="B+", name="Compat Requester")
    _, h_ok = make_user("compat-ok@example.org", role="donor", blood="O+", name="Compat Okay")
    _, h_bad = make_user("compat-bad@example.org", role="donor", blood="A+", name="Compat Mismatch")
    rid = client.post("/api/requests", json=_req_payload(bloodGroup="B+"), headers=hr).json()["request"]["id"]
    assert any(x["id"] == rid for x in client.get("/api/requests", headers=h_ok).json()["requests"])
    assert not any(x["id"] == rid for x in client.get("/api/requests", headers=h_bad).json()["requests"])


def test_shared_request_link_shows_only_the_basics_without_login(client, make_user):
    _, hr = make_user("share-req@example.org", role="requester", blood="B+", name="Share Requester")
    rid = client.post("/api/requests", json=_req_payload(patientName="Private Patient", reason="Private reason"), headers=hr).json()["request"]["id"]
    r = client.get(f"/api/requests/shared/{rid}")  # no Authorization header
    assert r.status_code == 200, r.text
    body = r.json()["request"]
    assert body["bloodGroup"] == "B+" and body["isOpen"] is True
    for private in ("patientName", "contactPhone", "contactPerson", "reason", "userId"):
        assert private not in body
    assert "Private Patient" not in r.text and "1700-111222" not in r.text
    assert client.get("/api/requests/shared/req-doesnotexist").status_code == 404


def test_donor_says_donated_then_requester_confirms_and_it_counts_once(client, make_user):
    rid, resp_id, hr, hd = _accepted_request(client, make_user, "claim", units=2)
    claimed = client.post(f"/api/requests/{rid}/donated", headers=hd)
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["request"]["displayStatus"] == "Awaiting confirmation"
    assert client.post(f"/api/requests/{rid}/donated", headers=hd).status_code == 409           # only once
    assert client.post(f"/api/requests/{rid}/donated", headers=hr).status_code == 403           # requesters cannot
    assert client.get("/api/auth/me", headers=hd).json()["user"]["totalDonations"] == 0          # not counted yet
    done = client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": resp_id, "units": 2}, headers=hr)
    assert done.status_code == 200, done.text
    assert client.get("/api/auth/me", headers=hd).json()["user"]["totalDonations"] == 1          # two units = ONE donation


def test_unanswered_claim_is_confirmed_automatically_after_24_hours(client, make_user):
    from backend.app.models.response import BloodRequestResponse
    from backend.app.services.request_service import run_maintenance
    rid, resp_id, hr, hd = _accepted_request(client, make_user, "auto")
    assert client.post(f"/api/requests/{rid}/donated", headers=hd).status_code == 200
    db = SessionLocal()
    try:
        run_maintenance(db)  # too early: still waiting
        assert client.get(f"/api/requests/{rid}", headers=hr).json()["request"]["status"] != "Fulfilled"
        resp = db.query(BloodRequestResponse).filter(BloodRequestResponse.id == resp_id).first()
        resp.donor_claimed_at = datetime.datetime.utcnow() - datetime.timedelta(hours=25)
        db.commit()
        run_maintenance(db)
    finally:
        db.close()
    assert client.get(f"/api/requests/{rid}", headers=hr).json()["request"]["status"] == "Fulfilled"
    assert client.get("/api/auth/me", headers=hd).json()["user"]["totalDonations"] == 1


def test_donor_needs_five_donations_before_an_admin_can_verify(client, make_user, admin_headers):
    from backend.app.models.donor import Donor
    _, hr = make_user("ver-req@example.org", role="requester", blood="B+", name="Verify Requester")
    make_user("ver-don@example.org", role="donor", blood="O+", name="Verify Candidate")
    donor_id = client.get("/api/donors", params={"q": "Verify Candidate"}, headers=hr).json()["donors"][0]["id"]
    refused = client.put(f"/api/donors/{donor_id}/verify", params={"verified": "true"}, headers=admin_headers)
    assert refused.status_code == 400 and "5" in refused.json()["detail"]
    db = SessionLocal()
    try:
        db.query(Donor).filter(Donor.id == donor_id).update({"total_donations": 5})
        db.commit()
    finally:
        db.close()
    ok = client.put(f"/api/donors/{donor_id}/verify", params={"verified": "true"}, headers=admin_headers)
    assert ok.status_code == 200 and ok.json()["donor"]["verified"] is True


def test_public_verified_donor_list_has_no_contact_details(client):
    r = client.get("/api/donors/verified")
    assert r.status_code == 200
    for d in r.json()["donors"]:
        assert "phone" not in d and "email" not in d
        assert d["verified"] is True


def test_signing_up_again_cannot_take_over_an_unverified_address(client):
    from backend.app.models.user import User
    from backend.app.auth.security import verify_password
    email = "pending-pw@example.org"
    reg = {"name": "Pending Person", "email": email}
    assert client.post("/api/auth/register", json={**reg, "password": "FirstPass123"}).status_code == 201
    # a second try straight away changes nothing
    quick = client.post("/api/auth/register", json={**reg, "password": "SneakyPass123"})
    assert quick.status_code == 201 and "devCode" not in quick.json()
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        assert verify_password("FirstPass123", u.hashed_password)
        u.verification_sent_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
        db.commit()
    finally:
        db.close()
    again = client.post("/api/auth/register", json={**reg, "password": "SecondPass123"})
    assert again.status_code == 201
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        assert verify_password("FirstPass123", u.hashed_password)  # still the old one until the code is entered
    finally:
        db.close()
    v = client.post("/api/auth/verify-email", json={"email": email, "code": again.json()["devCode"]})
    assert v.status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "SecondPass123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "FirstPass123"}).status_code == 401


def test_a_password_reset_ends_older_sessions(client, make_user):
    from backend.app.models.user import User
    from backend.app.auth.security import create_reset_token
    user, h = make_user("session-end@example.org", role="requester", blood="B+", name="Session Person")
    assert client.get("/api/auth/me", headers=h).status_code == 200
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == user["id"]).first()
        token = create_reset_token(u.id, u.hashed_password)
    finally:
        db.close()
    assert client.post("/api/auth/reset-password", json={"token": token, "newPassword": "BrandNewPass456"}).status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401
    assert client.post("/api/auth/login", json={"email": "session-end@example.org", "password": "BrandNewPass456"}).status_code == 200


def test_admin_overview_is_admin_only_and_never_shows_passwords(client, make_user, admin_headers):
    _, hd = make_user("adm-don@example.org", role="donor", blood="O+", name="Admin Look")
    for path in ("/api/admin/users", "/api/admin/requests", "/api/admin/donations", "/api/admin/activity"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=hd).status_code == 403
        assert client.get(path, headers=admin_headers).status_code == 200
    users = client.get("/api/admin/users", params={"q": "adm-don@example.org"}, headers=admin_headers).json()
    assert users["total"] == 1 and users["users"][0]["email"] == "adm-don@example.org"
    assert "password" not in client.get("/api/admin/users", headers=admin_headers).text.lower()
    events = {a["event"] for a in client.get("/api/admin/activity", params={"limit": 300}, headers=admin_headers).json()["activity"]}
    assert {"signup_started", "email_verified", "profile_completed"} <= events


def test_admin_can_cancel_a_wrong_donation_and_the_count_goes_back(client, make_user, admin_headers):
    rid, resp_id, hr, hd = _accepted_request(client, make_user, "cancel")
    assert client.post(f"/api/requests/{rid}/confirm-donation", json={"responseId": resp_id}, headers=hr).status_code == 200
    assert client.get("/api/auth/me", headers=hd).json()["user"]["totalDonations"] == 1
    donations = client.get("/api/admin/donations", params={"limit": 200}, headers=admin_headers).json()["donations"]
    record = [d for d in donations if d["requestId"] == rid][0]
    assert client.post(f"/api/admin/donations/{record['id']}/cancel", headers=hd).status_code == 403
    assert client.post(f"/api/admin/donations/{record['id']}/cancel", headers=admin_headers).status_code == 200
    assert client.post(f"/api/admin/donations/{record['id']}/cancel", headers=admin_headers).status_code == 400  # only once
    assert client.get("/api/auth/me", headers=hd).json()["user"]["totalDonations"] == 0
