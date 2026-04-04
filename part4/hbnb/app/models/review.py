#!/usr/bin/env python3
from .base_model import BaseModel, current_time
from app import db


class Review(BaseModel):
    __tablename__ = 'reviews'

    text = db.Column(db.String(500), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    cleanliness = db.Column(db.Integer, nullable=True)
    location = db.Column(db.Integer, nullable=True)
    value_score = db.Column(db.Integer, nullable=True)
    communication = db.Column(db.Integer, nullable=True)

    place_id = db.Column(db.String(36), db.ForeignKey('places.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    place = db.relationship('Place', back_populates='reviews')
    user = db.relationship('User', back_populates='reviews')

    @staticmethod
    def _validate_text(text):
        if not isinstance(text, str) or not text.strip():
            raise ValueError("text is required and must be a non-empty string")
        return text.strip()

    @staticmethod
    def _validate_rating(rating):
        if not isinstance(rating, int):
            raise TypeError("rating must be an integer")
        if rating < 1 or rating > 5:
            raise ValueError("rating must be between 1 and 5")
        return rating

    @staticmethod
    def _validate_reference_id(value, field_name):
        if not value or not isinstance(value, str):
            raise ValueError(f"{field_name} is required")
        return value

    @staticmethod
    def _validate_category_score(value, field_name):
        if value is None:
            return None
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise TypeError(f"{field_name} must be an integer")
        if value < 1 or value > 5:
            raise ValueError(f"{field_name} must be between 1 and 5")
        return value

    def __init__(self, text, rating, place_id, user_id,
                 cleanliness=None, location=None, value_score=None, communication=None):
        super().__init__()
        self.text = self._validate_text(text)
        self.rating = self._validate_rating(rating)
        self.place_id = self._validate_reference_id(place_id, "place_id")
        self.user_id = self._validate_reference_id(user_id, "user_id")
        self.cleanliness = self._validate_category_score(cleanliness, "cleanliness")
        self.location = self._validate_category_score(location, "location")
        self.value_score = self._validate_category_score(value_score, "value_score")
        self.communication = self._validate_category_score(communication, "communication")

    def to_dict(self):
        data = super().to_dict()
        if self.user:
            data["user"] = {
                "id": self.user.id,
                "first_name": self.user.first_name,
                "last_name": self.user.last_name,
                "profile_picture": self.user.profile_picture,
            }
        data["cleanliness"] = self.cleanliness
        data["location"] = self.location
        data["value_score"] = self.value_score
        data["communication"] = self.communication
        return data

    def update(self, data):
        if "text" in data:
            self.text = self._validate_text(data["text"])
        if "rating" in data:
            self.rating = self._validate_rating(data["rating"])
        for field in ("cleanliness", "location", "value_score", "communication"):
            if field in data:
                setattr(self, field, self._validate_category_score(data[field], field))
        self.updated_at = current_time()
