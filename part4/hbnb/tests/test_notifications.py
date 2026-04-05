from app.services import facade
from tests.helpers import APITestCase


class TestNotifications(APITestCase):
    def _setup_user_with_token(self, prefix):
        user_id, payload = self.create_user(prefix)
        token = self.login_user(payload["email"], payload["password"])
        return user_id, token

    def test_list_unread_mark_read_and_delete_notifications(self):
        user_id, user_token = self._setup_user_with_token("notif_user")

        notif_a = facade.create_notification(user_id, "booking", "Booking requested")
        notif_b = facade.create_notification(user_id, "review", "New review posted")

        list_response = self.client.get(
            "/api/v1/notifications/",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.get_json()), 2)

        unread_before = self.client.get(
            "/api/v1/notifications/unread-count",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(unread_before.status_code, 200)
        self.assertEqual(unread_before.get_json().get("count"), 2)

        mark_read = self.client.put(
            f"/api/v1/notifications/{notif_a.id}/read",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(mark_read.status_code, 200)

        unread_after_read = self.client.get(
            "/api/v1/notifications/unread-count",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(unread_after_read.status_code, 200)
        self.assertEqual(unread_after_read.get_json().get("count"), 1)

        delete_response = self.client.delete(
            f"/api/v1/notifications/{notif_b.id}",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(delete_response.status_code, 200)

        final_list = self.client.get(
            "/api/v1/notifications/",
            headers=self.auth_header(user_token),
        )
        self.assertEqual(final_list.status_code, 200)
        self.assertEqual([item["id"] for item in final_list.get_json()], [notif_a.id])

    def test_notification_permission_and_not_found_paths(self):
        owner_id, owner_token = self._setup_user_with_token("notif_owner")
        _, other_token = self._setup_user_with_token("notif_other")

        notif = facade.create_notification(owner_id, "booking", "Private notification")

        forbidden_read = self.client.put(
            f"/api/v1/notifications/{notif.id}/read",
            headers=self.auth_header(other_token),
        )
        self.assertEqual(forbidden_read.status_code, 403)

        forbidden_delete = self.client.delete(
            f"/api/v1/notifications/{notif.id}",
            headers=self.auth_header(other_token),
        )
        self.assertEqual(forbidden_delete.status_code, 403)

        not_found = self.client.put(
            "/api/v1/notifications/not-existing-id/read",
            headers=self.auth_header(owner_token),
        )
        self.assertEqual(not_found.status_code, 404)
