import unittest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Permet d'importer 'app' proprement même quand le test est lancé directement
from app import create_app

class TestAmenityEndpoints(unittest.TestCase):
    def setUp(self):
        """Initialise le client de test avant chaque test"""
        self.app = create_app()
        self.client = self.app.test_client()
        self.app.testing = True

    def test_create_amenity(self):
        """Test de la création d'une amenity valide"""
        response = self.client.post('/api/v1/amenities/', json={"name": "WiFi"})
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn("id", data)
        self.assertEqual(data.get("name"), "WiFi")

    def test_create_amenity_invalid(self):
        """Test de la création d'une amenity sans données"""
        response = self.client.post('/api/v1/amenities/', json={})
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main()
