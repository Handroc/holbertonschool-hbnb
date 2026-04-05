from tests.helpers import APITestCase


class TestMessages(APITestCase):
    def _setup_users(self):
        sender_id, sender_payload = self.create_user("msg_sender")
        recipient_id, recipient_payload = self.create_user("msg_recipient")
        _, outsider_payload = self.create_user("msg_outsider")

        sender_token = self.login_user(sender_payload["email"], sender_payload["password"])
        recipient_token = self.login_user(
            recipient_payload["email"], recipient_payload["password"]
        )
        outsider_token = self.login_user(
            outsider_payload["email"], outsider_payload["password"]
        )

        return {
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "sender_token": sender_token,
            "recipient_token": recipient_token,
            "outsider_token": outsider_token,
        }

    def test_send_and_retrieve_message_flow(self):
        ctx = self._setup_users()

        send_response = self.client.post(
            "/api/v1/messages/",
            json={"recipient_id": ctx["recipient_id"], "body": "Hello there"},
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(send_response.status_code, 201)
        message_id = send_response.get_json()["id"]

        inbox = self.client.get(
            "/api/v1/messages/inbox",
            headers=self.auth_header(ctx["recipient_token"]),
        )
        self.assertEqual(inbox.status_code, 200)
        self.assertEqual([item["id"] for item in inbox.get_json()], [message_id])

        sent = self.client.get(
            "/api/v1/messages/sent",
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(sent.status_code, 200)
        self.assertEqual([item["id"] for item in sent.get_json()], [message_id])

        conversation = self.client.get(
            f"/api/v1/messages/conversation/{ctx['recipient_id']}",
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(conversation.status_code, 200)
        self.assertEqual([item["id"] for item in conversation.get_json()], [message_id])

        unread_before = self.client.get(
            "/api/v1/messages/unread-count",
            headers=self.auth_header(ctx["recipient_token"]),
        )
        self.assertEqual(unread_before.status_code, 200)
        self.assertEqual(unread_before.get_json().get("count"), 1)

        mark_read = self.client.put(
            f"/api/v1/messages/{message_id}/read",
            headers=self.auth_header(ctx["recipient_token"]),
        )
        self.assertEqual(mark_read.status_code, 200)

        unread_after = self.client.get(
            "/api/v1/messages/unread-count",
            headers=self.auth_header(ctx["recipient_token"]),
        )
        self.assertEqual(unread_after.status_code, 200)
        self.assertEqual(unread_after.get_json().get("count"), 0)

    def test_message_validation_and_permissions(self):
        ctx = self._setup_users()

        missing_recipient = self.client.post(
            "/api/v1/messages/",
            json={"body": "No recipient"},
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(missing_recipient.status_code, 400)

        blank_body = self.client.post(
            "/api/v1/messages/",
            json={"recipient_id": ctx["recipient_id"], "body": "   "},
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(blank_body.status_code, 400)

        self_message = self.client.post(
            "/api/v1/messages/",
            json={"recipient_id": ctx["sender_id"], "body": "Self message"},
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(self_message.status_code, 400)
        self.assertEqual(self_message.get_json().get("Error"), "Cannot message yourself")

        send_response = self.client.post(
            "/api/v1/messages/",
            json={"recipient_id": ctx["recipient_id"], "body": "Protected message"},
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(send_response.status_code, 201)
        message_id = send_response.get_json()["id"]

        outsider_read = self.client.put(
            f"/api/v1/messages/{message_id}/read",
            headers=self.auth_header(ctx["outsider_token"]),
        )
        self.assertEqual(outsider_read.status_code, 403)

        outsider_delete = self.client.delete(
            f"/api/v1/messages/{message_id}",
            headers=self.auth_header(ctx["outsider_token"]),
        )
        self.assertEqual(outsider_delete.status_code, 403)

        sender_delete = self.client.delete(
            f"/api/v1/messages/{message_id}",
            headers=self.auth_header(ctx["sender_token"]),
        )
        self.assertEqual(sender_delete.status_code, 200)

        missing_after_delete = self.client.delete(
            f"/api/v1/messages/{message_id}",
            headers=self.auth_header(ctx["recipient_token"]),
        )
        self.assertEqual(missing_after_delete.status_code, 404)
