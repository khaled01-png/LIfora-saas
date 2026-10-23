import os
import sys
import tempfile
from pathlib import Path

# Must be set BEFORE the app is imported.
_tmp = tempfile.mkdtemp(prefix="lifora-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["ENVIRONMENT"] = "development"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["ALLOW_DEMO_PASSWORDS"] = "false"
os.environ["RATE_LIMIT_ENABLED"] = "false"
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from backend.app.main import app
    with TestClient(app) as c:
        yield c


def _register(client, email, role="donor", blood="B+", name="Test User", password="StrongPass123",
              age=30, city="Sylhet", location="Zindabazar", radius=10, phone="+880 1711-000111"):
    """Full sign-up: register -> e-mail code -> verify -> onboarding (role + profile)."""
    r = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert r.status_code == 201, r.text
    code = r.json()["devCode"]  # only exposed in development when no SMTP server is configured
    v = client.post("/api/auth/verify-email", json={"email": email, "code": code})
    assert v.status_code == 200, v.text
    headers = {"Authorization": f"Bearer {v.json()['token']}"}
    o = client.post("/api/auth/onboarding", headers=headers, json={
        "role": role, "bloodGroup": blood, "age": age, "city": city, "location": location,
        "radiusKm": radius, "phone": phone})
    assert o.status_code == 200, o.text
    return o.json()["user"], headers


@pytest.fixture(scope="session")
def make_user(client):
    return lambda *a, **k: _register(client, *a, **k)


@pytest.fixture(scope="session")
def admin_headers(client):
    r = client.post("/api/auth/login", json={"email": "admin@lifora.org", "password": "LiforaAdmin2026!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
