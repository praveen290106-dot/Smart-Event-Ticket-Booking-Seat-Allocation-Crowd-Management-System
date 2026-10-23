from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from db import get_connection
from dsa.graph import graph_from_rows, DEFAULT_VENUE_TEMPLATE

venue_bp = Blueprint("venue", __name__)


def _load_layout(conn, event_id):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM venue_nodes WHERE event_id=%s", (event_id,))
        nodes = cur.fetchall()
        cur.execute("SELECT * FROM venue_edges WHERE event_id=%s", (event_id,))
        edges = cur.fetchall()
    return nodes, edges


def _require_event_owner(conn, event_id, claims, user_id):
    with conn.cursor() as cur:
        cur.execute("SELECT organizer_id FROM events WHERE id=%s", (event_id,))
        event = cur.fetchone()
    if not event:
        return "Event not found.", 404
    if claims.get("role") != "admin" and event["organizer_id"] != user_id:
        return "You do not own this event.", 403
    return None, None


@venue_bp.route("/<int:event_id>/layout", methods=["GET"])
def get_layout(event_id):
    """Returns this event's venue nodes (with x/y + type) and edges.
    Falls back to the default template if the organizer hasn't customized it."""
    conn = get_connection()
    nodes, edges = _load_layout(conn, event_id)
    conn.close()

    if not nodes:
        nodes = [{**n, "id": None} for n in DEFAULT_VENUE_TEMPLATE["nodes"]]
        edges = [{"from_node": a, "to_node": b} for a, b in DEFAULT_VENUE_TEMPLATE["edges"]]

    return jsonify({
        "nodes": [{"name": n["name"], "node_type": n["node_type"], "seat_type": n["seat_type"],
                   "pos_x": n["pos_x"], "pos_y": n["pos_y"]} for n in nodes],
        "edges": [{"from": e["from_node"], "to": e["to_node"]} for e in edges],
    })


@venue_bp.route("/<int:event_id>/layout", methods=["PUT"])
@jwt_required()
def save_layout(event_id):
    """Organizer (or admin) replaces this event's venue layout entirely."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    conn = get_connection()

    err, code = _require_event_owner(conn, event_id, claims, user_id)
    if err:
        conn.close()
        return jsonify({"error": err}), code

    data = request.get_json(force=True)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    names = {n["name"] for n in nodes}
    for e in edges:
        if e["from"] not in names or e["to"] not in names:
            conn.close()
            return jsonify({"error": f"Edge references an unknown node: {e}"}), 400

    with conn.cursor() as cur:
        cur.execute("DELETE FROM venue_edges WHERE event_id=%s", (event_id,))
        cur.execute("DELETE FROM venue_nodes WHERE event_id=%s", (event_id,))
        if nodes:
            cur.executemany(
                """INSERT INTO venue_nodes (event_id, name, node_type, seat_type, pos_x, pos_y)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                [(event_id, n["name"], n.get("node_type", "amenity"), n.get("seat_type", "none"),
                  int(n["pos_x"]), int(n["pos_y"])) for n in nodes],
            )
        if edges:
            cur.executemany(
                "INSERT INTO venue_edges (event_id, from_node, to_node) VALUES (%s,%s,%s)",
                [(event_id, e["from"], e["to"]) for e in edges],
            )
    conn.close()
    return jsonify({"message": "Venue layout saved."})


@venue_bp.route("/<int:event_id>/nearest-exit", methods=["GET"])
def nearest_exit(event_id):
    conn = get_connection()
    node_rows, edge_rows = _load_layout(conn, event_id)
    conn.close()
    if not node_rows:
        node_rows = DEFAULT_VENUE_TEMPLATE["nodes"]
        edge_rows = [{"from_node": a, "to_node": b} for a, b in DEFAULT_VENUE_TEMPLATE["edges"]]

    g = graph_from_rows(node_rows, edge_rows)
    start = request.args.get("from") or next(iter(g.nodes), None)

    # Identify all exit targets from layout:
    # 1. Explicit exit node types (node_type == 'exit')
    # 2. Case-insensitive substring matching ('exit' in node name)
    exit_nodes = {
        n["name"] for n in node_rows
        if n.get("node_type") == "exit" or "exit" in str(n.get("name", "")).lower()
    }
    if not exit_nodes:
        exit_nodes = {name for name in g.nodes if "exit" in str(name).lower()}

    has_exits = bool(exit_nodes)
    path = g.bfs_nearest(start, targets=exit_nodes) if (start and has_exits) else None
    return jsonify({
        "from": start,
        "path": path,
        "distance_hops": (len(path) - 1) if path else None,
        "technique_used": "BFS (shortest path in hops)",
        "has_exits": has_exits,
        "exit_nodes": sorted(list(exit_nodes)),
    })
