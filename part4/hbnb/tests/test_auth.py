from tests.helpers import APITestCase


class TestAuth(APITestCase):
    def test_login_success_returns_token(self):
        user_id, payload = self.create_user("auth")

        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("access_token", data)
        self.assertTrue(data["access_token"])

    def test_login_wrong_password_returns_401(self):
        user_id, payload = self.create_user("authwrong")

        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": "bad-password"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json().get("Error"), "Invalid credentials")

    def test_login_unknown_email_returns_401(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "unknown@example.com", "password": "Secret123!"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json().get("Error"), "Invalid credentials")
