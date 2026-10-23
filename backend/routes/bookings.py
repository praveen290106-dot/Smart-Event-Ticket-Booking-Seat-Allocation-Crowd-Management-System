import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
from dsa.backtracking import find_contiguous_block, nearest_available_seat
from dsa.linked_list import LinkedList
from dsa.stack_ds import Stack
from dsa.queue_ds import Queue
from routes.events import get_event_booking_status

bookings_bp = Blueprint("bookings", __name__)

# In-memory undo stacks, one per user (process-local; resets on server restart).
# This demonstrates the Stack data structure operating on live booking actions.
_undo_stacks = {}


def _get_undo_stack(user_id):
    if user_id not in _undo_stacks:
        _undo_stacks[user_id] = Stack(max_size=25)
    return _undo_stacks[user_id]


def _seat_grid(seats, rows_count, seats_per_row):
    """Build {(row,col): 'available'|'booked'} for the Backtracking search."""
    grid = {}
    for s in seats:
        grid[(s["row_num"], s["col_num"])] = s["status"]
    return grid


@bookings_bp.route("/book", methods=["POST"])
@jwt_required()
def book_seats():
    user_id = int(get_jwt_identity())
    data = request.get_json(force=True)
    event_id = data.get("event_id")
    selected_seat_ids = data.get("selected_seat_ids")
    payment_method = data.get("payment_method", "upi")

    if payment_method not in ("card", "upi", "netbanking", "wallet"):
        return jsonify({"error": "Invalid payment method."}), 400
    if not event_id:
        return jsonify({"error": "event_id is required."}), 400

    if selected_seat_ids:
        if not isinstance(selected_seat_ids, list) or len(selected_seat_ids) == 0:
            return jsonify({"error": "Please select at least one seat."}), 400
        seat_ids = [int(x) for x in selected_seat_ids]
        seats_needed = len(seat_ids)
        ticket_type = data.get("ticket_type", "general")
    else:
        seats_needed = int(data.get("seats_needed", 1))
        ticket_type = data.get("ticket_type", "general")
        if ticket_type not in ("general", "premium", "vip"):
            return jsonify({"error": "ticket_type must be general, premium, or vip."}), 400
        if seats_needed < 1:
            return jsonify({"error": "A valid seats_needed is required."}), 400

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM events WHERE id=%s", (event_id,))
        event = cur.fetchone()
        if not event:
            conn.close()
            return jsonify({"error": "Event not found."}), 404

        closure = get_event_booking_status(event["event_date"])
        if closure["is_booking_closed"]:
            conn.close()
            return jsonify({
                "error": closure["booking_closure_reason"],
                "is_booking_closed": True,
                "closure_type": closure["booking_closure_type"],
            }), 403

        if selected_seat_ids:
            format_strings = ','.join(['%s'] * len(seat_ids))
            cur.execute(f"SELECT * FROM seats WHERE id IN ({format_strings}) AND event_id=%s", (*seat_ids, event_id))
            chosen_seats = cur.fetchall()
            if len(chosen_seats) != len(seat_ids):
                conn.close()
                return jsonify({"error": "Some selected seats do not exist for this event."}), 400

            unavailable = [s["seat_label"] for s in chosen_seats if s["status"] != "available"]
            if unavailable:
                conn.close()
                return jsonify({
                    "error": f"Seat(s) {', '.join(unavailable)} are already booked. Please choose other seats.",
                    "sold_out": False,
                }), 409

            total_price = sum(float(s["price"]) for s in chosen_seats)
            types = set(s["seat_type"] for s in chosen_seats)
            if len(types) == 1:
                ticket_type = list(types)[0]
            else:
                ticket_type = "vip" if "vip" in types else "premium" if "premium" in types else "general"
            technique = "Custom Seat Selection"
        else:
            cur.execute("SELECT * FROM seats WHERE event_id=%s", (event_id,))
            seats = cur.fetchall()
            typed_seats = [s for s in seats if s["seat_type"] == ticket_type]
            grid = _seat_grid(typed_seats, event["rows_count"], event["seats_per_row"])

            if seats_needed == 1:
                pick = nearest_available_seat(grid, event["rows_count"], event["seats_per_row"])
                block = [pick] if pick else None
                technique = "Nearest-seat scan"
            else:
                block = find_contiguous_block(grid, event["rows_count"], event["seats_per_row"], seats_needed)
                technique = "Backtracking"

            if not block:
                conn.close()
                return jsonify({
                    "error": f"No {'seat' if seats_needed == 1 else f'contiguous block of {seats_needed} seats'} "
                             f"available in {ticket_type.upper()}. Join the waiting list or try another ticket type.",
                    "sold_out": True,
                }), 409

            seat_lookup = {(s["row_num"], s["col_num"]): s for s in typed_seats}
            chosen_seats = [seat_lookup[pos] for pos in block]
            seat_ids = [s["id"] for s in chosen_seats]
            total_price = sum(float(s["price"]) for s in chosen_seats)

        cur.executemany("UPDATE seats SET status='booked' WHERE id=%s", [(sid,) for sid in seat_ids])

        payment_ref = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        qr_code = f"QR-{uuid.uuid4().hex[:12].upper()}"
        booking_type = "group" if seats_needed > 1 else "single"
        cur.execute(
            """INSERT INTO bookings
               (user_id, event_id, seat_ids, booking_type, qr_code, total_price, ticket_type, payment_method)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (user_id, event_id, ",".join(str(s) for s in seat_ids), booking_type, qr_code,
             total_price, ticket_type, payment_method),
        )
        booking_id = cur.lastrowid
        cur.execute("UPDATE events SET popularity = popularity + 1 WHERE id=%s", (event_id,))
    conn.close()

    _get_undo_stack(user_id).push({"action": "book", "booking_id": booking_id, "event_id": event_id})

    return jsonify({
        "message": "Payment successful. Booking confirmed.",
        "booking_id": booking_id,
        "seats": [s["seat_label"] for s in chosen_seats],
        "ticket_type": ticket_type,
        "total_price": total_price,
        "qr_code": qr_code,
        "payment_reference": payment_ref,
        "payment_method": payment_method,
        "technique_used": technique,
    }), 201


@bookings_bp.route("/my-bookings", methods=["GET"])
@jwt_required()
def my_bookings():
    """Booking history rebuilt through a Linked List (Module 1):
    each row is inserted at the head so the most recent booking
    surfaces first, then the whole list is traversed for the response."""
    user_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT b.*, e.title, e.venue, e.event_date
               FROM bookings b JOIN events e ON b.event_id = e.id
               WHERE b.user_id=%s ORDER BY b.created_at ASC""",
            (user_id,),
        )
        rows = cur.fetchall()
    conn.close()

    history = LinkedList()
    for row in rows:
        row["created_at"] = row["created_at"].isoformat()
        row["event_date"] = row["event_date"].isoformat()
        history.insert(row)  # insert-at-head -> most recent ends up first

    return jsonify({
        "bookings": history.traverse(),
        "technique_used": "Linked List (insert-at-head + traverse)",
    })


@bookings_bp.route("/cancel/<int:booking_id>", methods=["POST"])
@jwt_required()
def cancel_booking(booking_id):
    user_id = int(get_jwt_identity())
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM bookings WHERE id=%s AND user_id=%s", (booking_id, user_id))
        booking = cur.fetchone()
        if not booking or booking["status"] == "cancelled":
            conn.close()
            return jsonify({"error": "Active booking not found."}), 404

        seat_ids = [int(x) for x in booking["seat_ids"].split(",")]
        cur.executemany("UPDATE seats SET status='available' WHERE id=%s", [(sid,) for sid in seat_ids])
        cur.execute("UPDATE bookings SET status='cancelled' WHERE id=%s", (booking_id,))

        # Offer the freed seat to the next person in the waiting Queue (FIFO)
        cur.execute(
            "SELECT * FROM waiting_list WHERE event_id=%s ORDER BY joined_at ASC LIMIT 1",
            (booking["event_id"],),
        )
        next_in_line = cur.fetchone()
        notified = None
        if next_in_line:
            cur.execute("DELETE FROM waiting_list WHERE id=%s", (next_in_line["id"],))
            notified = next_in_line["user_id"]
    conn.close()

    _get_undo_stack(user_id).push({"action": "cancel", "booking_id": booking_id, "seat_ids": seat_ids})

    return jsonify({
        "message": "Booking cancelled.",
        "notified_waiting_user_id": notified,
        "technique_used": "Queue (FIFO waiting-list dequeue)",
    })


@bookings_bp.route("/undo", methods=["POST"])
@jwt_required()
def undo_last_action():
    """Pop the most recent booking/cancellation action off the user's Stack."""
    user_id = int(get_jwt_identity())
    stack = _get_undo_stack(user_id)
    last = stack.pop()
    if not last:
        return jsonify({"error": "Nothing to undo."}), 404

    conn = get_connection()
    with conn.cursor() as cur:
        if last["action"] == "book":
            cur.execute("SELECT * FROM bookings WHERE id=%s", (last["booking_id"],))
            booking = cur.fetchone()
            if booking and booking["status"] == "confirmed":
                seat_ids = [int(x) for x in booking["seat_ids"].split(",")]
                cur.executemany("UPDATE seats SET status='available' WHERE id=%s", [(sid,) for sid in seat_ids])
                cur.execute("UPDATE bookings SET status='cancelled' WHERE id=%s", (last["booking_id"],))
                result = "Undid booking: seats released."
        elif last["action"] == "cancel":
            cur.execute("SELECT * FROM bookings WHERE id=%s", (last["booking_id"],))
            booking = cur.fetchone()
            if booking and booking["status"] == "cancelled":
                cur.executemany("UPDATE seats SET status='booked' WHERE id=%s", [(sid,) for sid in last["seat_ids"]])
                cur.execute("UPDATE bookings SET status='confirmed' WHERE id=%s", (last["booking_id"],))
                result = "Undid cancellation: booking restored."
        else:
            result = "No matching action."
    conn.close()

    return jsonify({"message": result, "technique_used": "Stack (LIFO pop)"})


@bookings_bp.route("/undo-history", methods=["GET"])
@jwt_required()
def undo_history():
    user_id = int(get_jwt_identity())
    stack = _get_undo_stack(user_id)
    return jsonify({"stack": stack.to_list()})

@bookings_bp.route("/verify-qr", methods=["POST"])
@jwt_required()
def verify_qr():
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    if claims.get("role") not in ("organizer", "admin"):
        return jsonify({"error": "Only organizers or admins can verify tickets."}), 403

    qr_code = (request.get_json(force=True).get("qr_code") or "").strip()
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT b.*, e.title, e.venue FROM bookings b
               JOIN events e ON b.event_id = e.id WHERE b.qr_code=%s""",
            (qr_code,),
        )
        booking = cur.fetchone()
        if not booking:
            conn.close()
            return jsonify({"valid": False, "reason": "No booking found for this QR code."}), 404
        if booking["status"] == "cancelled":
            conn.close()
            return jsonify({"valid": False, "reason": "This booking was cancelled."}), 409
        if booking["qr_status"] == "used":
            conn.close()
            return jsonify({"valid": False, "reason": "This ticket has already been used for entry."}), 409
        cur.execute("UPDATE bookings SET qr_status='used' WHERE id=%s", (booking["id"],))
    conn.close()

    return jsonify({
        "valid": True, "message": "Entry granted.",
        "event_id": booking["event_id"], "user_id": booking["user_id"], "booking_id": booking["id"],
        "event_title": booking["title"], "venue": booking["venue"],
        "seats": booking["seat_ids"], "ticket_type": booking["ticket_type"],
    })