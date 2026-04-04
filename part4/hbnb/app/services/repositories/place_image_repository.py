#!/usr/bin/env python3
from app.models.place_image import PlaceImage
from app.persistence.repository import SQLAlchemyRepository
from app import db


class PlaceImageRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(PlaceImage, db)

    def get_by_place(self, place_id):
        return PlaceImage.query.filter_by(place_id=place_id).order_by(PlaceImage.order).all()
