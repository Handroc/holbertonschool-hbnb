from datetime import datetime, timezone


class Amenity:
    def __init__(
        self,
        amenity_id,
        name,
        description,
        created_at=None,
        updated_at=None
    ):
        self.id = amenity_id
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
