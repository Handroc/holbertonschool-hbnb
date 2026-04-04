#!/usr/bin/env python3
from app import db
from app.models.base_model import BaseModel


class WishlistItem(BaseModel):
    __tablename__ = 'wishlist_items'

    user_id  = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    place_id = db.Column(db.String(36), db.ForeignKey('places.id'), nullable=False)

    user  = db.relationship('User',  backref=db.backref('wishlist_items', cascade='all, delete-orphan', lazy=True))
    place = db.relationship('Place', backref=db.backref('wishlist_items', cascade='all, delete-orphan', lazy=True))

    __table_args__ = (db.UniqueConstraint('user_id', 'place_id', name='uq_wishlist_user_place'),)

    def __init__(self, user_id, place_id):
        super().__init__()
        self.user_id  = user_id
        self.place_id = place_id
