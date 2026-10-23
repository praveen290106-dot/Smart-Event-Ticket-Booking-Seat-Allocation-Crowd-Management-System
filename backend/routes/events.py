from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from db import get_connection
from dsa.sorting import quick_sort
from dsa.searching import binary_search
from dsa.bst import BST
from dsa.binary_tree import CATEGORY_TREE, preorder as tree_preorder

events_bp = Blueprint("events", __name__)


def get_event_booking_status(event_date):
    """
    Returns dict with booking closure info:
    - If now >= event_date: closed_past ("Event date exceeded")
    - If now >= event_date - 1 day: closed_cutoff ("Day before event date")
    - Else: open
    """
    if isinstance(event_date, str):
        try:
            event_dt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
        except Exception:
            event_dt = datetime.now()
    else:
        event_dt = event_date

    now = datetime.now()
    if event_dt.tzinfo is not None:
        event_dt = event_dt.replace(tzinfo=None)

    cutoff_dt = event_dt - timedelta(days=1)

    if now >= event_dt:
        return {
            "is_booking_closed": True,
            "booking_closure_type": "closed_past",
            "booking_closure_reason": "This event has already taken place. Ticket booking is closed.",
            "cutoff_date": cutoff_dt.isoformat(),
        }
    elif now >= cutoff_dt:
        return {
            "is_booking_closed": True,
            "booking_closure_type": "closed_cutoff",
            "booking_closure_reason": "Ticket booking is closed: bookings close 1 day (24 hours) prior to the event date to finalize venue seating.",
            "cutoff_date": cutoff_dt.isoformat(),
        }
    else:
        return {
            "is_booking_closed": False,
            "booking_closure_type": "open",
            "booking_closure_reason": None,
            "cutoff_date": cutoff_dt.isoformat(),
        }


def _seat_type_and_price(row, rows_count, price_general, price_premium, price_vip):
    """First 1/4 rows = VIP, next 1/4 = Premium, rest = General."""
    if row < max(1, rows_count // 4):
        return "vip", float(price_vip)
    if row < max(2, rows_count // 2):
        return "premium", float(price_premium)
    return "general", float(price_general)


@events_bp.route("", methods=["GET"])
def list_events():
    """List events. Ranked using Quick Sort (Module 5)."""
    sort_by = request.args.get("sort_by", "popularity")  # popularity | date | price | seats
    order = request.args.get("order", "desc")

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("""SELECT e.*, u.name AS organizer_name 
                       FROM events e 
                       JOIN users u ON e.organizer_id = u.id 
                       WHERE e.status='approved'""")
        rows = cur.fetchall()
    conn.close()

    if sort_by == "date":
        key = lambda e: e["event_date"]
    elif sort_by == "price":
        key = lambda e: float(e["price_general"])
    elif sort_by == "seats":
        key = lambda e: e["rows_count"] * e["seats_per_row"]
    else:
        key = lambda e: e["popularity"]

    sorted_events = quick_sort(rows, key=key, reverse=(order == "desc"))
    for e in sorted_events:
        closure = get_event_booking_status(e["event_date"])
        e.update(closure)
        e["event_date"] = e["event_date"].isoformat()
        e["created_at"] = e["created_at"].isoformat()
    return jsonify({"events": sorted_events, "sorted_by": sort_by, "order": order, "technique": "Quick Sort"})


@events_bp.route("/search", methods=["GET"])
def search_event():
    """Look up a single event by ID using Binary Search over a
    Quick-Sort-ordered array (Module 5)."""
    event_id = request.args.get("id", type=int)
    if not event_id:
        return jsonify({"error": "Provide ?id=<event_id>"}), 400

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM events WHERE status='approved'")
        rows = cur.fetchall()
    conn.close()

    sorted_rows = quick_sort(rows, key=lambda e: e["id"])
    found, steps = binary_search(sorted_rows, event_id, key=lambda e: e["id"])
    if found:
        closure = get_event_booking_status(found["event_date"])
        found.update(closure)
        found["event_date"] = found["event_date"].isoformat()
        found["created_at"] = found["created_at"].isoformat()
    return jsonify({"result": found, "comparisons": steps, "technique": "Binary Search"})


@events_bp.route("/categories", methods=["GET"])
def categories():
    """Event category hierarchy from the Binary Tree (Module 3)."""
    return jsonify({"tree": tree_preorder(CATEGORY_TREE)})


@events_bp.route("/<int:event_id>", methods=["GET"])
def get_event(event_id):
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM events WHERE id=%s", (event_id,))
        event = cur.fetchone()
        if not event:
            conn.close()
            return jsonify({"error": "Event not found."}), 404
        cur.execute("SELECT * FROM seats WHERE event_id=%s ORDER BY row_num, col_num", (event_id,))
        seats = cur.fetchall()
    conn.close()

    closure = get_event_booking_status(event["event_date"])
    event.update(closure)
    event["event_date"] = event["event_date"].isoformat()
    event["created_at"] = event["created_at"].isoformat()

    # Build a BST index of seats keyed by seat id for fast individual lookup (Module 3)
    seat_index = BST()
    for s in seats:
        seat_index.insert(s["id"], s)

    occupied = sum(1 for s in seats if s["status"] == "booked")
    total = len(seats)
    occupancy_pct = round((occupied / total) * 100, 1) if total else 0

    return jsonify({
        "event": event,
        "seats": seats,
        "occupancy_pct": occupancy_pct,
        "seat_count": total,
        "booked_count": occupied,
    })


@events_bp.route("", methods=["POST"])
@jwt_required()
def create_event():
    """Organizer creates an event; seat grid is generated and priced."""
    claims = get_jwt()
    if claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Only organizers can create events."}), 403

    data = request.get_json(force=True)
    required = ["title", "category", "venue", "event_date"]
    if any(not data.get(f) for f in required):
        return jsonify({"error": "title, category, venue, and event_date are required."}), 400

    rows_count = int(data.get("rows_count", 6))
    seats_per_row = int(data.get("seats_per_row", 8))
    price_general = float(data.get("price_general", 500))
    price_premium = float(data.get("price_premium", 1000))
    price_vip = float(data.get("price_vip", 2000))
    poster_image = data.get("poster_image")
    venue_image = data.get("venue_image")

    organizer_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO events
               (organizer_id, title, category, description, venue, event_date,
                rows_count, seats_per_row, price_general, price_premium, price_vip,
                popularity, poster_image, venue_image)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (organizer_id, data["title"], data["category"], data.get("description", ""),
             data["venue"], data["event_date"], rows_count, seats_per_row,
             price_general, price_premium, price_vip, 0, poster_image, venue_image),
        )
        event_id = cur.lastrowid

        seat_rows = []
        for r in range(rows_count):
            row_letter = chr(65 + r) if r < 26 else f"R{r}"
            seat_type, price = _seat_type_and_price(r, rows_count, price_general, price_premium, price_vip)
            for c in range(seats_per_row):
                label = f"{row_letter}{c + 1}"
                seat_rows.append((event_id, r, c, label, seat_type, price))

        cur.executemany(
            """INSERT INTO seats (event_id, row_num, col_num, seat_label, seat_type, price)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            seat_rows,
        )
    conn.close()
    return jsonify({"message": "Event created.", "event_id": event_id}), 201


@events_bp.route("/organizer/mine", methods=["GET"])
@jwt_required()
def my_events():
    organizer_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM events WHERE organizer_id=%s ORDER BY created_at DESC", (organizer_id,))
        rows = cur.fetchall()
    conn.close()
    for e in rows:
        e["event_date"] = e["event_date"].isoformat()
        e["created_at"] = e["created_at"].isoformat()
    return jsonify({"events": rows})

@events_bp.route("/<int:event_id>/analytics", methods=["GET"])
@jwt_required()
def event_analytics(event_id):
    claims = get_jwt()
    organizer_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM events WHERE id=%s", (event_id,))
        event = cur.fetchone()
        if not event:
            conn.close()
            return jsonify({"error": "Event not found."}), 404
        if claims.get("role") != "admin" and event["organizer_id"] != organizer_id:
            conn.close()
            return jsonify({"error": "You do not own this event."}), 403

        cur.execute(
            """SELECT DATE(created_at) AS day, COUNT(*) AS bookings, SUM(total_price) AS revenue
               FROM bookings WHERE event_id=%s AND status='confirmed'
               GROUP BY DATE(created_at) ORDER BY day ASC""", (event_id,))
        by_day = cur.fetchall()
        cur.execute(
            """SELECT ticket_type, COUNT(*) AS bookings, SUM(total_price) AS revenue
               FROM bookings WHERE event_id=%s AND status='confirmed' GROUP BY ticket_type""", (event_id,))
        by_ticket_type = cur.fetchall()
        cur.execute(
            """SELECT seat_type, COUNT(*) AS total,
                      SUM(CASE WHEN status='booked' THEN 1 ELSE 0 END) AS booked
               FROM seats WHERE event_id=%s GROUP BY seat_type""", (event_id,))
        occupancy = cur.fetchall()
    conn.close()

    for row in by_day:
        row["day"] = row["day"].isoformat(); row["revenue"] = float(row["revenue"] or 0)
    for row in by_ticket_type:
        row["revenue"] = float(row["revenue"] or 0)
    for row in occupancy:
        row["occupancy_pct"] = round((row["booked"] / row["total"]) * 100, 1) if row["total"] else 0

    return jsonify({
        "event_title": event["title"], "bookings_by_day": by_day,
        "revenue_by_ticket_type": by_ticket_type, "occupancy_by_seat_type": occupancy,
    })