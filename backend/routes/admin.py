from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import get_connection

admin_bp = Blueprint("admin", __name__)


def _require_admin(claims):
    return claims.get("role") == "admin"


@admin_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='user'")
        users = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='organizer'")
        organizers = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM events")
        events = cur.fetchone()["c"]
        cur.execute("SELECT COUNT(*) AS c FROM bookings WHERE status='confirmed'")
        bookings = cur.fetchone()["c"]
        cur.execute("SELECT COALESCE(SUM(total_price),0) AS r FROM bookings WHERE status='confirmed'")
        revenue = float(cur.fetchone()["r"])
    conn.close()

    return jsonify({
        "users": users, "organizers": organizers, "events": events,
        "confirmed_bookings": bookings, "total_revenue": revenue,
    })


@admin_bp.route("/events", methods=["GET"])
@jwt_required()
def all_events():
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("""SELECT e.*, u.name AS organizer_name FROM events e
                       JOIN users u ON e.organizer_id = u.id ORDER BY e.created_at DESC""")
        rows = cur.fetchall()
    conn.close()
    for r in rows:
        r["event_date"] = r["event_date"].isoformat()
        r["created_at"] = r["created_at"].isoformat()
    return jsonify({"events": rows})


@admin_bp.route("/events/<int:event_id>/status", methods=["POST"])
@jwt_required()
def set_event_status(event_id):
    from flask import request
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403
    status = request.get_json(force=True).get("status")
    if status not in ("approved", "rejected", "pending"):
        return jsonify({"error": "Invalid status."}), 400

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("UPDATE events SET status=%s WHERE id=%s", (status, event_id))
    conn.close()
    return jsonify({"message": f"Event status set to {status}."})

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id, name, email, role, status, profile_image, created_at
               FROM users WHERE role IN ('user','organizer') ORDER BY created_at DESC""")
        rows = cur.fetchall()
    conn.close()
    for r in rows:
        r["created_at"] = r["created_at"].isoformat()
    return jsonify({"users": rows})

@admin_bp.route("/users/<int:user_id>/status", methods=["POST"])
@jwt_required()
def set_user_status(user_id):
    from flask import request
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403
    status = request.get_json(force=True).get("status")
    if status not in ("active", "suspended"):
        return jsonify({"error": "Invalid status."}), 400
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET status=%s WHERE id=%s", (status, user_id))
    conn.close()
    return jsonify({"message": f"Account set to {status}."})

@admin_bp.route("/analytics/system", methods=["GET"])
@jwt_required()
def system_analytics():
    claims = get_jwt()
    if not _require_admin(claims):
        return jsonify({"error": "Admin access required."}), 403
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT DATE(created_at) AS day, COUNT(*) AS bookings, SUM(total_price) AS revenue
               FROM bookings WHERE status='confirmed' GROUP BY DATE(created_at) ORDER BY day ASC""")
        bookings_over_time = cur.fetchall()
        cur.execute(
            """SELECT e.category, COUNT(b.id) AS bookings, COALESCE(SUM(b.total_price),0) AS revenue
               FROM events e LEFT JOIN bookings b ON b.event_id = e.id AND b.status='confirmed'
               GROUP BY e.category""")
        by_category = cur.fetchall()
        cur.execute("SELECT title, popularity FROM events ORDER BY popularity DESC LIMIT 5")
        top_events = cur.fetchall()
        cur.execute(
            """SELECT DATE(created_at) AS day, COUNT(*) AS signups
               FROM users WHERE role='user' GROUP BY DATE(created_at) ORDER BY day ASC""")
        signups_over_time = cur.fetchall()
    conn.close()
    for row in bookings_over_time:
        row["day"] = row["day"].isoformat(); row["revenue"] = float(row["revenue"] or 0)
    for row in by_category:
        row["revenue"] = float(row["revenue"] or 0)
    for row in signups_over_time:
        row["day"] = row["day"].isoformat()
    return jsonify({
        "bookings_over_time": bookings_over_time, "revenue_by_category": by_category,
        "top_events": top_events, "signups_over_time": signups_over_time,
    })