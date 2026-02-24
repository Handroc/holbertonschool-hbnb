import datetime
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
        self.id = place_id or str(uuid4())
        self.title = title
        self.description = description
        self.price = price
        self.latitude = latitude
        self.longitude = longitude
        self.owner = owner
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.reviews = []
        self.amenities = []

    def add_review(self, review):
        """Add a review to the place."""
        self.reviews.append(review)
        self.updated_at = datetime.now()

    def add_amenity(self, amenity):
        """Add an amenity to the place."""
        self.amenities.append(amenity)
        self.updated_at = datetime.now()

    def remove_review(self, review):
        """Remove a review from the place."""
        if review in self.reviews:
            self.reviews.remove(review)
            self.updated_at = datetime.now()

    def remove_amenity(self, amenity):
        """Remove an amenity from the place."""
        if amenity in self.amenities:
            self.amenities.remove(amenity)
            self.updated_at = datetime.now()

    def __str__(self):
        """Return a readable string representation of the Place."""
        return f"[Place] {self.title} ({self.id})"

    def __repr__(self):
        """Return the official string representation of the Place."""
        return f"Place(id='{self.id}', title='{self.title}')"
