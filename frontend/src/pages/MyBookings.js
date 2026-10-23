import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/bookings/my-bookings");
    setBookings(data.bookings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id) => {
    setError(""); setMessage("");
    try {
      const { data } = await api.post(`/bookings/cancel/${id}`);
      setMessage(data.notified_waiting_user_id
        ? "Cancelled — the next person on the waiting Queue has been notified."
        : "Booking cancelled.");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not cancel booking.");
    }
  };

  const handleUndo = async () => {
    setError(""); setMessage("");
    try {
      const { data } = await api.post("/bookings/undo");
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Nothing to undo.");
    }
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2>User dashboard</h2>
            {user && (
              <span className="tag" style={{ fontSize: 12, padding: "4px 10px" }}>
                User ID: #{user.id}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0" }}>
            My bookings · History rebuilt from a <strong>Linked List</strong> (most recent first). Reversals use a <strong>Stack</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link to="/events" className="btn btn-primary" style={{ textDecoration: "none" }}>+ Explore &amp; Book Events</Link>
          <Link to="/venue" className="btn btn-outline" style={{ textDecoration: "none" }}>Venue Map &amp; Crowd</Link>
          <button className="btn btn-outline" onClick={handleUndo}>↺ Undo last action</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <Link to="/events" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Browse Events &amp; Book Seats →
            </Link>
            <Link to="/venue" className="btn btn-outline" style={{ textDecoration: "none" }}>
              View Venue &amp; Crowd
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {bookings.map((b) => (
            <div className="ticket" key={b.id}>
              <div className="ticket-main">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-soft)" }}>{b.venue} · {new Date(b.event_date).toLocaleDateString()}</div>
                  </div>
                  <span className={`tag ${b.status === "cancelled" ? "tag-red" : "tag-teal"}`}>
                    {b.status === "cancelled" ? "Cancelled" : "Confirmed"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, margin: "10px 0 8px", flexWrap: "wrap" }}>
                  <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                    Event ID: #{b.event_id}
                  </span>
                  <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                    User ID: #{b.user_id || user?.id}
                  </span>
                  <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>
                    Booking ID: #{b.id}
                  </span>
                </div>

                <div style={{ fontSize: 13.5, marginTop: 4 }}>
                  {b.booking_type === "group" ? "Group booking" : "Single seat"} · Seats: {b.seat_ids} · ₹{b.total_price}
                </div>
                {b.status === "confirmed" && (
                  <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={() => handleCancel(b.id)}>
                    Cancel booking
                  </button>
                )}
              </div>
              <div className="perforation" style={{ left: "calc(100% - 116px)" }} />
              <div className="ticket-stub">
                <div style={{ fontSize: 10, opacity: 0.7 }}>{b.qr_status.toUpperCase()}</div>
                <div className="qr-code">{b.qr_code}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
