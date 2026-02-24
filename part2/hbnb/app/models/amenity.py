from base_model import BaseModel


class Amenity(BaseModel):
    def __init__(
        self,
        name,
        description="",
    ):
        super().__init__()
        self.name = name
        self.description = description

    def __str__(self):
        """Return a readable string representation of the Amenity."""
        return f"[Amenity] {self.name} ({self.id})"

    def __repr__(self):
        """Return the official string representation."""
        return f"Amenity(id='{self.id}', name='{self.name}', description='{self.description}')"
