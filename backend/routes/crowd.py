from flask import Blueprint, jsonify
from db import get_connection

crowd_bp = Blueprint("crowd", __name__)


def _classify(pct):
    if pct < 40:
        return "Low"
    if pct < 70:
        return "Moderate"
    if pct < 90:
        return "High"
    return "Very High"


@crowd_bp.route("/density", methods=["GET"])
def crowd_density():
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id AS event_id, e.title, s.seat_type,
                   COUNT(*) AS total,
                   SUM(CASE WHEN s.status='booked' THEN 1 ELSE 0 END) AS booked
            FROM events e JOIN seats s ON s.event_id = e.id
            WHERE e.status='approved'
            GROUP BY e.id, s.seat_type
        """)
        rows = cur.fetchall()
    conn.close()

    grouped = {}
    for r in rows:
        pct = round((r["booked"] / r["total"]) * 100, 1) if r["total"] else 0
        grouped.setdefault(r["event_id"], {"title": r["title"], "zones": []})
        grouped[r["event_id"]]["zones"].append({
            "zone": r["seat_type"],
            "occupancy_pct": pct,
            "level": _classify(pct),
        })

    return jsonify({"events": grouped})
