import uuid

from app.services import facade
from tests.helpers import APITestCase


class TestRelationships(APITestCase):
    def _make_user_payload(self, prefix):
        token = uuid.uuid4().hex[:8]
        return {
            "first_name": f"{prefix}First",
            "last_name": f"{prefix}Last",
            "email": f"{prefix}_{token}@example.com",
            "password": "Secret123!",
        }

    def test_entity_relationships_are_mapped_both_directions(self):
        owner = facade.create_user(self._make_user_payload("ownerrel"))
        reviewer = facade.create_user(self._make_user_payload("reviewerrel"))
        amenity = facade.create_amenity({"name": "Relationship WiFi"})

        place = facade.create_place(
            {
                "title": "Relationship Place",
                "description": "Exercise model mappings",
                "price": 180,
                "latitude": 48.85,
                "longitude": 2.35,
                "user_id": owner.id,
                "amenities": [amenity.id],
            }
        )

        review = facade.create_review(
            {
                "text": "Strong relationship coverage",
                "rating": 5,
                "place_id": place.id,
                "user_id": reviewer.id,
            }
        )

        self.assertEqual(place.user.id, owner.id)
        self.assertEqual(place.user_id, owner.id)
        self.assertEqual(place.owner.id, owner.id)
        self.assertEqual(place.owner_id, owner.id)
        self.assertIn(place, owner.places)

        self.assertEqual(review.place.id, place.id)
        self.assertIn(review, place.reviews)

        self.assertEqual(review.user.id, reviewer.id)
        self.assertIn(review, reviewer.reviews)

        self.assertIn(amenity, place.amenities)
        self.assertIn(place, amenity.places)

    def test_create_place_accepts_legacy_owner_id_alias(self):
        owner = facade.create_user(self._make_user_payload("owneralias"))

        place = facade.create_place(
            {
                "title": "Owner Alias Place",
                "description": "Compatibility path",
                "price": 95,
                "latitude": 34.05,
                "longitude": -118.25,
                "owner_id": owner.id,
                "amenities": [],
            }
        )

        self.assertEqual(place.user_id, owner.id)
        self.assertEqual(place.owner_id, owner.id)
        self.assertEqual(place.user.id, owner.id)
