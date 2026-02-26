from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('reviews', description='Review operations')

# Define the review model for input validation and documentation
review_model = api.model('Review', {
    'text': fields.String(required=True, description='Text of the review'),
    'rating': fields.Integer(required=False, min=1, max=5, description='The rate the user gave to the review'),
    'place_id': fields.String(required=True, description='IDs place being reviewed'),
    'user_id': fields.String(required=True, description='IDs user who made the review')
}) 
@api.route('/')
class ReviewList(Resource):
    @api.expect(review_model, validate=True)
    @api.response(201, 'Review successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Create a new review"""
        review_data = api.payload

        # Simulate review creation (to be replaced by real logic with persistence)
        new_review = facade.create_review(review_data)
        return {'id': new_review.id, 'user_id': new_review.user_id, 'place_id': new_review.place_id, 'text': new_review.text}, 201
    
@api.route('/<review_id>')
class ReviewResource(Resource):
    @api.response(200, 'Review details retrieved successfully')
    @api.response(404, 'Review not found')
    def get(self, review_id):
        """Get review details by ID"""
        review = facade.get_review(review_id)
        if not review:
            return {'error': 'Review not found'}, 404
        return {'id': review.id, 'text': review.text, 'rating': review.rating, 'place_id': review.place_id, 'user_id': review.user_id}, 200

    def put(self, review_id):
        review = facade.get_review(review_id)
        updated_review = facade.put_review(review_id, api.payload)
        if not review:
            return {'error': 'Review not found'}, 404
        return {
            'id': updated_review.id,
            'text': updated_review.text,
            'rating': updated_review.rating,
            'place_id': updated_review.place_id,
            'user_id': updated_review.user_id
        }, 200
    
    def patch(self, review_id):
        if not review_id:
            return {'error': 'Review not found'}, 404
        payload = api.payload or {}    
        updated_review = facade.patch_review(review_id, payload)
        if not updated_review:
            return {'error': 'Review not found'}, 404
        return {
            'id': updated_review.id,
            'text': updated_review.text,
            'rating': updated_review.rating,
            'place_id': updated_review.place_id,
            'user_id': updated_review.user_id
        }, 200
    
    def delete(self, review_id):
        review = facade.get_review(review_id)
        if not review:
            return {'error': 'Review not found'}, 404
        facade.delete_review(review_id)
        return {'message': 'Review deleted'}, 200

@api.route('/user/<user_id>')
class ReviewByUser(Resource):
    def get(self, user_id):
        """Get review details by user"""
        review = facade.get_review_by_user(user_id)
        if not review:
            return {'error': 'Review not found'}, 404
        elif not user_id:
            return {'error': 'User not found'}, 404
        return {'id': review.id, 'text': review.text, 'rating': review.rating, 'place_id': review.place_id, 'user_id': review.user_id}, 200
