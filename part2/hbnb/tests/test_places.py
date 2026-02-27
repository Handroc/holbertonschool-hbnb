import unittest
import sys
import os


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Permet d'importer 'app' proprement même quand le test est lancé directement
from app import create_app

class TestPlaceEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        user_resp = self.client.post('/api/v1/users/', json={
            "first_name": "Place",
            "last_name": "Owner",
            "email": "owner@example.com"
        })
        self.user = user_resp.get_json()
        self.user_id = self.user["id"]

    def test_create_place(self):
        response = self.client.post('/api/v1/places/', json={
            "title": "Nice Place",
            "description": "A lovely spot.",
            "price": 100,
            "latitude": 48.85,
            "longitude": 2.35,
            "owner_id": self.user_id,
            "amenities": []
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.get_json())

    def test_create_place_invalid_data(self):
        response = self.client.post('/api/v1/places/', json={})
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
