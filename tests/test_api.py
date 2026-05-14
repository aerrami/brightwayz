"""
tests/test_api.py — integration tests for the Brightwayz API.

Run with:
    pytest tests/ -v

These tests use httpx.AsyncClient against a TestClient, with
Supabase calls mocked so no real DB is needed in CI.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import require_user

client = TestClient(app)

MOCK_JWT_PAYLOAD = {"sub": "user-123", "aud": "authenticated"}
MOCK_CLIENT = {"id": "client-abc", "first_name": "Jane", "last_name": "Doe", "org_id": "org-1"}
MOCK_ASSESSMENT = {"id": "intake-xyz", "status": "in_progress", "client_id": "client-abc"}
MOCK_REFERRAL = {"id": "ref-1", "status": "pending", "token": "tok123", "client_id": "client-abc"}
MOCK_RESOURCE = {"id": "res-1", "name": "City Shelter", "status": "open"}


def auth_header():
    """Fake bearer token — JWT verification is bypassed via dependency_overrides."""
    return {"Authorization": "Bearer fake-token"}


@pytest.fixture
def authed():
    app.dependency_overrides[require_user] = lambda: MOCK_JWT_PAYLOAD
    yield
    app.dependency_overrides.pop(require_user, None)


# ── Health ────────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Chatbot intake (public) ───────────────────────────────────────────────────

@patch("app.routers.intake.db_post", new_callable=AsyncMock)
@patch("app.core.config.get_settings")
def test_chatbot_intake(mock_settings, mock_post):
    mock_settings.return_value.default_org_id = "org-1"
    mock_post.side_effect = [
        {"id": "client-abc"},
        {"id": "case-abc"},
        {"id": "intake-xyz"},
    ]
    r = client.post("/auth/chatbot-intake", json={
        "firstName": "Jane",
        "lastName": "Doe",
        "phone": "555-1234",
        "zipCode": "94601",
        "language": "en",
        "supportTypes": ["Housing", "Food"],
        "orgId": "org-1",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "assessmentId" in data


def test_chatbot_intake_missing_org():
    with patch("app.core.config.get_settings") as mock_settings:
        mock_settings.return_value.default_org_id = ""
        r = client.post("/auth/chatbot-intake", json={"firstName": "Jane"})
    assert r.status_code == 400


# ── Resources (public) ────────────────────────────────────────────────────────

@patch("app.routers.resources.db_get", new_callable=AsyncMock)
def test_list_resources_public(mock_get):
    mock_get.return_value = [MOCK_RESOURCE]
    r = client.get("/auth/resources?status=open")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@patch("app.routers.resources.db_get_one", new_callable=AsyncMock)
def test_get_resource_public(mock_get):
    mock_get.return_value = MOCK_RESOURCE
    r = client.get("/auth/resources/res-1")
    assert r.status_code == 200
    assert r.json()["id"] == "res-1"


# ── Referral token flow (public) ─────────────────────────────────────────────

@patch("app.routers.referrals.db_get", new_callable=AsyncMock)
def test_get_referral_by_token(mock_get):
    mock_get.return_value = [{**MOCK_REFERRAL, "expires_at": "2099-01-01T00:00:00+00:00"}]
    r = client.get("/auth/referral/tok123")
    assert r.status_code == 200


@patch("app.routers.referrals.db_get", new_callable=AsyncMock)
@patch("app.routers.referrals.db_patch", new_callable=AsyncMock)
def test_accept_referral_by_token(mock_patch, mock_get):
    mock_get.return_value = [{"id": "ref-1", "status": "pending", "expires_at": "2099-01-01T00:00:00+00:00"}]
    mock_patch.return_value = {}
    r = client.post("/auth/accept-referral/tok123")
    assert r.status_code == 200
    assert r.json()["status"] == "accepted"


# ── Authenticated endpoints ───────────────────────────────────────────────────

@patch("app.routers.clients.db_get", new_callable=AsyncMock)
def test_list_clients(mock_get, authed):
    mock_get.return_value = [MOCK_CLIENT]
    r = client.get("/data/clients?org=org-1", headers=auth_header())
    assert r.status_code == 200


@patch("app.routers.clients.db_post", new_callable=AsyncMock)
def test_create_client(mock_post, authed):
    mock_post.return_value = MOCK_CLIENT
    r = client.post("/data/create-client", json={
        "firstName": "Jane", "lastName": "Doe",
        "orgId": "org-1", "phone": "555-0000",
    }, headers=auth_header())
    assert r.status_code == 200
    assert r.json()["client"]["id"] == "client-abc"


@patch("app.routers.intake.db_post", new_callable=AsyncMock)
def test_create_intake(mock_post, authed):
    mock_post.side_effect = [
        {"id": "client-abc"},
        {"id": "case-abc"},
        {"id": "intake-xyz"},
        {},
    ]
    r = client.post("/data/intake", json={
        "firstName": "Jane", "lastName": "Doe",
        "orgId": "org-1",
    }, headers=auth_header())
    assert r.status_code == 200
    data = r.json()
    assert data["clientId"] == "client-abc"
    assert data["assessmentId"] == "intake-xyz"


@patch("app.routers.intake.db_post", new_callable=AsyncMock)
@patch("app.routers.intake.db_patch", new_callable=AsyncMock)
def test_complete_intake(mock_patch, mock_post, authed):
    mock_patch.return_value = {}
    mock_post.return_value = {}
    r = client.post("/data/complete-intake/intake-xyz", json={
        "employmentStatus": "unemployed-looking",
        "housingStatus": "shelter",
        "supportTypes": ["Food assistance"],
        "source": "staff",
    }, headers=auth_header())
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


@patch("app.routers.referrals.db_post", new_callable=AsyncMock)
def test_create_referral(mock_post, authed):
    mock_post.return_value = MOCK_REFERRAL
    r = client.post("/data/create-referral", json={
        "clientId": "client-abc",
        "destinationOrgId": "org-2",
        "note": "Urgent housing need",
    }, headers=auth_header())
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


@patch("app.routers.orgs.db_get_one", new_callable=AsyncMock)
@patch("app.routers.orgs.db_get", new_callable=AsyncMock)
def test_get_dashboard(mock_get, mock_get_one, authed):
    mock_get_one.return_value = {"id": "org-1", "name": "Test Org"}
    mock_get.return_value = []
    r = client.get("/data/dashboard/org-1", headers=auth_header())
    assert r.status_code == 200
    assert "stats" in r.json()
