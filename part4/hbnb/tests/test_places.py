from tests.helpers import APITestCase


class TestPlaces(APITestCase):
    def test_create_place_requires_jwt(self):
        response = self.client.post(
            "/api/v1/places/",
            json={
                "title": "No Auth Place",
                "description": "Should fail",
                "price": 50,
                "latitude": 0,
                "longitude": 0,
                "owner_id": "ignored",
                "amenities": [],
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_create_place_success(self):
        owner_id, owner_payload = self.create_user("owner")
        token = self.login_user(owner_payload["email"], owner_payload["password"])
        amenity = self.create_amenity("Pool")

        response = self.client.post(
            "/api/v1/places/",
            json={
                "title": "Sea View",
                "description": "Great ocean view",
                "price": 200,
                "latitude": 35.2,
                "longitude": -10.4,
                "owner_id": "different-id-will-be-overwritten",
                "amenities": [amenity["id"]],
            },
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 201)
        place = response.get_json()
        self.assertIn("id", place)
        self.assertEqual(place["owner"]["id"], owner_id)

    def test_create_place_invalid_amenity_id(self):
        owner_id, owner_payload = self.create_user("badamenity")
        token = self.login_user(owner_payload["email"], owner_payload["password"])

        response = self.client.post(
            "/api/v1/places/",
            json={
                "title": "Broken",
                "description": "Invalid amenity id",
                "price": 75,
                "latitude": 30.0,
                "longitude": 40.0,
                "owner_id": "ignored",
                "amenities": ["unknown-amenity-id"],
            },
            headers=self.auth_header(token),
        )

        self.assertEqual(response.status_code, 400)

    def test_get_places_and_get_by_id(self):
        owner_id, owner_payload = self.create_user("getplace")
        token = self.login_user(owner_payload["email"], owner_payload["password"])
        place = self.create_place(token, title="List Me")

        list_response = self.client.get("/api/v1/places/")
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.get_json()), 1)

        by_id_response = self.client.get(f"/api/v1/places/{place['id']}")
        self.assertEqual(by_id_response.status_code, 200)
        self.assertEqual(by_id_response.get_json()["id"], place["id"])

    def test_update_place_forbidden_for_non_owner(self):
        owner_id, owner_payload = self.create_user("ownerx")
        other_id, other_payload = self.create_user("otherx")

        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        other_token = self.login_user(other_payload["email"], other_payload["password"])

        place = self.create_place(owner_token, title="Owner Place")

        response = self.client.put(
            f"/api/v1/places/{place['id']}",
            json={
                "title": "Try Update",
                "description": "Nope",
                "price": 99,
                "latitude": 1,
                "longitude": 2,
                "owner_id": owner_id,
                "amenities": [],
            },
            headers=self.auth_header(other_token),
        )

        self.assertEqual(response.status_code, 403)

    def test_update_place_success_for_owner(self):
        owner_id, owner_payload = self.create_user("ownerok")
        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        place = self.create_place(owner_token, title="Old Title")

        response = self.client.put(
            f"/api/v1/places/{place['id']}",
            json={
                "title": "New Title",
                "description": "Updated",
                "price": 222,
                "latitude": 12,
                "longitude": 13,
                "owner_id": owner_id,
                "amenities": [],
            },
            headers=self.auth_header(owner_token),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["title"], "New Title")

    def test_get_place_reviews_endpoint(self):
        owner_id, owner_payload = self.create_user("ownerreviews")
        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        place = self.create_place(owner_token)

        response = self.client.get(f"/api/v1/places/{place['id']}/reviews")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])
