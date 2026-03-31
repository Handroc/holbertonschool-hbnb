#!/usr/bin/env python3
from app.models.place import Place
from app.persistence.repository import SQLAlchemyRepository
from app import db


class PlaceRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Place, db)
