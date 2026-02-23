from datetime import datetime, timezone
from uuid import uuid4


class Place:
    def __init__(
        self,
        title,
        description="",
        price=0,
        latitude=None,
        longitude=None,
        owner=None,
        place_id=None,
        created_at=None,
        updated_at=None
    ):
        if place_id:
            self.id = place_id
        else:
            self.id = str(uuid4())
        self.title = title
        self.description = description
        self.price = price
        self.latitude = latitude
        self.longitude = longitude
        self.owner = owner
        if created_at is None:
            self.created_at = datetime.now(timezone.utc)
        else:
            self.created_at = created_at
        if updated_at is None:
            self.updated_at = datetime.now(timezone.utc)
        else:
            self.updated_at = updated_at
        self.reviews = []  # List to store related reviews
        self.amenities = []  # List to store related amenities

    def add_review(self, review):
        """Add a review to the place."""
        self.reviews.append(review)

    def add_amenity(self, amenity):
        """Add an amenity to the place."""
        self.amenities.append(amenity)

    def get_reviews(self):
        """Return the list of reviews for the place."""
        return self.reviews

    def get_amenities(self):
        """Return the list of amenities for the place."""
        return self.amenities

    def remove_review(self, review):
        """Remove a review from the place."""
        if review in self.reviews:
            self.reviews.remove(review)

    def remove_amenity(self, amenity):
        """Remove an amenity from the place."""
        if amenity in self.amenities:
            self.amenities.remove(amenity)

    def __str__(self):
        """Return a readable string representation of the Place."""
        return f"[Place] {self.title} ({self.id})"

    def __repr__(self):
        """Return the official string representation of the Place."""
        return f"Place(id='{self.id}', title='{self.title}')"
