from tests.helpers import APITestCase


class TestBookings(APITestCase):
    def _setup_booking_context(self):
        owner_id, owner_payload = self.create_user("booking_owner")
        guest_id, guest_payload = self.create_user("booking_guest")
        outsider_id, outsider_payload = self.create_user("booking_outsider")

        owner_token = self.login_user(owner_payload["email"], owner_payload["password"])
        guest_token = self.login_user(guest_payload["email"], guest_payload["password"])
        outsider_token = self.login_user(
            outsider_payload["email"], outsider_payload["password"]
        )

        place = self.create_place(owner_token, title="Booked Place")
        return {
            "owner_id": owner_id,
            "guest_id": guest_id,
            "outsider_id": outsider_id,
            "owner_token": owner_token,
            "guest_token": guest_token,
            "outsider_token": outsider_token,
            "place": place,
        }

    def test_create_booking_success_and_list_scope(self):
        ctx = self._setup_booking_context()

        create_response = self.client.post(
            "/api/v1/bookings/",
            json={
                "place_id": ctx["place"]["id"],
                "check_in": "2025-01-10",
                "check_out": "2025-01-12",
            },
            headers=self.auth_header(ctx["guest_token"]),
        )

        self.assertEqual(create_response.status_code, 201)
        booking = create_response.get_json()
        self.assertEqual(booking["user"]["id"], ctx["guest_id"])
        self.assertEqual(booking["status"], "pending")

        guest_list = self.client.get(
            "/api/v1/bookings/",
            headers=self.auth_header(ctx["guest_token"]),
        )
        self.assertEqual(guest_list.status_code, 200)
        self.assertEqual(len(guest_list.get_json()), 1)

        owner_list = self.client.get(
            "/api/v1/bookings/",
            headers=self.auth_header(ctx["owner_token"]),
        )
        self.assertEqual(owner_list.status_code, 200)
        self.assertEqual(owner_list.get_json(), [])

        admin_list = self.client.get(
            "/api/v1/bookings/",
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(admin_list.status_code, 200)
        self.assertTrue(
            any(item["id"] == booking["id"] for item in admin_list.get_json())
        )

    def test_booking_detail_forbidden_for_unrelated_user(self):
        ctx = self._setup_booking_context()

        create_response = self.client.post(
            "/api/v1/bookings/",
            json={
                "place_id": ctx["place"]["id"],
                "check_in": "2025-02-01",
                "check_out": "2025-02-03",
            },
            headers=self.auth_header(ctx["guest_token"]),
        )
        self.assertEqual(create_response.status_code, 201)
        booking_id = create_response.get_json()["id"]

        forbidden = self.client.get(
            f"/api/v1/bookings/{booking_id}",
            headers=self.auth_header(ctx["outsider_token"]),
        )
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(forbidden.get_json().get("Error"), "Unauthorized action")

        owner_allowed = self.client.get(
            f"/api/v1/bookings/{booking_id}",
            headers=self.auth_header(ctx["owner_token"]),
        )
        self.assertEqual(owner_allowed.status_code, 200)

    def test_place_owner_can_only_update_status(self):
        ctx = self._setup_booking_context()

        create_response = self.client.post(
            "/api/v1/bookings/",
            json={
                "place_id": ctx["place"]["id"],
                "check_in": "2025-03-01",
                "check_out": "2025-03-05",
            },
            headers=self.auth_header(ctx["guest_token"]),
        )
        self.assertEqual(create_response.status_code, 201)
        booking_id = create_response.get_json()["id"]

        owner_update = self.client.put(
            f"/api/v1/bookings/{booking_id}",
            json={"check_in": "2025-03-10", "status": "confirmed"},
            headers=self.auth_header(ctx["owner_token"]),
        )
        self.assertEqual(owner_update.status_code, 200)

        updated = owner_update.get_json()
        self.assertEqual(updated["status"], "confirmed")
        self.assertEqual(updated["check_in"], "2025-03-01")
        self.assertEqual(updated["check_out"], "2025-03-05")

    def test_delete_booking_requires_admin(self):
        ctx = self._setup_booking_context()

        create_response = self.client.post(
            "/api/v1/bookings/",
            json={
                "place_id": ctx["place"]["id"],
                "check_in": "2025-04-01",
                "check_out": "2025-04-02",
            },
            headers=self.auth_header(ctx["guest_token"]),
        )
        self.assertEqual(create_response.status_code, 201)
        booking_id = create_response.get_json()["id"]

        forbidden = self.client.delete(
            f"/api/v1/bookings/{booking_id}",
            headers=self.auth_header(ctx["guest_token"]),
        )
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(forbidden.get_json().get("Error"), "Admin access required")

        deleted = self.client.delete(
            f"/api/v1/bookings/{booking_id}",
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(deleted.status_code, 200)

        not_found = self.client.get(
            f"/api/v1/bookings/{booking_id}",
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(not_found.status_code, 404)
