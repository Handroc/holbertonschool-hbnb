#!/usr/bin/env python3
from app import db
from app.models.base_model import BaseModel


class PlaceImage(BaseModel):
    __tablename__ = 'place_images'

    place_id = db.Column(db.String(36), db.ForeignKey('places.id'), nullable=False)
    path     = db.Column(db.String(255), nullable=False)
    order    = db.Column(db.Integer, default=0)

    place = db.relationship('Place', back_populates='images')

    def __init__(self, place_id, path, order=0):
        super().__init__()
        self.place_id = place_id
        self.path = path
        self.order = order
