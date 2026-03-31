from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt

api = Namespace('amenities', description='Amenity operations')

amenity_model = api.model('Amenity', {
    'name': fields.String(required=True, description='Name of the amenity')
})


@api.route('/')
class AmenityList(Resource):
    @jwt_required()
    @api.expect(amenity_model)
    @api.response(201, 'Amenity successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new amenity"""
        current_user = get_jwt()
        if not current_user.get('is_admin'):
            return {'Error': 'Admin privileges required'}, 403
        try:
            amenity = facade.create_amenity(api.payload)
            return amenity.to_dict(), 201
        except (ValueError, TypeError) as e:
            return {"Error":  str(e)}, 400

    @api.response(200, 'List of amenities retrieved successfully')
    def get(self):
        """Retrieve a list of all amenities"""
        all_amenities = facade.get_all_amenities()
        return [x.to_dict() for x in all_amenities], 200


@api.route('/<amenity_id>')
class AmenityResource(Resource):
    @api.response(200, 'Amenity details retrieved successfully')
    @api.response(404, 'Amenity not found')
    def get(self, amenity_id):
        """Get amenity details by ID"""
        amenity = facade.get_amenity(amenity_id)
        if not amenity:
            return {"Error": "Amenity not found"}, 404
        return amenity.to_dict(), 200

    @jwt_required()
    @api.response(200, 'Amenity deleted successfully')
    @api.response(404, 'Amenity not found')
    @api.response(403, 'Admin privileges required')
    def delete(self, amenity_id):
        """Delete an amenity"""
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        if not is_admin:
            return {'Error': 'Admin privileges required'}, 403
        try:
            facade.delete_amenity(amenity_id)
            return {"message": "Amenity deleted successfully"}, 200
        except ValueError as e:
            return {"Error": str(e)}, 404

    @jwt_required()
    @api.expect(amenity_model)
    @api.response(200, 'Amenity updated successfully')
    @api.response(404, 'Amenity not found')
    @api.response(400, 'Invalid input data')
    def put(self, amenity_id):
        """Update an amenity's information"""
        current_user = get_jwt()
        if not current_user.get('is_admin'):
            return {'Error': 'Admin privileges required'}, 403
        try:
            amenity = facade.update_amenity(amenity_id, api.payload)
            return amenity.to_dict(), 200
        except TypeError as e:
            return {"Error": str(e)}, 400
        except ValueError as e:
            return {"Error": str(e)}, 404
