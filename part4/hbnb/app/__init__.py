import os
from flask import Flask, send_from_directory
from flask_restx import Api
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from config import DevelopmentConfig

bcrypt = Bcrypt()
cors = CORS()

jwt = JWTManager()
db = SQLAlchemy()


def create_app(config_class=DevelopmentConfig):
    app = Flask(__name__, static_folder='../frontend/static', static_url_path='/static')
    app.config.from_object(config_class)
    bcrypt.init_app(app)
    app.config["JWT_SECRET_KEY"] = app.config.get("JWT_SECRET_KEY")
    jwt.init_app(app)
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    from app.api.v1.users import api as users_ns
    from app.api.v1.amenities import api as amenities_ns
    from app.api.v1.places import api as places_ns
    from app.api.v1.reviews import api as reviews_ns
    from app.api.v1.auth import api as auth_ns
    from app.api.v1.protected import api as protected_ns
    from app.api.v1.bookings import api as bookings_ns
    from app.api.v1.wishlist import api as wishlist_ns
    from app.api.v1.notifications import api as notifications_ns
    from app.api.v1.messages import api as messages_ns
    # Import models so db.create_all() picks them up
    from app.models import place_image  # noqa: F401
    from app.models import wishlist as _wishlist_model  # noqa: F401
    from app.models import notification as _notification_model  # noqa: F401
    from app.models import message as _message_model  # noqa: F401

    # Serve frontend files (registered before Flask-RESTX to avoid conflicts)
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

    @app.route('/')
    @app.route('/index.html')
    def index():
        return send_from_directory(os.path.join(frontend_dir, 'templates'), 'index.html')

    @app.route('/<path:filename>')
    def frontend(filename):
        templates_dir = os.path.join(frontend_dir, 'templates')
        if os.path.isfile(os.path.join(templates_dir, filename)):
            return send_from_directory(templates_dir, filename)
        return send_from_directory(frontend_dir, filename)

    api = Api(
        app,
        version='1.0',
        title='HBnB API',
        description='HBnB Application API',
        doc='/api/docs'
    )

    # Register namespaces
    api.add_namespace(users_ns, path='/api/v1/users')
    api.add_namespace(amenities_ns, path='/api/v1/amenities')
    api.add_namespace(places_ns, path='/api/v1/places')
    api.add_namespace(reviews_ns, path='/api/v1/reviews')
    api.add_namespace(auth_ns, path='/api/v1/auth')
    api.add_namespace(protected_ns, path='/api/v1/protected')
    api.add_namespace(bookings_ns, path='/api/v1/bookings')
    api.add_namespace(wishlist_ns, path='/api/v1/wishlist')
    api.add_namespace(notifications_ns, path='/api/v1/notifications')
    api.add_namespace(messages_ns, path='/api/v1/messages')

    with app.app_context():
        db.create_all()
        # Add columns that may be missing from databases created before this migration
        _apply_migrations(db)

    return app


def _apply_migrations(db):
    """Idempotent schema migrations for columns added after initial db.create_all()."""
    migrations = [
        "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)",
        "ALTER TABLE places ADD COLUMN picture VARCHAR(255)",
        "ALTER TABLE reviews ADD COLUMN cleanliness INTEGER",
        "ALTER TABLE reviews ADD COLUMN location INTEGER",
        "ALTER TABLE reviews ADD COLUMN value_score INTEGER",
        "ALTER TABLE reviews ADD COLUMN communication INTEGER",
    ]
    for stmt in migrations:
        try:
            db.session.execute(text(stmt))
            db.session.commit()
        except Exception:
            db.session.rollback()  # Column already exists — skip
