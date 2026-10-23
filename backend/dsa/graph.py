"""
Graph (Adjacency List) + BFS
Used for: venue navigation - nearest exit (BFS)
(Module 4). A single static venue graph is used for the demo venue.
"""
from collections import deque, defaultdict


class VenueGraph:
    def __init__(self):
        self.adj = defaultdict(list)
        self.nodes = set()
        self.node_meta = {}

    def add_node(self, name, **meta):
        """Register a node with optional metadata (node_type, seat_type, pos_x, pos_y)."""
        self.nodes.add(name)
        if name not in self.node_meta:
            self.node_meta[name] = dict(meta)
        else:
            self.node_meta[name].update(meta)

    def add_edge(self, u, v):
        self.adj[u].append(v)
        self.adj[v].append(u)
        self.nodes.add(u)
        self.nodes.add(v)

    def bfs_nearest(self, start, targets=None, target_prefixes=None):
        """Shortest path from start to nearest target exit node. O(V + E).
        
        Matches if:
        1. Node is explicitly in targets (set/list/dict), or
        2. Node's node_type is 'exit' (e.g. customized map exit nodes), or
        3. Node name contains 'exit' (case-insensitive, e.g. exit1, exit2, vip-exit, Exit-North), or
        4. Node name starts with any prefix in target_prefixes (case-insensitive).
        """
        if start not in self.nodes:
            return None

        # Build target matcher
        target_set = set()
        prefixes = []

        if isinstance(targets, (set, list, tuple, dict)):
            for t in targets:
                if t in self.nodes:
                    target_set.add(t)
                else:
                    prefixes.append(str(t).lower())
        elif callable(targets):
            pass

        if target_prefixes:
            for p in target_prefixes:
                prefixes.append(str(p).lower())

        def is_target(node):
            if callable(targets):
                return targets(node, self.node_meta.get(node, {}))
            if node in target_set:
                return True
            meta = self.node_meta.get(node, {})
            if meta.get("node_type") == "exit":
                return True
            lower_name = str(node).lower()
            if "exit" in lower_name:
                return True
            for p in prefixes:
                if lower_name.startswith(p) or p in lower_name:
                    return True
            return False

        visited = {start}
        q = deque([(start, [start])])
        while q:
            node, path = q.popleft()
            if is_target(node):
                return path
            for nxt in self.adj[node]:
                if nxt not in visited:
                    visited.add(nxt)
                    q.append((nxt, path + [nxt]))
        return None



def build_demo_venue():
    g = VenueGraph()
    edges = [
        ("Entrance", "Lobby"), ("Lobby", "Zone-VIP"), ("Lobby", "Zone-Premium"),
        ("Lobby", "Food-Court"), ("Zone-VIP", "Zone-Premium"), ("Zone-Premium", "Zone-General-A"),
        ("Zone-General-A", "Zone-General-B"), ("Zone-General-B", "Restroom-1"),
        ("Zone-General-A", "Exit-North"), ("Zone-Premium", "Exit-East"), ("Zone-VIP", "Exit-East"),
        ("Food-Court", "Restroom-2"), ("Food-Court", "Exit-South"), ("Zone-General-B", "Parking"),
        ("Parking", "Exit-South"),
    ]
    for u, v in edges:
        g.add_edge(u, v)
    return g


# Default template used to seed a brand-new event's venue layout, including
# canvas positions. Organizers can edit or replace this via the venue-builder
# endpoints in routes/venue.py.
DEFAULT_VENUE_TEMPLATE = {
    "nodes": [
        {"name": "Entrance", "node_type": "entrance", "seat_type": "none", "pos_x": 260, "pos_y": 40},
        {"name": "Lobby", "node_type": "amenity", "seat_type": "none", "pos_x": 260, "pos_y": 120},
        {"name": "Zone-VIP", "node_type": "zone", "seat_type": "vip", "pos_x": 140, "pos_y": 210},
        {"name": "Zone-Premium", "node_type": "zone", "seat_type": "premium", "pos_x": 260, "pos_y": 210},
        {"name": "Food-Court", "node_type": "amenity", "seat_type": "none", "pos_x": 400, "pos_y": 150},
        {"name": "Zone-General-A", "node_type": "zone", "seat_type": "general", "pos_x": 260, "pos_y": 300},
        {"name": "Zone-General-B", "node_type": "zone", "seat_type": "general", "pos_x": 260, "pos_y": 390},
        {"name": "Restroom-1", "node_type": "amenity", "seat_type": "none", "pos_x": 380, "pos_y": 420},
        {"name": "Restroom-2", "node_type": "amenity", "seat_type": "none", "pos_x": 460, "pos_y": 220},
        {"name": "Exit-North", "node_type": "exit", "seat_type": "none", "pos_x": 140, "pos_y": 390},
        {"name": "Exit-East", "node_type": "exit", "seat_type": "none", "pos_x": 420, "pos_y": 260},
        {"name": "Exit-South", "node_type": "exit", "seat_type": "none", "pos_x": 400, "pos_y": 460},
        {"name": "Parking", "node_type": "amenity", "seat_type": "none", "pos_x": 260, "pos_y": 460},
    ],
    "edges": [
        ("Entrance", "Lobby"), ("Lobby", "Zone-VIP"), ("Lobby", "Zone-Premium"),
        ("Lobby", "Food-Court"), ("Zone-VIP", "Zone-Premium"), ("Zone-Premium", "Zone-General-A"),
        ("Zone-General-A", "Zone-General-B"), ("Zone-General-B", "Restroom-1"),
        ("Zone-General-A", "Exit-North"), ("Zone-Premium", "Exit-East"), ("Zone-VIP", "Exit-East"),
        ("Food-Court", "Restroom-2"), ("Food-Court", "Exit-South"), ("Zone-General-B", "Parking"),
        ("Parking", "Exit-South"),
    ],
}


def graph_from_rows(node_rows, edge_rows):
    """Build a VenueGraph from DB rows: node_rows have 'name' and 'node_type' fields,
    edge_rows have 'from_node'/'to_node' or 'from'/'to' fields."""
    g = VenueGraph()
    for n in node_rows:
        g.add_node(
            n["name"],
            node_type=n.get("node_type"),
            seat_type=n.get("seat_type"),
            pos_x=n.get("pos_x"),
            pos_y=n.get("pos_y"),
        )
    for e in edge_rows:
        u = e.get("from_node") or e.get("from")
        v = e.get("to_node") or e.get("to")
        if u and v:
            g.add_edge(u, v)
    return g


VENUE = build_demo_venue()  # kept for any legacy import; no longer used by routes/venue.py