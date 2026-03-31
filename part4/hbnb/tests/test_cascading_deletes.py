import uuid

from app.services import facade
from tests.helpers import APITestCase


class TestCascadingDeletes(APITestCase):
    def _make_user_dict(self, prefix):
        token = uuid.uuid4().hex[:8]
        return {
            "first_name": f"{prefix}First",
            "last_name": f"{prefix}Last",
            "email": f"{prefix}_{token}@example.com",
            "password": "Secret123!",
        }

    def test_delete_user_cascades_owned_places_and_reviews(self):
        owner = facade.create_user(self._make_user_dict("owner"))
        reviewer = facade.create_user(self._make_user_dict("reviewer"))
        host = facade.create_user(self._make_user_dict("host"))

        owner_place = facade.create_place(
            {
                "title": "Owner place",
                "description": "Owned by owner",
                "price": 120,
                "latitude": 10,
                "longitude": 11,
                "owner_id": owner.id,
                "amenities": [],
            }
        )

        host_place = facade.create_place(
            {
                "title": "Host place",
                "description": "Owned by host",
                "price": 130,
                "latitude": 12,
                "longitude": 13,
                "owner_id": host.id,
                "amenities": [],
            }
        )

        review_on_owner_place = facade.create_review(
            {
                "text": "Reviewer on owner place",
                "rating": 4,
                "place_id": owner_place.id,
                "user_id": reviewer.id,
            }
        )

        review_by_owner_elsewhere = facade.create_review(
            {
                "text": "Owner reviewed host place",
                "rating": 5,
                "place_id": host_place.id,
                "user_id": owner.id,
            }
        )

        survivor_review = facade.create_review(
            {
                "text": "Reviewer on host place",
                "rating": 3,
                "place_id": host_place.id,
                "user_id": reviewer.id,
            }
        )

        facade.delete_user(owner.id)

        self.assertIsNone(facade.get_user(owner.id))
        self.assertIsNone(facade.get_place(owner_place.id))

        self.assertIsNone(facade.get_review(review_on_owner_place.id))
        self.assertIsNone(facade.get_review(review_by_owner_elsewhere.id))

        self.assertIsNotNone(facade.get_place(host_place.id))
        self.assertIsNotNone(facade.get_review(survivor_review.id))

    def test_delete_user_not_found_raises_value_error(self):
        with self.assertRaises(ValueError):
            facade.delete_user("missing-id")
