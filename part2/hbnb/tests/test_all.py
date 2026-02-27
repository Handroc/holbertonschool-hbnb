import unittest
import sys
import os

# Ajoute le chemin parent du projet pour pouvoir importer 'create_app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app


class TestUserEndpoints(unittest.TestCase):
    def setUp(self):
        """Initialisation avant chaque test."""
        self.app = create_app()
        self.client = self.app.test_client()

    def test_create_user(self):
        """Test la création d'un utilisateur valide."""
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@example.com"
        })
        self.assertEqual(response.status_code, 201)

    def test_create_user_invalid_data(self):
        """Test la création d'un utilisateur avec des données invalides."""
        response = self.client.post('/api/v1/users/', json={
            "first_name": "",
            "last_name": "",
            "email": "invalid-email"
        })
        self.assertEqual(response.status_code, 400)


class TestAmenityEndpoints(unittest.TestCase):
    def setUp(self):
        """Initialisation avant chaque test."""
        self.app = create_app()
        self.client = self.app.test_client()

    def test_create_amenity(self):
        """Test la création d'une commodité valide."""
        response = self.client.post('/api/v1/amenities/', json={"name": "WiFi"})
        self.assertEqual(response.status_code, 201)

    def test_create_amenity_invalid(self):
        """Test la création d'une commodité avec des données invalides."""
        response = self.client.post('/api/v1/amenities/', json={})
        self.assertEqual(response.status_code, 400)


class TestPlaceEndpoints(unittest.TestCase):
    def setUp(self):
        """Initialisation avant chaque test."""
        self.app = create_app()
        self.client = self.app.test_client()

        # Création d'un utilisateur pour être le propriétaire du lieu
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Place",
            "last_name": "Owner",
            "email": "owner@place.com"
        })
        self.user = response.get_json()

        # Création d'une commodité
        response = self.client.post('/api/v1/amenities/', json={"name": "Pool"})
        self.amenity = response.get_json()

    def test_create_place_invalid_data(self):
        """Test la création d'un lieu avec des données invalides."""
        response = self.client.post('/api/v1/places/', json={})
        self.assertEqual(response.status_code, 400)

    def test_create_place_valid_data(self):
        """Test la création d'un lieu valide."""
        response = self.client.post('/api/v1/places/', json={
            "title": "Nice Place",
            "description": "A lovely spot.",
            "price": 100.0,
            "latitude": 48.8566,
            "longitude": 2.3522,
            "owner_id": self.user["id"],
            "amenities": [self.amenity["id"]]
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.get_json())


class TestReviewEndpoints(unittest.TestCase):
    def setUp(self):
        """Initialisation avant chaque test."""
        self.app = create_app()
        self.client = self.app.test_client()

        # Création d'un utilisateur
        response = self.client.post('/api/v1/users/', json={
            "first_name": "Reviewer",
            "last_name": "One",
            "email": "reviewer@one.com"
        })
        self.user = response.get_json()

        # Création d'un lieu
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
        """Test la création d'un avis valide."""
        response = self.client.post('/api/v1/reviews/', json={
            "text": "Great place!",
            "rating": 5,
            "user_id": self.user["id"],
            "place_id": self.place["id"]
        })
        self.assertEqual(response.status_code, 201)

    def test_create_review_invalid(self):
        """Test la création d'un avis avec des données invalides."""
        response = self.client.post('/api/v1/reviews/', json={})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
