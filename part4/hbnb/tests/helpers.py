import os
import tempfile
import uuid
import unittest

from app import create_app, db
from config import Config


ADMIN_EMAIL = "admin@hbnb.io"
ADMIN_PASSWORD = "admin1234"


class APITestCase(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        class TestConfig(Config):
            TESTING = True
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{self.db_path}"
            SQLALCHEMY_TRACK_MODIFICATIONS = False

        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()
        from app.models.user import User

        admin = User.query.filter_by(email=ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                first_name="Admin",
                last_name="HBnB",
                email=ADMIN_EMAIL,
                password=ADMIN_PASSWORD,
                is_admin=True,
            )
            db.session.add(admin)
            db.session.commit()

        self.client = self.app.test_client()
        self.admin_token = self.login_user(ADMIN_EMAIL, ADMIN_PASSWORD)

    def tearDown(self):
        db.session.remove()
        self.app_context.pop()
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def make_user_payload(self, prefix="user"):
        token = uuid.uuid4().hex[:8]
        return {
            "first_name": f"{prefix}_first_{token}",
            "last_name": f"{prefix}_last_{token}",
            "email": f"{prefix}_{token}@example.com",
            "password": "Secret123!",
        }

    def create_user(self, prefix="user"):
        payload = self.make_user_payload(prefix)
        response = self.client.post(
            "/api/v1/users/",
            json=payload,
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        data = response.get_json()
        return data["id"], payload

    def login_user(self, email, password):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        token = response.get_json().get("access_token")
        self.assertIsNotNone(token)
        return token

    def auth_header(self, token):
        return {"Authorization": f"Bearer {token}"}

    def create_amenity(self, name="WiFi"):
        response = self.client.post(
            "/api/v1/amenities/",
            json={"name": name},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        return response.get_json()

    def create_place(self, owner_token, title="Beach House", amenities=None):
        if amenities is None:
            amenities = []
        payload = {
            "title": title,
            "description": "A beautiful spot",
            "price": 150,
            "latitude": 10.5,
            "longitude": 20.25,
            "owner_id": "ignored-by-api",
            "amenities": amenities,
        }
        response = self.client.post(
            "/api/v1/places/",
            json=payload,
            headers=self.auth_header(owner_token),
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        return response.get_json()
