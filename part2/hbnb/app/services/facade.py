from app.persistence.repository import InMemoryRepository
from app.models.amenity import Amenity
from app.models.place import Place


class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.place_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()
        self.amenity_repo = InMemoryRepository()

################ AMENITY #####################

    def create_amenity(self, amenity_data):
        amenity_data = dict(amenity_data)
        name = amenity_data.get("name")
        if not name:
            raise ValueError("Name is required")

        existing = self.amenity_repo.get_by_attribute("name", name)
        if existing:
            raise ValueError("Amenity already exists")

        amenity = Amenity(name)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        amenity_data = dict(amenity_data)
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            raise ValueError("Amenity not found")

        amenity.update(amenity_data)
        return amenity

################ PLACE ##################### 

    def create_place(self, place_data):
        place_data = dict(place_data)
        owner_id = place_data.pop("owner_id")
        amenities_ids = place_data.pop("amenities", [])

        owner = self.user_repo.get(owner_id)
        if not owner:
            raise ValueError("Owner not found")

        place = Place(owner=owner, **place_data)

        for id in amenities_ids:
            amenity = self.amenity_repo.get(id)
            if not amenity:
                raise ValueError("Amenity not found")
            place.add_amenity(amenity)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        place_data = dict(place_data)
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        if "owner_id" in place_data:
            owner = self.user_repo.get(place_data.pop("owner_id"))
            if not owner:
                raise ValueError("Owner not found")
            place.owner = owner

        if "amenities" in place_data:
            amenities_ids = place_data.pop("amenities")
            place.amenities.clear()
            for amenity_id in amenities_ids:
                amenity = self.amenity_repo.get(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
                place.add_amenity(amenity)

        place.update(place_data)
        return place
