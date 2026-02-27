import unittest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Permet d'importer 'app' proprement même quand le test est lancé directement

from app import create_app

class TestReviewEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Create user
        user_resp = self.client.post('/api/v1/users/', json={
            "first_name": "Reviewer",
            "last_name": "Test",
            "email": "review@example.com"
        })
        self.user = user_resp.get_json()

        # Create place
        place_resp = self.client.post('/api/v1/places/', json={
            "title": "Reviewed Place",
            "description": "Great location",
            "price": 150,
            "latitude": 48.86,
            "longitude": 2.35,
            "owner_id": self.user["id"],
            "amenities": []
        })
        self.place = place_resp.get_json()

    def test_create_review_success(self):
        review_resp = self.client.post('/api/v1/reviews/', json={
            "text": "Amazing stay!",
            "rating": 5,
            "user_id": self.user["id"],
            "place_id": self.place["id"]
        })
        self.assertEqual(review_resp.status_code, 201)
        self.assertIn("id", review_resp.get_json())

    def test_create_review_invalid(self):
        response = self.client.post('/api/v1/reviews/', json={})
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
