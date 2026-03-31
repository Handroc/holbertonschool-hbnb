import uuid

from tests.helpers import APITestCase


class TestPayloadValidation(APITestCase):
    def test_users_missing_required_fields(self):
        response = self.client.post(
            "/api/v1/users/",
            json={"first_name": "A", "last_name": "B", "email": "a@b.com"},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response.status_code, 400)

    def test_auth_missing_password_returns_400(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "someone@example.com"},
        )
        self.assertEqual(response.status_code, 400)

    def test_places_missing_fields_returns_400(self):
        user_id, payload = self.create_user("missplace")
        token = self.login_user(payload["email"], payload["password"])

        response = self.client.post(
            "/api/v1/places/",
            json={"title": "Only title"},
            headers=self.auth_header(token),
        )
        self.assertEqual(response.status_code, 400)

    def test_reviews_missing_fields_returns_400(self):
        user_id, payload = self.create_user("missreview")
        token = self.login_user(payload["email"], payload["password"])

        response = self.client.post(
            "/api/v1/reviews/",
            json={"text": "No rating/place_id"},
            headers=self.auth_header(token),
        )
        self.assertEqual(response.status_code, 400)


class TestBoundaryAndTypeValidation(APITestCase):
    def test_user_name_length_boundary(self):
        payload = {
            "first_name": "A" * 51,
            "last_name": "Last",
            "email": f"long_{uuid.uuid4().hex[:8]}@example.com",
            "password": "Secret123!",
        }
        response = self.client.post(
            "/api/v1/users/",
            json=payload,
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(response.status_code, 400)

    def test_place_latitude_longitude_boundaries(self):
        user_id, payload = self.create_user("coords")
        token = self.login_user(payload["email"], payload["password"])

        valid = self.client.post(
            "/api/v1/places/",
            json={
                "title": "Boundary OK",
                "description": "Edges",
                "price": 100,
                "latitude": 90,
                "longitude": -180,
                "owner_id": "ignored",
                "amenities": [],
            },
            headers=self.auth_header(token),
        )
        self.assertEqual(valid.status_code, 201)

        invalid = self.client.post(
            "/api/v1/places/",
            json={
                "title": "Boundary Bad",
                "description": "Outside range",
                "price": 100,
                "latitude": 90.1,
                "longitude": 0,
                "owner_id": "ignored",
                "amenities": [],
            },
            headers=self.auth_header(token),
        )
        self.assertEqual(invalid.status_code, 400)

    def test_review_rating_boundaries(self):
        owner_id, owner_payload = self.create_user("ownerb")
        reviewer_id, reviewer_payload = self.create_user("reviewerb")

        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        reviewer_token = self.login_user(reviewer_payload["email"], reviewer_payload["password"])

        place = self.create_place(owner_token, title="Boundary Place")

        ok = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "min valid",
                "rating": 1,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(ok.status_code, 201)

        bad_user_id, bad_payload = self.create_user("reviewerbad")
        bad_token = self.login_user(bad_payload["email"], bad_payload["password"])
        bad = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "too high",
                "rating": 6,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(bad_token),
        )
        self.assertEqual(bad.status_code, 400)

    def test_invalid_data_types(self):
        user_bad_type = self.client.post(
            "/api/v1/users/",
            json={
                "first_name": 123,
                "last_name": "Type",
                "email": f"type_{uuid.uuid4().hex[:8]}@example.com",
                "password": "Secret123!",
            },
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(user_bad_type.status_code, 400)

        amenity_bad_type = self.client.post(
            "/api/v1/amenities/",
            json={"name": 99},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(amenity_bad_type.status_code, 400)

        owner_id, payload = self.create_user("placetype")
        token = self.login_user(payload["email"], payload["password"])
        place_bad_type = self.client.post(
            "/api/v1/places/",
            json={
                "title": "Type Fail",
                "description": "Bad price",
                "price": "one hundred",
                "latitude": 10,
                "longitude": 20,
                "owner_id": "ignored",
                "amenities": [],
            },
            headers=self.auth_header(token),
        )
        self.assertEqual(place_bad_type.status_code, 400)
