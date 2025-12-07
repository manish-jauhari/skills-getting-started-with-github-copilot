import copy
import pytest
from fastapi.testclient import TestClient

import src.app as app_module


ORIGINAL = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Restore the in-memory activities before each test for isolation
    app_module.activities = copy.deepcopy(ORIGINAL)
    yield


@pytest.fixture
def client():
    with TestClient(app_module.app) as c:
        yield c


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_reflect(client):
    activity = "Chess Club"
    email = "testuser@example.com"
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant now present
    resp2 = client.get("/activities")
    participants = resp2.json()[activity]["participants"]
    assert email in participants


def test_signup_duplicate_returns_400(client):
    activity = "Chess Club"
    email = "duplicate@example.com"
    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400


def test_signup_activity_not_found(client):
    r = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert r.status_code == 404


def test_unregister_participant(client):
    activity = "Programming Class"
    email = "newstudent@example.com"
    # sign up first
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200

    # unregister
    r2 = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert r2.status_code == 200
    assert "Unregistered" in r2.json().get("message", "")

    # verify removed
    resp = client.get("/activities")
    assert email not in resp.json()[activity]["participants"]


def test_unregister_nonexistent_returns_404(client):
    activity = "Programming Class"
    r = client.delete(f"/activities/{activity}/unregister?email=notfound@example.com")
    assert r.status_code == 404
