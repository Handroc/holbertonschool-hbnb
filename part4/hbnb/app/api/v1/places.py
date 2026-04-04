import os
from flask import request, current_app
from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

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
        """Retrieve a list of all places (optional ?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD)"""
        check_in  = request.args.get('check_in')
        check_out = request.args.get('check_out')
        if check_in and check_out:
            all_places = facade.get_available_places(check_in, check_out)
        else:
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


@api.route('/<place_id>/picture')
class PlacePicture(Resource):
    @jwt_required()
    @api.response(200, 'Picture uploaded successfully')
    @api.response(400, 'Bad request')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place not found')
    def post(self, place_id):
        """Upload a picture for a place (owner or admin)"""
        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        if not is_admin and str(place.user_id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        if 'picture' not in request.files:
            return {"Error": "No file provided (field name: 'picture')"}, 400
        file = request.files['picture']
        if not file or not file.filename:
            return {"Error": "No file selected"}, 400
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return {"Error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"}, 400
        upload_dir = os.path.join(current_app.static_folder, 'images', 'places')
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{place_id}.{ext}"
        file.save(os.path.join(upload_dir, filename))
        picture_url = f"/static/images/places/{filename}"
        facade.update_place_picture(place_id, picture_url)
        return {"picture": picture_url}, 200


@api.route('/<place_id>/images')
class PlaceImageList(Resource):
    @api.response(200, 'Images retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get all images for a place"""
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        return [{"id": img.id, "path": img.path, "order": img.order} for img in place.images], 200

    @jwt_required()
    @api.response(201, 'Image uploaded successfully')
    @api.response(400, 'Bad request')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place not found')
    def post(self, place_id):
        """Upload an additional image for a place (owner or admin)"""
        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        if not is_admin and str(place.user_id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        if 'image' not in request.files:
            return {"Error": "No file provided (field name: 'image')"}, 400
        file = request.files['image']
        if not file or not file.filename:
            return {"Error": "No file selected"}, 400
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return {"Error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"}, 400
        upload_dir = os.path.join(current_app.static_folder, 'images', 'places')
        os.makedirs(upload_dir, exist_ok=True)
        import uuid as _uuid
        filename = f"{place_id}_{_uuid.uuid4().hex[:8]}.{ext}"
        file.save(os.path.join(upload_dir, filename))
        path = f"/static/images/places/{filename}"
        img = facade.add_place_image(place_id, path)
        return {"id": img.id, "path": img.path, "order": img.order}, 201


@api.route('/<place_id>/images/<image_id>')
class PlaceImageDetail(Resource):
    @jwt_required()
    @api.response(200, 'Image deleted successfully')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place or image not found')
    def delete(self, place_id, image_id):
        """Delete a specific image from a place (owner or admin)"""
        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        if not is_admin and str(place.user_id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        try:
            facade.delete_place_image(image_id)
            return {"message": "Image deleted successfully"}, 200
        except ValueError as e:
            return {"Error": str(e)}, 404


@api.route('/<place_id>/bookings')
class PlaceBookingList(Resource):
    @jwt_required()
    @api.response(200, 'List of bookings for the place retrieved successfully')
    @api.response(403, 'Unauthorized action')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get all bookings for a place (place owner or admin only)"""
        place = facade.get_place(place_id)
        if not place:
            return {"Error": "Place not found"}, 404
        current_user_id = get_jwt_identity()
        is_admin = get_jwt().get('is_admin', False)
        if not is_admin and str(place.user_id) != str(current_user_id):
            return {"Error": "Unauthorized action"}, 403
        return [b.to_dict() for b in facade.get_bookings_by_place(place_id)], 200
