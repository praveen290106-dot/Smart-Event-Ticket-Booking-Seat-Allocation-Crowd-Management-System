import React, { useEffect, useState } from "react";
import api from "../api";
import { useTheme } from "../ThemeContext";

function densityColor(pct) {
  if (pct == null) return "#4E4B63";
  if (pct < 40) return "#34D399";
  if (pct < 70) return "#7C9CFF";
  if (pct < 90) return "#E8B84B";
  return "#FB7185";
}

export default function VenueCrowd() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const NODE_FILL = {
    entrance: isDark ? "#6B6685" : "#64748B",
    exit: isDark ? "#F1EFF7" : "#DCFCE7",
    amenity: isDark ? "#7C9CFF" : "#3B82F6",
  };
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [fromNode, setFromNode] = useState(null);
  const [exitPath, setExitPath] = useState(null);
  const [density, setDensity] = useState([]);

  useEffect(() => {
    api.get("/events").then(({ data }) => {
      setEvents(data.events);
      if (data.events.length) setEventId(data.events[0].id);
    });
  }, []);

  const loadLayout = async (id) => {
    const { data } = await api.get(`/venue/${id}/layout`);
    setNodes(data.nodes);
    setEdges(data.edges);
    setFromNode(data.nodes.find((n) => n.node_type === "zone")?.name || data.nodes[0]?.name || null);
    setExitPath(null);
  };

  const loadDensity = async (id) => {
    const { data } = await api.get("/crowd/density");
    setDensity(data.events[id]?.zones || []);
  };

  useEffect(() => {
    if (eventId) { loadLayout(eventId); loadDensity(eventId); }
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoneOccupancy = {};
  nodes.forEach((n) => {
    if (n.node_type === "zone" && n.seat_type !== "none") {
      const match = density.find((z) => z.zone === n.seat_type);
      if (match) zoneOccupancy[n.name] = match.occupancy_pct;
    }
  });

  const findExit = async () => {
    const { data } = await api.get(`/venue/${eventId}/nearest-exit?from=${encodeURIComponent(fromNode)}`);
    setExitPath(data);
  };

  const highlightSet = new Set(exitPath?.path || []);
  const nodeByName = Object.fromEntries(nodes.map((n) => [n.name, n]));

  const pathEdgeSet = new Set();
  if (exitPath?.path && exitPath.path.length > 1) {
    for (let i = 0; i < exitPath.path.length - 1; i++) {
      const u = exitPath.path[i];
      const v = exitPath.path[i + 1];
      pathEdgeSet.add(`${u}__${v}`);
      pathEdgeSet.add(`${v}__${u}`);
    }
  }

  const destinationExit = exitPath?.path && exitPath.path.length > 0
    ? exitPath.path[exitPath.path.length - 1]
    : null;

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h2>Venue &amp; crowd management</h2>
          <p style={{ margin: "4px 0 0" }}>
            Each event has its own venue map — a <strong>Graph</strong> under the hood.
            <strong> BFS</strong> finds the nearest exit,
            and zones are tinted live by that event's crowd density.
          </p>
        </div>
        <div className="field" style={{ minWidth: 240, margin: 0 }}>
          <select value={eventId || ""} onChange={(e) => setEventId(Number(e.target.value))}>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
      </div>

      {!eventId ? (
        <div className="card empty-state">No events yet.</div>
      ) : (
        <>
          <div className="grid-2" style={{ gridTemplateColumns: "1.3fr 1fr", alignItems: "start", marginBottom: 30 }}>
            <div className="card float-box">
              <svg
                viewBox="0 0 520 500"
                style={{
                  width: "100%",
                  height: "auto",
                  background: isDark ? "#080612" : "#F8FCF9",
                  borderRadius: 12,
                  border: isDark ? "1px solid rgba(168,85,247,0.22)" : "1px solid rgba(16,185,129,0.3)",
                }}
              >
                {edges.map((e, i) => {
                  const a = nodeByName[e.from], b = nodeByName[e.to];
                  if (!a || !b) return null;
                  const isHighlighted = pathEdgeSet.has(`${e.from}__${e.to}`);
                  return (
                    <line
                      key={i}
                      x1={a.pos_x}
                      y1={a.pos_y}
                      x2={b.pos_x}
                      y2={b.pos_y}
                      stroke={
                        isHighlighted
                          ? (isDark ? "#C084FC" : "#059669")
                          : (isDark ? "rgba(255,255,255,0.22)" : "#94A3B8")
                      }
                      strokeWidth={isHighlighted ? 4.5 : 2}
                      strokeLinecap="round"
                    />
                  );
                })}
                {nodes.map((n) => {
                  const pct = zoneOccupancy[n.name];
                  const fill = n.node_type === "zone" ? densityColor(pct) : (NODE_FILL[n.node_type] || (isDark ? "#6B6685" : "#64748B"));
                  const isOnPath = highlightSet.has(n.name);
                  const isStart = fromNode === n.name;
                  const isDestination = destinationExit === n.name;

                  const strokeColor = isStart
                    ? (isDark ? "#C084FC" : "#7C3AED")
                    : isDestination
                    ? (isDark ? "#34D399" : "#059669")
                    : isOnPath
                    ? (isDark ? "#A78BFA" : "#047857")
                    : (n.node_type === "exit"
                      ? (isDark ? "#C084FC" : "#059669")
                      : (isDark ? "rgba(255,255,255,0.4)" : "#475569"));

                  const strokeWidth = isStart || isDestination ? 4 : isOnPath ? 3.5 : 2;
                  const radius = isStart || isDestination ? 17 : isOnPath ? 15 : 13;

                  const labelColor = isOnPath
                    ? (isDark ? "#FFFFFF" : "#064E3B")
                    : (isDark ? "#C4B5FD" : "#0F172A");

                  return (
                    <g key={n.name} style={{ cursor: "pointer" }} onClick={() => setFromNode(n.name)}>
                      <circle cx={n.pos_x} cy={n.pos_y} r={radius} fill={fill}
                        stroke={strokeColor} strokeWidth={strokeWidth} />
                      <text
                        x={n.pos_x}
                        y={n.pos_y + 28}
                        textAnchor="middle"
                        fontSize={isOnPath ? "11.5" : "11"}
                        fill={labelColor}
                        fontWeight={isOnPath ? "800" : "600"}
                      >
                        {n.name}
                      </text>
                      {n.node_type === "zone" && pct != null && (
                        <text x={n.pos_x} y={n.pos_y + 4} textAnchor="middle" fontSize="9" fill={isDark ? "#0A0A12" : "#0F172A"} fontWeight="800">
                          {pct}%
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="seat-legend">
                <div className="item"><span className="swatch" style={{ background: isDark ? "#34D399" : "#10B981" }} /> Low crowd</div>
                <div className="item"><span className="swatch" style={{ background: isDark ? "#7C9CFF" : "#3B82F6" }} /> Moderate</div>
                <div className="item"><span className="swatch" style={{ background: isDark ? "#E8B84B" : "#F59E0B" }} /> High</div>
                <div className="item"><span className="swatch" style={{ background: isDark ? "#FB7185" : "#EF4444" }} /> Very high</div>
                <div className="item">
                  <span className="swatch" style={{ background: isDark ? "#F1EFF7" : "#DCFCE7", border: isDark ? "1px solid #C084FC" : "1px solid #059669" }} /> Exit
                </div>
              </div>
            </div>

            <div className="card float-box">
              <h3 style={{ fontSize: 16 }}>Navigate</h3>
              <div className="field">
                <label>Starting point (or click a node on the map)</label>
                <select value={fromNode || ""} onChange={(e) => setFromNode(e.target.value)}>
                  {nodes.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm" onClick={findExit}>Find nearest exit (BFS)</button>
              </div>

              {exitPath && (
                <div className="card" style={{ marginTop: 16, background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
                    Nearest exit path {exitPath.distance_hops != null ? `(${exitPath.distance_hops} ${exitPath.distance_hops === 1 ? "hop" : "hops"})` : ""}:
                  </div>
                  {exitPath.path ? (
                    <div>
                      {exitPath.distance_hops === 0 ? (
                        <div style={{ color: "#34D399", fontWeight: 600, fontSize: 13.5 }}>
                          ✓ You are already at an exit node ({exitPath.path[0]})!
                        </div>
                      ) : (
                        <div style={{ color: "#34D399", fontWeight: 700, fontSize: 14 }}>
                          {exitPath.path.join(" → ")}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 6 }}>
                        Algorithm: {exitPath.technique_used}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#FB7185", fontSize: 13 }}>
                      {exitPath.has_exits === false
                        ? "⚠️ No exit nodes found in this venue layout. Please designate at least one Exit node in Venue Builder."
                        : `No reachable path found from '${exitPath.from}' to an exit.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Live crowd density for this event</h3>
          {density.length === 0 ? (
            <div className="card empty-state">No bookings yet for this event.</div>
          ) : (
            <div className="card float-box" style={{ maxWidth: 460 }}>
              {density.map((z) => (
                <div key={z.zone} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ textTransform: "capitalize" }}>{z.zone}</span>
                    <span>{z.occupancy_pct}% · {z.level}</span>
                  </div>
                  <div className={`occ-bar occ-${z.level.toLowerCase().replace(" ", "-")}`}>
                    <div className="fill" style={{ width: `${z.occupancy_pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}