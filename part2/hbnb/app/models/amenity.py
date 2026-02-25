from .base_model import BaseModel


class Amenity(BaseModel):
    def __init__(self, name):
        super().__init__()
        self.name = name

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        if not (isinstance(name, str)):
            raise TypeError("The name should be a string")
        if not name.strip():
            raise ValueError("Name cannot be empty")
        if len(name) > 50:
            raise ValueError("The name should have a maximum of 50 characters")
        self._name = name

    def __str__(self):
        """Return a readable string representation of the Amenity."""
        return f"[Amenity] {self.name} ({self.id})"

    def __repr__(self):
        """Return the official string representation."""
        return f"Amenity(id='{self.id}', name='{self.name}')"