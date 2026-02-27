import unittest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Permet d'importer 'app' proprement même quand le test est lancé directement
from app import create_app

class TestUserEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_create_user(self):
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@example.com"
        })
        self.assertEqual(response.status_code, 201)

    def test_create_user_invalid_data(self):
        response = self.client.post('/api/v1/users/', json={
            "first_name": "",
            "last_name": "",
            "email": "invalid-email"
        })
        self.assertEqual(response.status_code, 400)

class TestAmenityEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_create_amenity(self):
        response = self.client.post('/api/v1/amenities/', json={"name": "WiFi"})
        self.assertEqual(response.status_code, 201)

    def test_create_amenity_invalid(self):
        response = self.client.post('/api/v1/amenities/', json={})
        self.assertEqual(response.status_code, 400)

class TestPlaceEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Create a user for the place owner
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Place",
            "last_name": "Owner",
            "email": "owner@place.com"
        })
        self.user = response.get_json()

        # Create a sample amenity
        response = self.client.post('/api/v1/amenities/', json={"name": "Pool"})
        self.amenity = response.get_json()

    def test_create_place_invalid_data(self):
        response = self.client.post('/api/v1/places/', json={})
        self.assertEqual(response.status_code, 400)

class TestReviewEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Create a user
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Reviewer",
            "last_name": "One",
            "email": "reviewer@one.com"
        })
        self.user = response.get_json()

        # Create a place
        response = self.client.post('/api/v1/places/', json={
            "title": "Sample Place",
            "description": "A nice place",
            "price": 100.0,
            "latitude": 48.8566,
            "longitude": 2.3522,
            "owner_id": self.user["id"],
            "amenities": []
        })
        self.place = response.get_json()

    def test_create_review_success(self):
        response = self.client.post('/api/v1/reviews/', json={
            "text": "Great place!",
            "rating": 5,
            "user_id": self.user["id"],
            "place_id": self.place["id"]
        })
        self.assertEqual(response.status_code, 201)

    def test_create_review_invalid(self):
        response = self.client.post('/api/v1/reviews/', json={})
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
