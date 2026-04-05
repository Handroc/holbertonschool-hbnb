from tests.helpers import APITestCase


class TestWishlist(APITestCase):
    def _setup_user_and_place(self):
        _, owner_payload = self.create_user("wishlist_owner")
        _, user_payload = self.create_user("wishlist_user")

        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        user_token = self.login_user(user_payload["email"], user_payload["password"])

        place = self.create_place(owner_token, title="Wishlist Place")
        return user_token, place

    def test_add_get_ids_and_remove_wishlist_item(self):
        user_token, place = self._setup_user_and_place()

        first_add = self.client.post(
            "/api/v1/wishlist/",
            json={"place_id": place["id"]},
            headers=self.auth_header(user_token),
        )
        self.assertEqual(first_add.status_code, 201)

        second_add = self.client.post(
            "/api/v1/wishlist/",
            json={"place_id": place["id"]},
            headers=self.auth_header(user_token),
        )
        self.assertEqual(second_add.status_code, 201)

        ids_response = self.client.get(
            "/api/v1/wishlist/ids",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(ids_response.status_code, 200)
        self.assertEqual(ids_response.get_json(), [place["id"]])

        list_response = self.client.get(
            "/api/v1/wishlist/",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([item["id"] for item in list_response.get_json()], [place["id"]])

        remove_response = self.client.delete(
            f"/api/v1/wishlist/{place['id']}",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(remove_response.status_code, 200)

        ids_after_remove = self.client.get(
            "/api/v1/wishlist/ids",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(ids_after_remove.status_code, 200)
        self.assertEqual(ids_after_remove.get_json(), [])

    def test_add_to_wishlist_validates_payload_and_place(self):
        user_token, _ = self._setup_user_and_place()

        missing_place_id = self.client.post(
            "/api/v1/wishlist/",
            json={},
            headers=self.auth_header(user_token),
        )
        self.assertEqual(missing_place_id.status_code, 400)
        self.assertEqual(missing_place_id.get_json().get("Error"), "place_id is required")

        unknown_place = self.client.post(
            "/api/v1/wishlist/",
            json={"place_id": "not-a-real-place"},
            headers=self.auth_header(user_token),
        )
        self.assertEqual(unknown_place.status_code, 404)
        self.assertEqual(unknown_place.get_json().get("Error"), "Place not found")

    def test_remove_missing_wishlist_item_returns_404(self):
        user_token, _ = self._setup_user_and_place()

        response = self.client.delete(
            "/api/v1/wishlist/not-in-list",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(response.status_code, 404)
