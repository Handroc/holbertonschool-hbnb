from app.services import facade
from tests.helpers import APITestCase


class TestUsers(APITestCase):
    def test_create_user_success(self):
        payload = self.make_user_payload("newuser")
        response = self.client.post(
            "/api/v1/users/",
            json=payload,
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn("id", data)
        self.assertEqual(data.get("message"), "User successfully created")

    def test_create_user_duplicate_email_fails(self):
        payload = self.make_user_payload("dup")
        response1 = self.client.post(
            "/api/v1/users/",
            json=payload,
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response1.status_code, 201)

        response2 = self.client.post(
            "/api/v1/users/",
            json=payload,
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response2.status_code, 400)

    def test_get_users_list_excludes_password(self):
        self.create_user("list1")
        self.create_user("list2")

        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, 200)

        users = response.get_json()
        self.assertGreaterEqual(len(users), 2)
        for user in users:
            self.assertNotIn("password", user)

    def test_get_user_by_id(self):
        user_id, payload = self.create_user("getid")

        response = self.client.get(f"/api/v1/users/{user_id}")

        self.assertEqual(response.status_code, 200)
        user = response.get_json()
        self.assertEqual(user["id"], user_id)
        self.assertEqual(user["email"], payload["email"])
        self.assertNotIn("password", user)

    def test_get_user_by_email(self):
        user_id, payload = self.create_user("getemail")

        response = self.client.get(f"/api/v1/users/email/{payload['email']}")

        self.assertEqual(response.status_code, 200)
        user = response.get_json()
        self.assertEqual(user["id"], user_id)
        self.assertEqual(user["email"], payload["email"])
        self.assertNotIn("password", user)

    def test_login_normalizes_email_input(self):
        user_id, payload = self.create_user("mixedcase")

        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": f"  {payload['email'].upper()}  ", "password": payload["password"]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.get_json())

    def test_update_user_requires_jwt(self):
        user_id, payload = self.create_user("needjwt")

        response = self.client.put(
            f"/api/v1/users/{user_id}",
            json={"first_name": "Updated"},
        )

        self.assertEqual(response.status_code, 401)

    def test_update_user_forbidden_for_other_user(self):
        user1_id, user1_payload = self.create_user("user1")
        user2_id, user2_payload = self.create_user("user2")
        token_user1 = self.login_user(user1_payload["email"], user1_payload["password"])

        response = self.client.put(
            f"/api/v1/users/{user2_id}",
            json={"first_name": "ShouldFail"},
            headers=self.auth_header(token_user1),
        )

        self.assertEqual(response.status_code, 403)

    def test_update_user_cannot_modify_email_or_password(self):
        user_id, payload = self.create_user("cantchange")
        token = self.login_user(payload["email"], payload["password"])

        response = self.client.put(
            f"/api/v1/users/{user_id}",
            json={"email": "new@example.com"},
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 400)

    def test_update_user_success(self):
        user_id, payload = self.create_user("updateself")
        token = self.login_user(payload["email"], payload["password"])

        response = self.client.put(
            f"/api/v1/users/{user_id}",
            json={"first_name": "Updated", "last_name": "Name"},
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 200)
        user = response.get_json()
        self.assertEqual(user["first_name"], "Updated")
        self.assertEqual(user["last_name"], "Name")

    def test_admin_update_user_hashes_password(self):
        user_id, payload = self.create_user("adminreset")

        response = self.client.put(
            f"/api/v1/users/{user_id}",
            json={"password": "NewSecret123!"},
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 200)

        old_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
        )
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": "NewSecret123!"},
        )
        self.assertEqual(new_login.status_code, 200)

    def test_admin_update_user_cannot_change_is_admin(self):
        user_id, payload = self.create_user("adminflag")

        response = self.client.put(
            f"/api/v1/users/{user_id}",
            json={"is_admin": True, "first_name": "StillUser"},
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["first_name"], "StillUser")
        self.assertFalse(facade.get_user(user_id).is_admin)
