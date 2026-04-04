#!/usr/bin/env python3
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('wishlist', description='Wishlist operations')

wishlist_add_model = api.model('WishlistAdd', {
    'place_id': fields.String(required=True, description='ID of the place to save'),
})


@api.route('/')
class WishlistList(Resource):
    @jwt_required()
    @api.response(200, 'Wishlist retrieved')
    def get(self):
        """Get the current user's wishlist"""
        user_id = get_jwt_identity()
        places = facade.get_wishlist(user_id)
        return [p.to_dict() for p in places], 200

    @jwt_required()
    @api.expect(wishlist_add_model)
    @api.response(201, 'Place added to wishlist')
    @api.response(400, 'Invalid input')
    def post(self):
        """Add a place to the current user's wishlist"""
        user_id = get_jwt_identity()
        place_id = (api.payload or {}).get('place_id')
        if not place_id:
            return {"Error": "place_id is required"}, 400
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        facade.add_to_wishlist(user_id, place_id)
        return {"message": "Added to wishlist"}, 201


@api.route('/ids')
class WishlistIds(Resource):
    @jwt_required()
    @api.response(200, 'Wishlist place IDs')
    def get(self):
        """Get list of place IDs in the current user's wishlist"""
        user_id = get_jwt_identity()
        return facade.get_wishlist_place_ids(user_id), 200


@api.route('/<place_id>')
class WishlistItem(Resource):
    @jwt_required()
    @api.response(200, 'Place removed from wishlist')
    @api.response(404, 'Not in wishlist')
    def delete(self, place_id):
        """Remove a place from the current user's wishlist"""
        user_id = get_jwt_identity()
        try:
            facade.remove_from_wishlist(user_id, place_id)
            return {"message": "Removed from wishlist"}, 200
        except ValueError as e:
            return {"Error": str(e)}, 404
