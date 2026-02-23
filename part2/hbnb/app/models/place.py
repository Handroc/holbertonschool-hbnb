from datetime import datetime, timezone


class Place:
    def __init__(
        self,
        place_id,
        title,
        description,
        price,
        latitude,
        longitude,
        owner,
        created_at=None,
        updated_at=None
    ):
        self.id = place_id
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
