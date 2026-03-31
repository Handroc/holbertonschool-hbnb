#!/usr/bin/env python3
from app.models.review import Review
from app.persistence.repository import SQLAlchemyRepository
from app import db


class ReviewRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Review, db)
