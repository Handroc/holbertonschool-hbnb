#!/usr/bin/env python3
import datetime
from app import db
from app.models.base_model import BaseModel, current_time

VALID_STATUSES = {'pending', 'confirmed', 'cancelled'}


class Booking(BaseModel):
    __tablename__ = 'bookings'

    place_id  = db.Column(db.String(36), db.ForeignKey('places.id'), nullable=False)
    user_id   = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    check_in  = db.Column(db.Date, nullable=False)
    check_out = db.Column(db.Date, nullable=False)
    status    = db.Column(db.String(20), nullable=False, default='pending')

    place = db.relationship('Place', back_populates='bookings')
    user  = db.relationship('User',  back_populates='bookings')

    def __init__(self, place_id, user_id, check_in, check_out, status='pending'):
        super().__init__()
        self.place_id  = place_id
        self.user_id   = user_id
        self.check_in  = self._parse_date(check_in)
        self.check_out = self._parse_date(check_out)
        self.status    = self._validate_status(status)
        self._validate_dates()

    @staticmethod
    def _parse_date(value):
        if isinstance(value, datetime.date):
            return value
        try:
            return datetime.date.fromisoformat(str(value))
        except (ValueError, TypeError):
            raise ValueError(f"Invalid date format: {value!r}. Use YYYY-MM-DD.")

    @staticmethod
    def _validate_status(status):
        if status not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return status

    def _validate_dates(self):
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")

    def update(self, data):
        ignored = {'id', 'created_at', 'updated_at', 'place_id', 'user_id'}
        new_check_in  = self.check_in
        new_check_out = self.check_out

        if 'check_in' in data:
            new_check_in = self._parse_date(data['check_in'])
        if 'check_out' in data:
            new_check_out = self._parse_date(data['check_out'])
        if 'status' in data:
            self.status = self._validate_status(data['status'])

        self.check_in  = new_check_in
        self.check_out = new_check_out
        self._validate_dates()
        self.updated_at = current_time()

    def to_dict(self):
        data = super().to_dict()
        data['check_in']  = self.check_in.isoformat()  if self.check_in  else None
        data['check_out'] = self.check_out.isoformat() if self.check_out else None
        data['place'] = self.place.to_dict() if self.place else None
        data['user']  = self.user.to_dict()  if self.user  else None
        return data
