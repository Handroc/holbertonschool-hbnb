from tests.helpers import APITestCase


class TestReviews(APITestCase):
    def _setup_place_and_users(self):
        _, owner_payload = self.create_user("owner")
        _, reviewer_payload = self.create_user("reviewer")

        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        reviewer_token = self.login_user(reviewer_payload["email"], reviewer_payload["password"])

        place = self.create_place(owner_token, title="Review Target")
        return owner_token, reviewer_token, place

    def test_create_review_success(self):
        _, reviewer_token, place = self._setup_place_and_users()

        response = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "Amazing stay",
                "rating": 5,
                "user_id": "ignored-by-api",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )

        self.assertEqual(response.status_code, 201)
        review = response.get_json()
        self.assertIn("id", review)
        self.assertEqual(review["place_id"], place["id"])

    def test_create_review_cannot_review_own_place(self):
        owner_token, _, place = self._setup_place_and_users()

        response = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "My own place",
                "rating": 4,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(owner_token),
        )

        self.assertEqual(response.status_code, 400)

    def test_create_review_only_once_per_user_and_place(self):
        _, reviewer_token, place = self._setup_place_and_users()

        first = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "First",
                "rating": 4,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "Second",
                "rating": 5,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(second.status_code, 400)

    def test_create_review_place_not_found(self):
        _, reviewer_payload = self.create_user("reviewernf")
        reviewer_token = self.login_user(reviewer_payload["email"], reviewer_payload["password"])

        response = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "Ghost place",
                "rating": 3,
                "user_id": "ignored",
                "place_id": "missing-place",
            },
            headers=self.auth_header(reviewer_token),
        )

        self.assertEqual(response.status_code, 404)

    def test_get_reviews_and_get_review_by_id(self):
        _, reviewer_token, place = self._setup_place_and_users()

        create_resp = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "To read",
                "rating": 4,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        review = create_resp.get_json()

        list_resp = self.client.get("/api/v1/reviews/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertGreaterEqual(len(list_resp.get_json()), 1)

        get_resp = self.client.get(f"/api/v1/reviews/{review['id']}")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.get_json()["id"], review["id"])

    def test_update_review_forbidden_for_other_user(self):
        _, reviewer_token, place = self._setup_place_and_users()
        _, intruder_payload = self.create_user("intruder")
        intruder_token = self.login_user(intruder_payload["email"], intruder_payload["password"])

        create_resp = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "Original",
                "rating": 4,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        review = create_resp.get_json()

        response = self.client.put(
            f"/api/v1/reviews/{review['id']}",
            json={"text": "Hacked", "rating": 1},
            headers=self.auth_header(intruder_token),
        )

        self.assertEqual(response.status_code, 403)

    def test_update_and_delete_review_success(self):
        _, reviewer_token, place = self._setup_place_and_users()

        create_resp = self.client.post(
            "/api/v1/reviews/",
            json={
                "text": "Original",
                "rating": 4,
                "user_id": "ignored",
                "place_id": place["id"],
            },
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(create_resp.status_code, 201)
        review = create_resp.get_json()

        update_resp = self.client.put(
            f"/api/v1/reviews/{review['id']}",
            json={"text": "Updated", "rating": 5},
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.get_json()["text"], "Updated")

        delete_resp = self.client.delete(
            f"/api/v1/reviews/{review['id']}",
            headers=self.auth_header(reviewer_token),
        )
        self.assertEqual(delete_resp.status_code, 200)

        get_after_delete = self.client.get(f"/api/v1/reviews/{review['id']}")
        self.assertEqual(get_after_delete.status_code, 404)
