#!/usr/bin/env python3
from app import db
from app.models.base_model import BaseModel, current_time

place_amenity = db.Table(
    'place_amenity',
    db.Column('place_id', db.String(36), db.ForeignKey('places.id'), primary_key=True),
    db.Column('amenity_id', db.String(36), db.ForeignKey('amenities.id'), primary_key=True)
)


class Place(BaseModel):
    __tablename__ = 'places'

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    user = db.relationship('User', back_populates='places')
    reviews = db.relationship('Review', back_populates='place', lazy=True, cascade='all, delete-orphan')
    amenities = db.relationship(
        'Amenity',
        secondary=place_amenity,
        lazy='subquery',
        back_populates='places'
    )

    @staticmethod
    def _validate_title(title):
        if not isinstance(title, str) or not title.strip():
            raise ValueError("title is required and must be a non-empty string")

        title = title.strip()
        if len(title) > 100:
            raise ValueError("title must be 100 characters or less")
        return title

    @staticmethod
    def _validate_description(description):
        if description is not None and not isinstance(description, str):
            raise TypeError("description must be a string or None")
        return description

    @staticmethod
    def _validate_positive_float(value, field_name):
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise TypeError(f"{field_name} must be a float")
        if value <= 0:
            raise ValueError(f"{field_name} must be a positive value")
        return value

    @staticmethod
    def _validate_coordinate(value, field_name, minimum, maximum):
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise TypeError(f"{field_name} must be a float")
        if value < minimum or value > maximum:
            raise ValueError(f"{field_name} must be between {minimum:g} and {maximum:g}")
        return value

    @staticmethod
    def _validate_user_id(user_id):
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id is required")
        return user_id

    def __init__(self, title, description=None, price=0.0, latitude=0.0,
                longitude=0.0, owner_id=None, user_id=None):
        super().__init__()
        resolved_user_id = user_id if user_id is not None else owner_id
        self.title = self._validate_title(title)
        self.description = self._validate_description(description)
        self.price = self._validate_positive_float(price, "price")
        self.latitude = self._validate_coordinate(latitude, "latitude", -90.0, 90.0)
        self.longitude = self._validate_coordinate(longitude, "longitude", -180.0, 180.0)
        self.user_id = self._validate_user_id(resolved_user_id)

    @property
    def owner(self):
        return self.user

    @owner.setter
    def owner(self, value):
        self.user = value

    @property
    def owner_id(self):
        return self.user_id

    @owner_id.setter
    def owner_id(self, value):
        self.user_id = self._validate_user_id(value)

    def update(self, data):
        if "title" in data:
            self.title = self._validate_title(data["title"])

        if "description" in data:
            self.description = self._validate_description(data["description"])

        if "price" in data:
            self.price = self._validate_positive_float(data["price"], "price")

        if "latitude" in data:
            self.latitude = self._validate_coordinate(data["latitude"], "latitude", -90.0, 90.0)

        if "longitude" in data:
            self.longitude = self._validate_coordinate(data["longitude"], "longitude", -180.0, 180.0)

        self.updated_at = current_time()

    def add_review(self, review):
        """Add a review to the place."""
        from .review import Review
        if not (isinstance(review, Review)):
            raise TypeError("review must be a Review")
        if review not in self.reviews:
            self.reviews.append(review)
            self.updated_at = current_time()

    def add_amenity(self, amenity):
        """Add an amenity to the place."""
        from .amenity import Amenity
        if not (isinstance(amenity, Amenity)):
            raise TypeError("amenity must be an Amenity")
        if amenity not in self.amenities:
            self.amenities.append(amenity)
            self.updated_at = current_time()

    def remove_review(self, review):
        """Remove a review from the place."""
        if review in self.reviews:
            self.reviews.remove(review)
            self.updated_at = current_time()

    def remove_amenity(self, amenity):
        """Remove an amenity from the place."""
        if amenity in self.amenities:
            self.amenities.remove(amenity)
            self.updated_at = current_time()

    def to_dict(self):
        data = super().to_dict()
        data.pop('user_id', None)

        owner_dict = self.owner.to_dict()
        data["owner"] = owner_dict
        data["amenities"] = [amenity.to_dict() for amenity in self.amenities]

        return data
