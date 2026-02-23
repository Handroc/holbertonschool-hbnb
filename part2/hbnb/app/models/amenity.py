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
        self.id = amenity_id or str(uuid4())
        self.name = name
        self.description = description
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)

    def __str__(self):
        """Return a readable string representation of the Amenity."""
        return f"[Amenity] {self.name} ({self.id})"

    def __repr__(self):
        """Return the official string representation."""
        return f"Amenity(id='{self.id}', name='{self.name}', description='{self.description}')"
