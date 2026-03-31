import os


class Config:
    SECRET_KEY = os.getenv(
        'SECRET_KEY',
        'dev-only-flask-secret-change-me-before-sharing'
    )
    JWT_SECRET_KEY = os.getenv(
        'JWT_SECRET_KEY',
        'dev-only-jwt-secret-change-me-before-sharing-at-least-32-bytes'
    )
    DEBUG = False


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///development.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

config = {
    'development': DevelopmentConfig,
    'default': DevelopmentConfig
}
