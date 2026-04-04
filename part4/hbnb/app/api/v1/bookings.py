#!/usr/bin/env python3
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services import facade

api = Namespace('bookings', description='Booking operations')

booking_model = api.model('Booking', {
    'place_id':  fields.String(required=True, description='ID of the place to book'),
    'check_in':  fields.String(required=True, description='Check-in date (YYYY-MM-DD)'),
    'check_out': fields.String(required=True, description='Check-out date (YYYY-MM-DD)'),
})

update_booking_model = api.model('BookingUpdate', {
    'check_in':  fields.String(description='New check-in date (YYYY-MM-DD)'),
    'check_out': fields.String(description='New check-out date (YYYY-MM-DD)'),
    'status':    fields.String(description='Status: pending | confirmed | cancelled'),
})


@api.route('/')
class BookingList(Resource):
    @jwt_required()
    @api.expect(booking_model)
    @api.response(201, 'Booking created successfully')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Create a new booking (authenticated users only)"""
        current_user_id = get_jwt_identity()
        data = dict(api.payload or {})
        data['user_id'] = current_user_id
        try:
            booking = facade.create_booking(data)
            return booking.to_dict(), 201
        except ValueError as e:
            return {"Error": str(e)}, 400

    @jwt_required()
    @api.response(200, 'List of bookings retrieved successfully')
    def get(self):
        """Get bookings — admin sees all, users see their own"""
        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        if is_admin:
            bookings = facade.get_all_bookings()
        else:
            bookings = facade.get_bookings_by_user(current_user_id)
        return [b.to_dict() for b in bookings], 200


@api.route('/<string:booking_id>')
class BookingDetail(Resource):
    @jwt_required()
    @api.response(200, 'Booking retrieved successfully')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Booking not found')
    def get(self, booking_id):
        """Get a booking by ID (booker, place owner, or admin)"""
        booking = facade.get_booking(booking_id)
        if not booking:
            return {"Error": "Booking not found"}, 404

        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        is_booker = str(booking.user_id) == str(current_user_id)
        is_owner  = str(booking.place.user_id) == str(current_user_id)
        if not (is_admin or is_booker or is_owner):
            return {"Error": "Unauthorized action"}, 403

        return booking.to_dict(), 200

    @jwt_required()
    @api.expect(update_booking_model)
    @api.response(200, 'Booking updated successfully')
    @api.response(400, 'Invalid input data')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Booking not found')
    def put(self, booking_id):
        """Update a booking — booker can change dates & status; place owner can only change status"""
        booking = facade.get_booking(booking_id)
        if not booking:
            return {"Error": "Booking not found"}, 404

        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        is_booker = str(booking.user_id) == str(current_user_id)
        is_owner  = str(booking.place.user_id) == str(current_user_id)
        if not (is_admin or is_booker or is_owner):
            return {"Error": "Unauthorized action"}, 403

        data = dict(api.payload or {})
        # Place owners (who are not the booker or admin) may only change the status
        if is_owner and not is_booker and not is_admin:
            data = {k: v for k, v in data.items() if k == 'status'}

        try:
            updated = facade.update_booking(booking_id, data)
            return updated.to_dict(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400

    @jwt_required()
    @api.response(200, 'Booking deleted successfully')
    @api.response(403, 'Admin access required')
    @api.response(404, 'Booking not found')
    def delete(self, booking_id):
        """Delete a booking (admin only)"""
        booking = facade.get_booking(booking_id)
        if not booking:
            return {"Error": "Booking not found"}, 404

        is_admin = get_jwt().get('is_admin', False)
        if not is_admin:
            return {"Error": "Admin access required"}, 403

        facade.delete_booking(booking_id)
        return {"message": "Booking deleted successfully"}, 200
