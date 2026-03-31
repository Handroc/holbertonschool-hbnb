#!/usr/bin/env python3
from app.models.amenity import Amenity
from app.persistence.repository import SQLAlchemyRepository
from app import db


class AmenityRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Amenity, db)
