from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
from dsa.queue_ds import Queue
from routes.events import get_event_booking_status

waitlist_bp = Blueprint("waitlist", __name__)


@waitlist_bp.route("/join", methods=["POST"])
@jwt_required()
def join_waitlist():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)
    event_id = data.get("event_id")
    seats_needed = int(data.get("seats_needed", 1))

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT event_date FROM events WHERE id=%s", (event_id,))
        ev = cur.fetchone()
        if not ev:
            conn.close()
            return jsonify({"error": "Event not found."}), 404
        closure = get_event_booking_status(ev["event_date"])
        if closure["is_booking_closed"]:
            conn.close()
            return jsonify({"error": f"Cannot join waiting list: {closure['booking_closure_reason']}"}), 403

        cur.execute(
            "SELECT id FROM waiting_list WHERE user_id=%s AND event_id=%s",
            (user_id, event_id),
        )
        if cur.fetchone():
            conn.close()
            return jsonify({"error": "Already on the waiting list for this event."}), 409
        cur.execute(
            "INSERT INTO waiting_list (user_id, event_id, seats_needed) VALUES (%s,%s,%s)",
            (user_id, event_id, seats_needed),
        )
        cur.execute("SELECT * FROM waiting_list WHERE event_id=%s ORDER BY joined_at ASC", (event_id,))
        rows = cur.fetchall()
    conn.close()

    q = Queue()
    for r in rows:
        q.enqueue(r)
    position = q.position_of(lambda item: item["user_id"] == user_id)

    return jsonify({"message": "Joined waiting list.", "position": position, "technique_used": "Queue (FIFO)"}), 201


@waitlist_bp.route("/event/<int:event_id>", methods=["GET"])
def waitlist_for_event(event_id):
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM waiting_list WHERE event_id=%s ORDER BY joined_at ASC", (event_id,))
        rows = cur.fetchall()
    conn.close()
    for r in rows:
        r["joined_at"] = r["joined_at"].isoformat()
    return jsonify({"waiting_list": rows, "count": len(rows)})
