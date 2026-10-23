import React, { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api";
import { useAuth } from "../AuthContext";
import VenueBuilder from "./VenueBuilder";

const CATEGORY_PRESETS = ["concert", "sports", "festival", "exhibition"];
const PIE_COLORS = ["#8B5CF6", "#7C9CFF", "#E8B84B"];

const emptyForm = {
  title: "", category: "concert", customCategory: "", description: "", venue: "", event_date: "",
  rows_count: 6, seats_per_row: 8, price_general: 500, price_premium: 1000, price_vip: 2000,
  poster_image: null, venue_image: null,
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("create"); // create | events | venue | analytics
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const posterInput = useRef(null);
  const venueInput = useRef(null);

  const loadEvents = async () => {
    const { data } = await api.get("/events/organizer/mine");
    setEvents(data.events);
    if (!selectedEventId && data.events.length) setSelectedEventId(data.events[0].id);
  };

  useEffect(() => { loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "analytics" && selectedEventId) {
      api.get(`/events/${selectedEventId}/analytics`).then(({ data }) => setAnalytics(data));
    }
  }, [tab, selectedEventId]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleImage = (field) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1_500_000) { setError("Image must be under 1.5MB."); return; }
    const dataUrl = await fileToDataUrl(file);
    setForm({ ...form, [field]: dataUrl });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const category = form.category === "other" ? form.customCategory.trim() : form.category;
      if (!category) {
        setError("Please provide a category.");
        setBusy(false);
        return;
      }
      const { data } = await api.post("/events", { ...form, category });
      setMessage(`Event #${data.event_id} created by Organizer #${user?.id} and its seat map generated.`);
      setForm(emptyForm);
      await loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2>Organizer dashboard</h2>
            {user && (
              <span className="tag" style={{ fontSize: 12, padding: "4px 10px" }}>
                Organizer ID: #{user.id}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0" }}>Manage your events, seating maps, and view ticket performance.</p>
        </div>
      </div>

      <div className="pill-steps" style={{ marginBottom: 26 }}>
        {["create", "events", "venue", "analytics"].map((t) => (
          <button key={t} className={`step ${tab === t ? "done" : ""}`} style={{ cursor: "pointer", border: "none", textTransform: "capitalize" }} onClick={() => setTab(t)}>
            {t === "create" ? "Create Event" : t === "events" ? "My Events" : t === "venue" ? "Venue Map" : "Analytics"}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="card float-box" style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: 16 }}>Create a new event</h3>
          {error && <div className="error-banner">{error}</div>}
          {message && <div className="success-banner">{message}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Title</label>
              <input required value={form.title} onChange={handleChange("title")} placeholder="Indie Rock Night" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={handleChange("category")}>
                  {CATEGORY_PRESETS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                  <option value="other">Other (custom)...</option>
                </select>
              </div>
              <div className="field">
                <label>Venue</label>
                <input required value={form.venue} onChange={handleChange("venue")} placeholder="City Arena" />
              </div>
            </div>
            {form.category === "other" && (
              <div className="field">
                <label>Custom category name</label>
                <input value={form.customCategory} onChange={handleChange("customCategory")} placeholder="e.g. Comedy Show" />
              </div>
            )}
            <div className="field">
              <label>Date &amp; time</label>
              <input type="datetime-local" required value={form.event_date} onChange={handleChange("event_date")} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={handleChange("description")} placeholder="What's this event about?" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Poster image</label>
                <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => posterInput.current.click()}>
                  {form.poster_image ? "Change poster" : "Upload poster"}
                </button>
                <input ref={posterInput} type="file" accept="image/*" onChange={handleImage("poster_image")} style={{ display: "none" }} />
                {form.poster_image && <div style={{ height: 80, marginTop: 8, borderRadius: 8, background: `center/cover no-repeat url(${form.poster_image})` }} />}
              </div>
              <div className="field">
                <label>Venue photo</label>
                <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => venueInput.current.click()}>
                  {form.venue_image ? "Change photo" : "Upload venue photo"}
                </button>
                <input ref={venueInput} type="file" accept="image/*" onChange={handleImage("venue_image")} style={{ display: "none" }} />
                {form.venue_image && <div style={{ height: 80, marginTop: 8, borderRadius: 8, background: `center/cover no-repeat url(${form.venue_image})` }} />}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Rows</label>
                <input type="number" min={1} max={20} value={form.rows_count} onChange={handleChange("rows_count")} />
              </div>
              <div className="field">
                <label>Seats per row</label>
                <input type="number" min={1} max={20} value={form.seats_per_row} onChange={handleChange("seats_per_row")} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>General price (₹)</label>
                <input type="number" value={form.price_general} onChange={handleChange("price_general")} />
              </div>
              <div className="field">
                <label>Premium price (₹)</label>
                <input type="number" value={form.price_premium} onChange={handleChange("price_premium")} />
              </div>
            </div>
            <div className="field">
              <label>VIP price (₹)</label>
              <input type="number" value={form.price_vip} onChange={handleChange("price_vip")} />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Creating..." : "Create event"}
            </button>
          </form>
        </div>
      )}

      {tab === "events" && (
        events.length === 0 ? (
          <div className="card empty-state">No events yet — create your first one.</div>
        ) : (
          <div className="grid-3">
            {events.map((ev) => (
              <div className="card float-box" key={ev.id}>
                {ev.poster_image && <div style={{ height: 100, borderRadius: 8, marginBottom: 10, background: `center/cover no-repeat url(${ev.poster_image})` }} />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-soft)" }}>{ev.venue} · {new Date(ev.event_date).toLocaleDateString()}</div>
                  </div>
                  <span className={`tag ${ev.status === "approved" ? "tag-teal" : ev.status === "rejected" ? "tag-red" : "tag-amber"}`}>
                    {ev.status}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, margin: "10px 0 8px", flexWrap: "wrap" }}>
                  <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                    Event ID: #{ev.id}
                  </span>
                  <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                    Organizer ID: #{ev.organizer_id || user?.id}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
                  {ev.rows_count * ev.seats_per_row} seats · {ev.popularity} bookings
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "venue" && (
        <div>
          <div className="field" style={{ maxWidth: 380, marginBottom: 20 }}>
            <label>Select event to design</label>
            <select value={selectedEventId || ""} onChange={(e) => setSelectedEventId(Number(e.target.value))}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>Event ID: #{ev.id} — {ev.title}</option>)}
            </select>
          </div>
          <VenueBuilder eventId={selectedEventId} />
        </div>
      )}

      {tab === "analytics" && (
        <div>
          <div className="field" style={{ maxWidth: 380, marginBottom: 20 }}>
            <label>Select event</label>
            <select value={selectedEventId || ""} onChange={(e) => setSelectedEventId(Number(e.target.value))}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>Event ID: #{ev.id} — {ev.title}</option>)}
            </select>
          </div>

          {analytics && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="card float-box">
                <h3 style={{ fontSize: 15 }}>
                  Bookings &amp; revenue over time — {analytics.event_title}{" "}
                  <span style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 400 }}>
                    (Event ID: #{selectedEventId} · Organizer ID: #{user?.id})
                  </span>
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={analytics.bookings_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#8B5CF6" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#34D399" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid-2">
                <div className="card float-box">
                  <h3 style={{ fontSize: 15 }}>Revenue by ticket type</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={analytics.revenue_by_ticket_type} dataKey="revenue" nameKey="ticket_type" outerRadius={80} label>
                        {analytics.revenue_by_ticket_type.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card float-box">
                  <h3 style={{ fontSize: 15 }}>Occupancy by seat type</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analytics.occupancy_by_seat_type}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <XAxis dataKey="seat_type" fontSize={12} />
                      <YAxis fontSize={12} unit="%" />
                      <Tooltip />
                      <Bar dataKey="occupancy_pct" fill="#E8B84B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}