from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('reviews', description='Review operations')

# Define the review model for input validation and documentation
review_model = api.model('Review', {
    'user_id': fields.String(required=True, description='ID of the user who made the review'),
    'place_id': fields.String(required=True, description='ID of the place being reviewed'),
    'text': fields.String(required=True, description='Text of the review')
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
        return {'id': review.id, 'user_id': review.user_id, 'place_id': review.place_id, 'text': review.text}, 200
