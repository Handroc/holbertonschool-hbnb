from app.persistence.repository import InMemoryRepository
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.user import User
from app.models.review import Review

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
        if "owner_id" not in place_data:
            raise ValueError("An owner is required")
        owner_id = place_data.pop("owner_id")
        amenities_ids = place_data.pop("amenities", [])
        reviews_ids = place_data.pop("reviews", [])

        owner = self.user_repo.get(owner_id)
        if not owner:
            raise ValueError("Owner not found")

        place = Place(owner=owner, **place_data)

        for amenity_id in amenities_ids:
            amenity = self.amenity_repo.get(amenity_id)
            if not amenity:
                raise ValueError("Amenity not found")
            place.add_amenity(amenity)

        for review_id in reviews_ids:
            review = self.review_repo.get(review_id)
            if not review:
                raise ValueError("Review not found")
            place.add_review(review)

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
            for amenity_id in amenities_ids:
                amenity = self.amenity_repo.get(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
            place.amenities.clear()
            for amenity_id in amenities_ids:
                amenity = self.amenity_repo.get(amenity_id)
                place.add_amenity(amenity)

        if "reviews" in place_data:
            reviews_ids = place_data.pop("reviews")
            for review_id in reviews_ids:
                review = self.review_repo.get(review_id)
                if not review:
                    raise ValueError("Review not found")
            place.reviews.clear()
            for review_id in reviews_ids:
                review = self.review_repo.get(review_id)
                place.add_review(review)

        place.update(place_data)
        return place

################ USER ##################### 

    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute('email', email)
    
    def put_user(self, user_id, data):
        return self.user_repo.update(user_id, data)
    
    def patch(self, user_id: str, data: dict):
        if 'email' in data:
            existing_user = self.get_user_by_email(data['email'])
            if existing_user and existing_user.id != user_id:
                return None
        updated_user = self.user_repo.update(user_id, data)
        return updated_user

    def delete_user(self, user_id):
        return self.user_repo.delete(user_id)

############### REVIEW ########################

    def create_review(self, review_data):
        review = Review(**review_data)
        self.review_repo.add(review)
        return review
    
    def get_review(self, review_id):
        return self.review_repo.get(review_id)
    
    def get_review_by_user(self, user):
        return self.review_repo.get_by_attribute('user', user)

    def put_review(self, review_id, data):
        return self.review_repo.update(review_id, data)
    
    def patch_review(self, review_id: str, data: dict):
        return self.review_repo.update(review_id, data)
    
    def delete_review(self, review_id):
        return self.review_repo.delete(review_id)
