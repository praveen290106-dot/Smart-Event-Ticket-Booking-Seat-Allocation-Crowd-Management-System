import React, { useEffect, useState } from "react";
import api from "../api";
import { useTheme } from "../ThemeContext";

const NODE_TYPES = ["entrance", "zone", "exit", "amenity"];

export default function VenueBuilder({ eventId }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const NODE_COLOR = {
    entrance: isDark ? "#6B6685" : "#64748B",
    zone: isDark ? "#8B5CF6" : "#10B981",
    exit: isDark ? "#F1EFF7" : "#DCFCE7",
    amenity: isDark ? "#7C9CFF" : "#3B82F6",
  };
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [pendingType, setPendingType] = useState("zone");
  const [pendingSeatType, setPendingSeatType] = useState("general");
  const [linkFrom, setLinkFrom] = useState(null);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (eventId) {
      api.get(`/venue/${eventId}/layout`).then(({ data }) => {
        setNodes(data.nodes);
        setEdges(data.edges);
      });
    }
  }, [eventId]);

  const handleCanvasClick = (e) => {
    if (linkFrom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 520);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 500);
    const name = window.prompt(`Name this ${pendingType} node:`);
    if (!name || !name.trim()) return;
    if (nodes.some((n) => n.name === name.trim())) {
      setError("A node with that name already exists.");
      return;
    }
    setNodes([...nodes, {
      name: name.trim(), node_type: pendingType,
      seat_type: pendingType === "zone" ? pendingSeatType : "none",
      pos_x: x, pos_y: y,
    }]);
    setError("");
  };

  const handleNodeClick = (name, e) => {
    e.stopPropagation();
    if (!linkFrom) {
      setLinkFrom(name);
      setSelected(name);
      return;
    }
    if (linkFrom === name) {
      setLinkFrom(null);
      setSelected(null);
      return;
    }
    const exists = edges.some(
      (ed) => (ed.from === linkFrom && ed.to === name) || (ed.from === name && ed.to === linkFrom)
    );
    if (!exists) setEdges([...edges, { from: linkFrom, to: name }]);
    setLinkFrom(null);
    setSelected(null);
  };

  const deleteNode = (name) => {
    setNodes(nodes.filter((n) => n.name !== name));
    setEdges(edges.filter((e) => e.from !== name && e.to !== name));
    if (selected === name) setSelected(null);
  };

  const deleteEdge = (idx) => setEdges(edges.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.put(`/venue/${eventId}/layout`, { nodes, edges });
      setMessage("Venue layout saved.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save layout.");
    } finally {
      setBusy(false);
    }
  };

  if (!eventId) return <div className="card empty-state">Create an event first, then design its venue here.</div>;

  return (
    <div>
      <div className="grid-2" style={{ gridTemplateColumns: "1fr 260px", alignItems: "start", gap: 20 }}>
        <div className="card float-box">
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Click empty space to <strong>add a node</strong> of the selected type below. Click one node then
            another to <strong>connect</strong> them with a path. Click a node again to cancel a pending link.
          </p>
          <svg
            viewBox="0 0 520 500"
            style={{ width: "100%", height: "auto", background: "var(--surface)", borderRadius: 10, cursor: "crosshair" }}
            onClick={handleCanvasClick}
          >
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.name === e.from);
              const b = nodes.find((n) => n.name === e.to);
              if (!a || !b) return null;
              return (
                <g key={i}>
                  <line x1={a.pos_x} y1={a.pos_y} x2={b.pos_x} y2={b.pos_y} stroke={isDark ? "rgba(255,255,255,0.22)" : "#94A3B8"} strokeWidth={2} strokeLinecap="round" />
                  <circle
                    cx={(a.pos_x + b.pos_x) / 2} cy={(a.pos_y + b.pos_y) / 2} r={7}
                    fill="rgba(251,113,133,0.18)" stroke="var(--red)" strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                    onClick={(ev) => { ev.stopPropagation(); deleteEdge(i); }}
                  />
                </g>
              );
            })}
            {nodes.map((n) => (
              <g key={n.name} onClick={(e) => handleNodeClick(n.name, e)} style={{ cursor: "pointer" }}>
                <circle cx={n.pos_x} cy={n.pos_y} r={14} fill={NODE_COLOR[n.node_type]}
                  stroke={linkFrom === n.name ? "#E8B84B" : (n.node_type === "exit" ? (isDark ? "#C084FC" : "#059669") : (isDark ? "rgba(255,255,255,0.5)" : "#475569"))} strokeWidth={linkFrom === n.name ? 3 : 2} />
                <text x={n.pos_x} y={n.pos_y + 27} textAnchor="middle" fontSize="11" fill={isDark ? "#C4B5FD" : "#0F172A"} fontWeight="600">{n.name}</text>
              </g>
            ))}
          </svg>
          <div className="seat-legend">
            {NODE_TYPES.map((t) => (
              <div className="item" key={t}><span className="swatch" style={{ background: NODE_COLOR[t] }} /> {t}</div>
            ))}
          </div>
        </div>

        <div className="card float-box">
          <h3 style={{ fontSize: 15 }}>Add node</h3>
          <div className="field">
            <label>Type</label>
            <select value={pendingType} onChange={(e) => setPendingType(e.target.value)}>
              {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {pendingType === "zone" && (
            <div className="field">
              <label>Seat type this zone represents</label>
              <select value={pendingSeatType} onChange={(e) => setPendingSeatType(e.target.value)}>
                <option value="general">General</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          )}
          <p style={{ fontSize: 12.5 }}>Click empty canvas space to place a node of this type.</p>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>Nodes ({nodes.length})</h3>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {nodes.map((n) => (
              <div key={n.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13 }}>
                <span>{n.name} <span className="tag" style={{ marginLeft: 4 }}>{n.node_type}</span></span>
                <button className="btn btn-sm btn-danger" onClick={() => deleteNode(n.name)}>✕</button>
              </div>
            ))}
          </div>

          {error && <div className="error-banner" style={{ marginTop: 14 }}>{error}</div>}
          {message && <div className="success-banner" style={{ marginTop: 14 }}>{message}</div>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={handleSave} disabled={busy}>
            {busy ? "Saving..." : "Save venue layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
