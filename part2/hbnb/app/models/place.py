from .base_model import BaseModel
from .user import User


class Place(BaseModel):
    def __init__(
        self,
        title,
        owner,
        description="",
        price=0,
        latitude=None,
        longitude=None
    ):
        super().__init__()
        self.title = title
        self.description = description
        self.price = price
        self.latitude = latitude
        self.longitude = longitude
        self.owner = owner
        self.reviews = []
        self.amenities = []

    @property
    def title(self):
        return self._title

    @property
    def description(self):
        return self._description

    @property
    def price(self):
        return self._price

    @property
    def latitude(self):
        return self._latitude

    @property
    def longitude(self):
        return self._longitude

    @property
    def owner(self):
        return self._owner

    @property
    def amenities(self):
        return self._amenities

    @title.setter
    def title(self, title):
        if not (isinstance(title, str)):
            raise TypeError("The title should be a string")
        if not title.strip():
            raise ValueError("Title cannot be empty")
        if len(title) > 100:
            raise ValueError("The title should have a maximum of 100 characters")
        self._title = title

    @description.setter
    def description(self, description):
        if not isinstance(description, str):
            raise TypeError("Description must be a string")
        self._description = description

    @price.setter
    def price(self, price):
        if not (isinstance(price, (int, float))):
            raise TypeError("The price must be a number")
        if price < 0:
            raise ValueError("The price must be positive")
        self._price = price

    @latitude.setter
    def latitude(self, latitude):
        if latitude is not None:
            if not (isinstance(latitude, (int, float))):
                raise TypeError("Latitude must be a number")
            if not (-90 <= latitude <= 90):
                raise ValueError("Latitude must be between -90 and 90")
        self._latitude = latitude

    @longitude.setter
    def longitude(self, longitude):
        if longitude is not None:
            if not (isinstance(longitude, (int, float))):
                raise TypeError("Longitude must be a number")
            if not (-180 <= longitude <= 180):
                raise ValueError("Longitude must be between -180 and 180")
        self._longitude = longitude

    @owner.setter
    def owner(self, owner):
        if owner is None:
            raise ValueError("An owner is required")
        if not (isinstance(owner, User)):
            raise TypeError("The owner must be a user")
        if owner.id is None:
            raise ValueError("The owner doesn't exist")
        self._owner = owner

    def add_review(self, review):
        """Add a review to the place."""
        from .review import Review
        if not (isinstance(review, Review)):
            raise TypeError("review must be a Review")
        if review not in self.reviews:
            self.reviews.append(review)
            self.save()

    def add_amenity(self, amenity):
        """Add an amenity to the place."""
        from .amenity import Amenity
        if not (isinstance(amenity, Amenity)):
            raise TypeError("amenity must be an Amenity")
        if amenity not in self.amenities:
            self.amenities.append(amenity)
            self.save()

    def remove_review(self, review):
        """Remove a review from the place."""
        if review in self.reviews:
            self.reviews.remove(review)
            self.save()

    def remove_amenity(self, amenity):
        """Remove an amenity from the place."""
        if amenity in self.amenities:
            self.amenities.remove(amenity)
            self.save()

    def __str__(self):
        """Return a readable string representation of the Place."""
        return f"[Place] {self.title} ({self.id})"

    def __repr__(self):
        """Return the official string representation of the Place."""
        return f"Place(id='{self.id}', title='{self.title}')"
