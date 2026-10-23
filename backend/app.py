from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

from routes.auth import auth_bp
from routes.events import events_bp
from routes.bookings import bookings_bp
from routes.waitlist import waitlist_bp
from routes.venue import venue_bp
from routes.crowd import crowd_bp
from routes.profile import profile_bp
from routes.admin import admin_bp


from datetime import timedelta

def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
    CORS(app)
    JWTManager(app)
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(events_bp, url_prefix="/api/events")
    app.register_blueprint(bookings_bp, url_prefix="/api/bookings")
    app.register_blueprint(waitlist_bp, url_prefix="/api/waitlist")
    app.register_blueprint(venue_bp, url_prefix="/api/venue")
    app.register_blueprint(crowd_bp, url_prefix="/api/crowd")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "smart-event-booking-backend"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
