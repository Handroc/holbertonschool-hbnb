#!/usr/bin/env python3
from app.models.wishlist import WishlistItem
from app.persistence.repository import SQLAlchemyRepository
from app import db


class WishlistRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(WishlistItem, db)

    def get_by_user(self, user_id):
        return WishlistItem.query.filter_by(user_id=user_id).all()

    def get_by_user_and_place(self, user_id, place_id):
        return WishlistItem.query.filter_by(user_id=user_id, place_id=place_id).first()
