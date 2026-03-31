#!/usr/bin/env python3
from app.services.repositories import (
    UserRepository,
    PlaceRepository,
    ReviewRepository,
    AmenityRepository,
)
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.user import User
from app.models.review import Review

class HBnBFacade:
    def __init__(self):
        self.user_repo = UserRepository()
        self.place_repo = PlaceRepository()
        self.review_repo = ReviewRepository()
        self.amenity_repo = AmenityRepository()

################ AMENITY #####################

    def create_amenity(self, amenity_data):
        amenity_data = dict(amenity_data)
        name = amenity_data.get("name")
        if not name:
            raise ValueError("Name is required")
        name = Amenity._validate_name(name)

        existing = self.amenity_repo.get_first_by_attribute("name", name)
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
        if "name" in amenity_data:
            amenity_data["name"] = Amenity._validate_name(amenity_data["name"])
            existing = self.amenity_repo.get_first_by_attribute("name", amenity_data["name"])
            if existing and existing.id != amenity_id:
                raise ValueError("An amenity with this name already exists")
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            raise ValueError("Amenity not found")

        self.amenity_repo.update(amenity.id, amenity_data)
        return amenity

    def delete_amenity(self, amenity_id):
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            raise ValueError("Amenity not found")

        for place in self.place_repo.get_all():
            if amenity in place.amenities:
                place.remove_amenity(amenity)
        self.amenity_repo.delete(amenity_id)

################ PLACE ##################### 

    def create_place(self, place_data):
        place_data = dict(place_data)
        owner_id = place_data.pop("user_id", place_data.pop("owner_id", None))
        if owner_id is None:
            raise ValueError("An owner is required")
        amenities_ids = place_data.pop("amenities", [])

        user = self.user_repo.get(owner_id)
        if not user:
            raise ValueError("Owner not found")

        place = Place(user_id=owner_id, **place_data)

        for amenity_id in amenities_ids:
            amenity = self.amenity_repo.get(amenity_id)
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
        place_data.pop("reviews", None)
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        owner_id = place_data.pop("user_id", place_data.pop("owner_id", None))
        if owner_id is not None:
            user = self.user_repo.get(owner_id)
            if not user:
                raise ValueError("Owner not found")
            place.user = user

        if "amenities" in place_data:
            amenity_list = []
            amenities_ids = place_data.pop("amenities")
            for amenity_id in amenities_ids:
                amenity = self.amenity_repo.get(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
                amenity_list.append(amenity)
            place.amenities.clear()
            for amenity in amenity_list:
                place.add_amenity(amenity)

        self.place_repo.update(place.id, place_data)
        return place

    def delete_place(self, place_id):
        place = self.place_repo.get(place_id)
        if not place:
            raise ValueError("Place not found")

        for review in self.get_review_by_place(place_id):
            self.delete_review(review.id)
        self.place_repo.delete(place_id)

################ USER ##################### 

    def create_user(self, user_data):
        user_data = dict(user_data)
        email = user_data.get("email")
        password = user_data.pop("password", None)
        if not email:
            raise ValueError("Email is required")
        if password is None:
            raise ValueError("Password is required")
        existing = self.user_repo.get_user_by_email(email)
        if existing:
            raise ValueError("Email is already used")

        user = User(password=password, **user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)
    
    def get_all_users(self):
        return self.user_repo.get_all()

    def get_user_by_email(self, email):
        return self.user_repo.get_user_by_email(email)

    def update_user(self, user_id, user_data):
        user_data = dict(user_data)
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")

        password = user_data.pop("password", None)
        user_data.pop("is_admin", None)

        if "email" in user_data:
            existing = self.user_repo.get_user_by_email(user_data["email"])
            if existing and existing.id != user_id:
                raise ValueError("Email is already used")

        if password is not None:
            user_data["password"] = password
        self.user_repo.update(user.id, user_data)
        return user

    def delete_user(self, user_id):
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError("User not found")

        for review in self.review_repo.get_all_by_attribute("user_id", user_id):
            if review.user_id == user_id:
                place = self.place_repo.get(review.place_id)
                if place and review in place.reviews:
                    place.remove_review(review)
                self.review_repo.delete(review.id)

        for place in self.place_repo.get_all_by_attribute("user_id", user_id):
            if place.user_id == user_id:
                self.delete_place(place.id)

        self.user_repo.delete(user_id)

############### REVIEW ########################

    def create_review(self, review_data):
        review_data = dict(review_data)

        user_id = review_data.get("user_id")
        place_id = review_data.get("place_id")
        if not user_id:
            raise ValueError("User is required")
        if not place_id:
            raise ValueError("Place is required")
        if not self.user_repo.get(user_id):
            raise ValueError("User not found")
        if not self.place_repo.get(place_id):
            raise ValueError("Place not found")

        place = self.get_place(place_id)
        review = Review(**review_data)
        place.add_review(review)
        self.review_repo.add(review)
        return review
    
    def get_review(self, review_id):
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        return self.review_repo.get_all()
    
    def get_review_by_place(self, place_id):
        return self.review_repo.get_all_by_attribute('place_id', place_id)

    def update_review(self, review_id, review_data):
        review_data = dict(review_data)
        review_data.pop("user_id", None)
        review_data.pop("place_id", None)
        review = self.review_repo.get(review_id)
        if not review:
            raise ValueError("Review not found")

        self.review_repo.update(review.id, review_data)
        return review

    def delete_review(self, review_id):
        review = self.review_repo.get(review_id)
        if not review:
            raise ValueError("Review not found")

        place = self.place_repo.get(review.place_id)
        if place and review in place.reviews:
            place.remove_review(review)

        self.review_repo.delete(review_id)
