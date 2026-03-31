from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

api = Namespace('reviews', description='Review operations')

# Define the review model for input validation and documentation
review_model = api.model('Review', {
    'text': fields.String(required=True, description='Text of the review'),
    'rating': fields.Integer(required=True, description='Rating of the place (1-5)'),
    'user_id': fields.String(required=True, description='ID of the user'),
    'place_id': fields.String(required=True, description='ID of the place')
})

review_model_update = api.model('ReviewUpdate', {
    'text': fields.String(required=False, description='Text of the review'),
    'rating': fields.Integer(required=False, description='Rating of the place (1-5)')
})

@api.route('/')
class ReviewList(Resource):
    @jwt_required()
    @api.expect(review_model)
    @api.response(201, 'Review successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new review"""
        current_user = get_jwt_identity()
        payload = api.payload
        if not isinstance(payload, dict):
            return {"Error": "Invalid payload"}, 400
        required_fields = ["text", "rating", "place_id"]
        missing_fields = [field for field in required_fields if field not in payload]
        if missing_fields:
            return {"Error": f"Missing required fields: {', '.join(missing_fields)}"}, 400
        payload["user_id"] = current_user
        place = facade.get_place(payload["place_id"])
        if not place:
            return {"Error": "Place not found"}, 404
        if place.owner.id == current_user:
            return {"Error": 'You cannot review your own place'}, 400
        already_reviewed = any(rev.user_id == current_user for rev in place.reviews)
        if already_reviewed:
            return {"Error": "You have already reviewed this place"}, 400
        try:
            review = facade.create_review(payload)
            return review.to_dict(), 201
        except (ValueError, TypeError) as e:
            return {"Error": str(e)}, 400

    @api.response(200, 'List of reviews retrieved successfully')
    def get(self):
        """Retrieve a list of all reviews"""
        all_reviews = facade.get_all_reviews()
        return [x.to_dict() for x in all_reviews], 200

@api.route('/<review_id>')
class ReviewResource(Resource):
    @api.response(200, 'Review details retrieved successfully')
    @api.response(404, 'Review not found')
    def get(self, review_id):
        """Get review details by ID"""
        review = facade.get_review(review_id)
        if not review:
            return {"Error": "Review not found"}, 404
        return review.to_dict(), 200

    @jwt_required()
    @api.expect(review_model_update)
    @api.response(200, 'Review updated successfully')
    @api.response(404, 'Review not found')
    @api.response(400, 'Invalid input data')
    def put(self, review_id):
        """Update a review's information"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        current_review = facade.get_review(review_id)
        if not current_review:
            return {"Error": "Review not found"}, 404
        if current_review.user_id != current_user_id and not is_admin:
            return {"Error": 'Unauthorized action'}, 403
        try:
            review = facade.update_review(review_id, api.payload)
            return review.to_dict(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400
        except TypeError as e:
            return {"Error": str(e)}, 404

    @jwt_required()
    @api.response(200, 'Review deleted successfully')
    @api.response(404, 'Review not found')
    def delete(self, review_id):
        """Delete a review"""
        current_user_id = get_jwt_identity()
        current_user = get_jwt()
        is_admin = current_user.get('is_admin', False)
        review = facade.get_review(review_id)
        if not review:
            return {"Error": "Review not found"}, 404
        if review.user_id != current_user_id and not is_admin:
            return {"Error": 'Unauthorized action'}, 403
        try:
            facade.delete_review(review_id)
            return {"Message": "Review deleted successfully"}, 200
        except (TypeError, ValueError):
            return {"Error": "Review not found"}, 404
