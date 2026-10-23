from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection

profile_bp = Blueprint("profile", __name__)
MAX_IMAGE_CHARS = 2_000_000

@profile_bp.route("", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, email, role, status, profile_image, created_at FROM users WHERE id=%s",
            (user_id,),
        )
        user = cur.fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "User not found."}), 404
    user["created_at"] = user["created_at"].isoformat()
    return jsonify({"user": user})

@profile_bp.route("", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)
    name = data.get("name")
    profile_image = data.get("profile_image")

    if profile_image and len(profile_image) > MAX_IMAGE_CHARS:
        return jsonify({"error": "Image is too large. Please use a smaller photo (under ~1.5MB)."}), 400

    fields, values = [], []
    if name:
        fields.append("name=%s"); values.append(name.strip())
    if profile_image is not None:
        fields.append("profile_image=%s"); values.append(profile_image)
    if not fields:
        return jsonify({"error": "Nothing to update."}), 400

    values.append(user_id)
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=%s", values)
    conn.close()
    return jsonify({"message": "Profile updated."})