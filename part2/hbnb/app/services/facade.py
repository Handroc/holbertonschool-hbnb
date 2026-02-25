from app.persistence.repository import InMemoryRepository
from models.user import User
from models.review import Review

class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()

################ USER ##################### 

    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute('email', email)
    
    def put_user(self, user_id, data):
        return self.user_repo.update(user_id, data)
    
    def patch(self, user_id: str, data: dict):
        if 'email' in data:
            existing_user = self.get_user_by_email(data['email'])
            if existing_user and existing_user.id != user_id:
                return None
        updated_user = self.user_repo.update(user_id, data)
        return updated_user

    def delete_user(self, user_id):
        return self.user_repo.delete(user_id)

############### REVIEW ########################

    def create_review(self, review_data):
        review = Review(**review_data)
        self.review_repo.add(review)
        return review
    
    def get_review(self, review_id):
        return self.review_repo.get(review_id)
    
    def get_review_by_user(self, user):
        return self.review_repo.get_by_attribute('user', user)

    def put_review(self, review_id, data):
        return self.review_repo.update(review_id, data)
    
    def patch_review(self, review_id: str, data: dict):
        return self.review_repo.update(review_id, data)
    
    def delete_review(self, review_id):
        return self.review_repo.delete(review_id)
