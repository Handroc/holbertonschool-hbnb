from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

api = Namespace('places', description='Place operations')

amenity_model = api.model('PlaceAmenity', {
    'id': fields.String(description='Amenity ID'),
    'name': fields.String(description='Name of the amenity')
})

user_model = api.model('PlaceUser', {
    'id': fields.String(description='User ID'),
    'first_name': fields.String(description='First name of the owner'),
    'last_name': fields.String(description='Last name of the owner'),
    'email': fields.String(description='Email of the owner')
})

place_model = api.model('Place', {
    'title': fields.String(required=True, description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(required=True, description='Price per night'),
    'latitude': fields.Float(required=True, description='Latitude of the place'),
    'longitude': fields.Float(required=True, description='Longitude of the place'),
    'owner_id': fields.String(required=True, description='ID of the owner'),
    'amenities': fields.List(fields.String, required=True, description="List of amenities ID's")
})

update_place_model = api.model('UpdatePlace', {
    'title': fields.String(description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(description='Price per night'),
    'latitude': fields.Float(description='Latitude of the place'),
    'longitude': fields.Float(description='Longitude of the place'),
    'amenities': fields.List(fields.String, description="List of amenities ID's")
})



@api.route('/')
class PlaceList(Resource):
    @jwt_required()
    @api.expect(place_model)
    @api.response(201, 'Place successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new place"""
        current_user_id = get_jwt_identity()
        payload = api.payload
        if not isinstance(payload, dict):
            return {"Error": "Invalid payload"}, 400
        required_fields = ["title", "price", "latitude", "longitude", "amenities"]
        missing_fields = [field for field in required_fields if field not in payload]
        if missing_fields:
            return {"Error": f"Missing required fields: {', '.join(missing_fields)}"}, 400
        payload["owner_id"] = current_user_id
        try:
            place = facade.create_place(payload).to_dict()
            return place, 201
        except (ValueError, TypeError) as e:
            return {"Error": str(e)}, 400

    @api.response(200, 'List of places retrieved successfully')
    def get(self):
        """Retrieve a list of all places"""
        all_places = facade.get_all_places()
        return [x.to_dict() for x in all_places], 200


@api.route('/<place_id>')
class PlaceResource(Resource):
    @api.response(200, 'Place details retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get place details by ID"""
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        return place.to_dict(), 200

    @jwt_required()
    @api.expect(update_place_model)
    @api.response(200, 'Place updated successfully')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place not found')
    @api.response(400, 'Invalid input data')
    def put(self, place_id):
        """Update a place's information"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        if not is_admin and str(place.owner.id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        try:
            place = facade.update_place(place_id, api.payload)
            return place.to_dict(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400
        except TypeError as e:
            return {"Error": str(e)}, 404

    @jwt_required()
    @api.response(200, 'Place deleted successfully')
    @api.response(404, 'Place not found')
    @api.response(403, 'Unauthorized action')
    def delete(self, place_id):
        """Delete a place"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        if not is_admin and str(place.owner.id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        try:
            facade.delete_place(place_id)
            return {"message": "Place deleted successfully"}, 200
        except ValueError as e:
            return {"Error": str(e)}, 404

@api.route('/<place_id>/reviews')
class PlaceReviewList(Resource):
    @api.response(200, 'List of reviews for the place retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get all reviews for a specific place"""
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        return [x.to_dict() for x in place.reviews], 200
