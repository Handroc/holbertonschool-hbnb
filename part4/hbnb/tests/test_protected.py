from app.services import facade
from tests.helpers import APITestCase


class TestProtectedEndpoint(APITestCase):
    def test_protected_requires_jwt(self):
        response = self.client.get("/api/v1/protected/protected")
        self.assertEqual(response.status_code, 401)

    def test_protected_returns_user_message(self):
        user_id, payload = self.create_user("normal")
        token = self.login_user(payload["email"], payload["password"])

        response = self.client.get(
            "/api/v1/protected/protected",
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json().get("message"), f"Hello, user {user_id}")

    def test_protected_returns_admin_message(self):
        user_id, payload = self.create_user("admin")
        user = facade.get_user(user_id)
        user.is_admin = True

        token = self.login_user(payload["email"], payload["password"])

        response = self.client.get(
            "/api/v1/protected/protected",
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json().get("message"), f"Hello, admin {user_id}")
