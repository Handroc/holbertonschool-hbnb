from datetime import datetime, timezone
from uuid import uuid4


class Amenity:
    def __init__(
        self,
        name,
        description="",
        amenity_id=None,
        created_at=None,
        updated_at=None
    ):
        if amenity_id:
            self.id = amenity_id
        else:
            self.id = str(uuid4())
        self.name = name
        self.description = description
        if created_at is None:
            self.created_at = datetime.now(timezone.utc)
        else:
            self.created_at = created_at
        if updated_at is None:
            self.updated_at = datetime.now(timezone.utc)
        else:
            self.updated_at = updated_at

    def __str__(self):
        """Return a readable string representation of the Amenity."""
        return f"[Amenity] {self.name} ({self.id})"

    def __repr__(self):
        """Return the official string representation."""
        return f"Amenity(id='{self.id}', name='{self.name}', description='{self.description}')"
