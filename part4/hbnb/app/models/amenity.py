from app import db
from .base_model import BaseModel, current_time
from .place import place_amenity


class Amenity(BaseModel):
    __tablename__ = 'amenities'

    name = db.Column(db.String(50), nullable=False)
    places = db.relationship(
        'Place',
        secondary=place_amenity,
        lazy='subquery',
        back_populates='amenities'
    )

    @staticmethod
    def _validate_name(name):
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name is required and must be a non-empty string")

        name = name.strip()
        if len(name) > 50:
            raise ValueError("name must be 50 characters or less")
        return name

    def __init__(self, name):
        super().__init__()
        self.name = self._validate_name(name)

    def update(self, data):
        if "name" in data:
            self.name = self._validate_name(data["name"])
        self.updated_at = current_time()