#!/usr/bin/env python3
from app.persistence.repository import SQLAlchemyRepository
from app.models.booking import Booking
from app import db


class BookingRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(Booking, db)

    def get_bookings_by_place(self, place_id):
        return self.get_all_by_attribute('place_id', place_id)

    def get_bookings_by_user(self, user_id):
        return self.get_all_by_attribute('user_id', user_id)

    def get_overlapping(self, place_id, check_in, check_out, exclude_id=None):
        """Return active bookings for place_id that overlap [check_in, check_out)."""
        query = Booking.query.filter(
            Booking.place_id == place_id,
            Booking.status != 'cancelled',
            Booking.check_in < check_out,
            Booking.check_out > check_in
        )
        if exclude_id:
            query = query.filter(Booking.id != exclude_id)
        return query.all()
