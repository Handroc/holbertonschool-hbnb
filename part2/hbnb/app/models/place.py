from base_model import BaseModel
from user import User


class Place(BaseModel):
    def __init__(
        self,
        title,
        description="",
        price=0,
        latitude=None,
        longitude=None,
        owner=User,
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

    def add_review(self, review):
        """Add a review to the place."""
        self.reviews.append(review)
        self.save()

    def add_amenity(self, amenity):
        """Add an amenity to the place."""
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
