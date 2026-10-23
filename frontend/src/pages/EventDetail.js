import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { useAuth } from "../AuthContext";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Net Banking" },
  { id: "wallet", label: "Wallet" },
];

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [occupancy, setOccupancy] = useState(0);
  const [ticketType, setTicketType] = useState("general");
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [bookingMode, setBookingMode] = useState("custom"); // 'custom' | 'auto'
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [step, setStep] = useState("select"); // select -> pay -> done
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [soldOut, setSoldOut] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/events/${id}`);
    setEvent(data.event);
    setSeats(data.seats);
    setOccupancy(data.occupancy_pct);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grid = {};
  seats.forEach((s) => { grid[`${s.row_num}-${s.col_num}`] = s; });
  const rows = event ? event.rows_count : 0;
  const cols = event ? event.seats_per_row : 0;

  const now = new Date();
  const eventDate = event ? new Date(event.event_date) : null;
  const cutoffDate = eventDate ? new Date(eventDate.getTime() - 24 * 60 * 60 * 1000) : null;
  const isPast = eventDate ? now >= eventDate : false;
  const isCutoff = cutoffDate ? now >= cutoffDate : false;
  const isBookingClosed = Boolean(event?.is_booking_closed || isPast || isCutoff);
  const closureReason = isPast
    ? "This event has already taken place. Ticket booking is closed."
    : isCutoff
    ? "Ticket booking is closed: bookings close 1 day (24 hours) prior to the event date to finalize venue seating and attendee records."
    : event?.booking_closure_reason;

  const priceForType = (type) => {
    if (!event) return 0;
    return { general: event.price_general, premium: event.price_premium, vip: event.price_vip }[type];
  };

  const toggleSeat = (seat) => {
    if (isBookingClosed) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (seat.status === "booked") return;
    setError("");
    setMessage(null);
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      if (exists) {
        return prev.filter((s) => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
    setBookingMode("custom");
  };

  const removeSeat = (seatId) => {
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
  };

  const customTotalPrice = selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0);

  const goToPayment = () => {
    if (!user) return navigate("/login");
    if (isBookingClosed) {
      setError(closureReason || "Ticket booking is closed for this event.");
      return;
    }
    if (bookingMode === "custom" && selectedSeats.length === 0) {
      setError("Please click on at least one available seat on the seat map to select it.");
      return;
    }
    setStep("pay");
    setError(""); setMessage(null); setSoldOut(false); setLastResult(null);
  };

  const confirmPayment = async () => {
    setBusy(true); setError("");
    try {
      const payload = bookingMode === "custom"
        ? {
            event_id: Number(id),
            selected_seat_ids: selectedSeats.map((s) => s.id),
            payment_method: paymentMethod,
          }
        : {
            event_id: Number(id),
            seats_needed: Number(seatsNeeded),
            ticket_type: ticketType,
            payment_method: paymentMethod,
          };
      const { data } = await api.post("/bookings/book", payload);
      setLastResult(data);
      setSelectedSeats([]);
      setStep("done");
      await load();
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.error || "Booking failed.");
      if (errData?.sold_out) setSoldOut(true);
    } finally {
      setBusy(false);
    }
  };

  const handleWaitlist = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/waitlist/join", { event_id: Number(id), seats_needed: Number(seatsNeeded) });
      setMessage(`Joined the waiting list — you're position ${data.position} in the queue.`);
      setStep("select");
    } catch (err) {
      setError(err.response?.data?.error || "Could not join waiting list.");
    } finally {
      setBusy(false);
    }
  };

  if (!event) return <div className="page"><div className="empty-state"><div className="spinner" style={{ margin: "0 auto" }} /></div></div>;

  return (
    <div className="page">
      {event.poster_image && (
        <div className="fade-in-up" style={{
          height: 220, borderRadius: 14, marginBottom: 24, overflow: "hidden",
          background: `center/cover no-repeat url(${event.poster_image})`,
        }} />
      )}

      <div className="grid-2" style={{ gridTemplateColumns: "1.3fr 1fr", alignItems: "start" }}>
        <div className="fade-in-up">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span className="tag">{event.category}</span>
            <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
              Event ID: #{event.id}
            </span>
            <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
              Organizer ID: #{event.organizer_id}
            </span>
            {user && (
              <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                Your User ID: #{user.id}
              </span>
            )}
          </div>
          <h2 style={{ marginTop: 6 }}>{event.title}</h2>
          <p>{event.venue} · {new Date(event.event_date).toLocaleString()}</p>
          <p>{event.description}</p>

          {event.venue_image && (
            <div style={{ height: 160, borderRadius: 12, marginBottom: 18, overflow: "hidden",
              background: `center/cover no-repeat url(${event.venue_image})` }} />
          )}

          <div className="card float-box" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>Interactive Seat Map</h3>
              <span className={`tag ${isBookingClosed ? (isPast ? "tag-red" : "tag-amber") : ""}`} style={{ fontSize: 11, fontWeight: 600 }}>
                {isBookingClosed
                  ? (isPast ? "🔒 Booking Closed (Event Concluded)" : "⏳ Booking Closed (24h Cutoff)")
                  : selectedSeats.length > 0
                  ? `${selectedSeats.length} seat(s) selected`
                  : "Click seat to customize booking"}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 14px" }}>
              {isBookingClosed
                ? "🔒 Seat selection is closed for this event. Available and booked seats are shown for display only."
                : "💡 Click on any available seat below to select or unselect it directly."}
            </p>

            {isBookingClosed && (
              <div
                style={{
                  background: isPast ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                  border: `1.5px solid ${isPast ? "rgba(239, 68, 68, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{isPast ? "🔒" : "⏳"}</span>
                <div>
                  <strong style={{ color: isPast ? "#F87171" : "#FBBF24", fontSize: 14, display: "block" }}>
                    {isPast ? "Seat Selection Closed — Event Date Exceeded" : "Seat Selection Closed — 1 Day Before Event"}
                  </strong>
                  <span style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 3, display: "block", lineHeight: 1.45 }}>
                    {closureReason}
                  </span>
                </div>
              </div>
            )}

            <div className="seat-map">
              {Array.from({ length: rows }).map((_, r) => (
                <div className="seat-map-row" key={r}>
                  <span className="row-label">{String.fromCharCode(65 + r)}</span>
                  {Array.from({ length: cols }).map((_, c) => {
                    const seat = grid[`${r}-${c}`];
                    if (!seat) return null;
                    const isBooked = seat.status === "booked";
                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                    const isSeatDisabled = isBooked || isBookingClosed;
                    const cls = `seat-btn ${seat.seat_type} ${isBooked ? "booked" : ""} ${isSelected ? "selected" : ""} ${isBookingClosed ? "booking-closed" : ""}`;
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={isSeatDisabled}
                        className={cls}
                        onClick={() => toggleSeat(seat)}
                        title={
                          isBookingClosed
                            ? `${seat.seat_label} · Seat selection closed (${closureReason})`
                            : `${seat.seat_label} · ${seat.seat_type.toUpperCase()} · ₹${seat.price}${isBooked ? " (Booked)" : isSelected ? " (Selected — Click to remove)" : " (Available — Click to select)"}`
                        }
                      >
                        {isBooked ? "✕" : isSelected ? "✓" : c + 1}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="seat-legend">
              <div className="item"><span className="swatch" style={{ background: "rgba(232,184,75,0.18)", border: "1.5px solid #E8B84B" }} /> VIP</div>
              <div className="item"><span className="swatch" style={{ background: "rgba(124,156,255,0.18)", border: "1.5px solid #7C9CFF" }} /> Premium</div>
              <div className="item"><span className="swatch" style={{ background: "rgba(139,92,246,0.14)", border: "1.5px solid #8B5CF6" }} /> General</div>
              <div className="item"><span className="swatch" style={{ background: "rgba(255,255,255,0.08)" }} /> Booked</div>
              <div className="item"><span className="swatch" style={{ background: "var(--violet)", border: "1.5px solid #fff" }} /> Selected</div>
            </div>
            <p style={{ fontSize: 13.5, marginTop: 12 }}>Occupancy: <strong>{occupancy}%</strong></p>
          </div>
        </div>

        <div className="card float-box fade-in-up" style={{ position: "sticky", top: 84 }}>
          {step === "done" && lastResult ? (
            <div>
              <div className="success-banner">Payment successful — booking confirmed!</div>
              <div className="ticket">
                <div className="ticket-main">
                  <div style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>CONFIRMED · {lastResult.ticket_type.toUpperCase()}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{event.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 4 }}>Seats: {lastResult.seats.join(", ")}</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Paid via {lastResult.payment_method.toUpperCase()} · ₹{lastResult.total_price}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Ref: {lastResult.payment_reference}</div>
                </div>
                <div className="perforation" style={{ left: "calc(100% - 116px)" }} />
                <div className="ticket-stub">
                  <div style={{ fontSize: 10, opacity: 0.7 }}>SCAN AT ENTRY</div>
                  <div style={{ background: "#fff", padding: 6, borderRadius: 6 }}>
                    <QRCodeSVG value={lastResult.qr_code} size={64} />
                  </div>
                </div>
              </div>
              <button className="btn btn-outline btn-block" style={{ marginTop: 14 }} onClick={() => navigate("/my-bookings")}>
                View my bookings
              </button>
            </div>
          ) : isBookingClosed ? (
            <div style={{ padding: "8px 2px" }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>
                  {isPast ? "🔒" : "⏳"}
                </div>
                <h3 style={{ fontSize: 18, margin: "0 0 6px", color: isPast ? "#F87171" : "#FBBF24" }}>
                  {isPast ? "Ticket Booking Closed" : "Booking Window Closed"}
                </h3>
                <span className={`tag ${isPast ? "tag-red" : "tag-amber"}`} style={{ fontWeight: 700, fontSize: 11.5 }}>
                  {isPast ? "Event Date Exceeded" : "1 Day Before Event Date"}
                </span>
              </div>

              <div
                className="card"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isPast ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                  padding: "14px",
                  marginBottom: 16,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
                    Notice Regarding Ticket Booking Closure:
                  </strong>
                  <div style={{ color: "var(--text-soft)" }}>
                    {closureReason}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-soft)", fontSize: 12 }}>Event Date:</span>
                    <strong style={{ fontSize: 12.5, fontFamily: "monospace" }}>
                      {eventDate ? eventDate.toLocaleString() : "N/A"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-soft)", fontSize: 12 }}>Booking Cutoff:</span>
                    <strong style={{ fontSize: 12.5, fontFamily: "monospace", color: isCutoff ? "#FBBF24" : undefined }}>
                      {cutoffDate ? cutoffDate.toLocaleString() : "N/A"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-soft)", fontSize: 12 }}>Seat Selection:</span>
                    <strong style={{ color: "#F87171", fontSize: 12.5 }}>🔒 Closed / Disabled</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--line)", marginBottom: 18 }}>
                <p style={{ fontSize: 12, color: "var(--text-soft)", margin: 0, lineHeight: 1.45 }}>
                  ℹ️ <strong>Venue Policy:</strong> Seat selection and ticket booking are automatically locked 24 hours prior to the event start to freeze seating charts, verify security access, and issue attendee badges.
                </p>
              </div>

              <Link to="/events" className="btn btn-outline btn-block" style={{ textDecoration: "none", textAlign: "center" }}>
                ← Browse Other Events
              </Link>
            </div>
          ) : (
            <div>
              {!user && (
                <div className="error-banner" style={{ background: "rgba(232,184,75,0.10)", color: "#F2CE87", border: "1px solid rgba(232,184,75,0.35)" }}>
                  🔒 You need to log in to select seats and book. <Link to="/login" style={{ fontWeight: 700, color: "#F2CE87" }}>Log in</Link>
                </div>
              )}

              {step === "select" && (
                <fieldset disabled={!user} style={{ border: "none", padding: 0, margin: 0, opacity: user ? 1 : 0.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, margin: 0 }}>Book tickets</h3>
                    {selectedSeats.length > 0 && (
                      <button
                        type="button"
                        className="link-btn"
                        style={{ fontSize: 12, color: "#FB7185", cursor: "pointer", background: "none", border: "none" }}
                        onClick={() => setSelectedSeats([])}
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <div className="view-toggle" style={{ width: "100%", marginBottom: 16 }}>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      className={`view-toggle-btn ${bookingMode === "custom" ? "active" : ""}`}
                      onClick={() => setBookingMode("custom")}
                    >
                      🎯 Custom Selection ({selectedSeats.length})
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      className={`view-toggle-btn ${bookingMode === "auto" ? "active" : ""}`}
                      onClick={() => setBookingMode("auto")}
                    >
                      ⚡ Auto Allocation
                    </button>
                  </div>

                  {bookingMode === "custom" ? (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
                          Your Chosen Seats
                        </label>
                        {selectedSeats.length === 0 ? (
                          <div style={{ padding: "18px 14px", textAlign: "center", border: "1.5px dashed var(--line)", borderRadius: 10, marginBottom: 14 }}>
                            <p style={{ margin: 0, fontSize: 13 }}>
                              👉 <strong>Click any seat on the map</strong> to select where you want to sit.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, maxHeight: 120, overflowY: "auto" }}>
                            {selectedSeats.map((s) => (
                              <span key={s.id} className="seat-chip">
                                <strong>{s.seat_label}</strong> ({s.seat_type.toUpperCase()} · ₹{Number(s.price).toLocaleString()})
                                <button type="button" onClick={() => removeSeat(s.id)} title="Remove seat">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="card" style={{ background: "var(--surface)", marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                          <span>Total ({selectedSeats.length} {selectedSeats.length === 1 ? "seat" : "seats"})</span>
                          <span style={{ color: "#34D399", fontSize: 16 }}>₹{customTotalPrice.toLocaleString()}</span>
                        </div>
                      </div>

                      {error && <div className="error-banner">{error}</div>}
                      {message && <div className="success-banner">{message}</div>}

                      <button
                        className="btn btn-primary btn-block"
                        onClick={goToPayment}
                        disabled={selectedSeats.length === 0}
                      >
                        {selectedSeats.length === 0
                          ? "Select seats on map to continue"
                          : `Continue to payment (${selectedSeats.length} seats) →`}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="field">
                        <label>Ticket type</label>
                        <select value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
                          <option value="general">General — ₹{event.price_general}</option>
                          <option value="premium">Premium — ₹{event.price_premium}</option>
                          <option value="vip">VIP — ₹{event.price_vip}</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Seats needed</label>
                        <input type="number" min={1} max={rows * cols} value={seatsNeeded} onChange={(e) => setSeatsNeeded(e.target.value)} />
                      </div>

                      <p style={{ fontSize: 13 }}>
                        {Number(seatsNeeded) > 1
                          ? "A group of 2+ triggers Backtracking to find a contiguous block within your chosen ticket type."
                          : "A single seat is placed at the nearest available position in your chosen ticket type."}
                      </p>

                      <div className="card" style={{ background: "var(--surface)", marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                          <span>Estimated total</span>
                          <span>₹{(priceForType(ticketType) * Number(seatsNeeded || 0)).toLocaleString()}</span>
                        </div>
                      </div>

                      {error && <div className="error-banner">{error}</div>}
                      {message && <div className="success-banner">{message}</div>}

                      <button className="btn btn-primary btn-block" onClick={goToPayment}>
                        Continue to payment
                      </button>
                      {soldOut && (
                        <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={handleWaitlist} disabled={busy}>
                          Join waiting list instead
                        </button>
                      )}
                    </div>
                  )}
                </fieldset>
              )}

              {step === "pay" && (
                <div>
                  <h3 style={{ fontSize: 16 }}>Choose payment method</h3>
                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`role-toggle-btn`}
                        onClick={() => setPaymentMethod(m.id)}
                        style={{
                          padding: "12px 10px", borderRadius: 8, cursor: "pointer",
                          border: paymentMethod === m.id ? "2px solid var(--blue)" : "1.5px solid var(--line)",
                          background: paymentMethod === m.id ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.03)",
                          color: paymentMethod === m.id ? "var(--blue)" : "var(--text)",
                          fontWeight: 600, fontSize: 13.5,
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="card" style={{ background: "var(--surface)", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {bookingMode === "custom"
                            ? `Custom (${selectedSeats.length} seats): ${selectedSeats.map((s) => s.seat_label).join(", ")}`
                            : `${ticketType.toUpperCase()} × ${seatsNeeded}`}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                          {bookingMode === "custom" ? "Custom Selected Seats" : "Auto Algorithm Placement"}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#34D399", fontSize: 16 }}>
                        ₹{(bookingMode === "custom" ? customTotalPrice : (priceForType(ticketType) * Number(seatsNeeded || 0))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {error && <div className="error-banner">{error}</div>}
                  <button className="btn btn-primary btn-block" onClick={confirmPayment} disabled={busy}>
                    {busy
                      ? "Processing payment..."
                      : `Pay ₹${(bookingMode === "custom" ? customTotalPrice : (priceForType(ticketType) * Number(seatsNeeded || 0))).toLocaleString()} & book`}
                  </button>
                  <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => setStep("select")} disabled={busy}>
                    ← Back
                  </button>
                  {soldOut && (
                    <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={handleWaitlist} disabled={busy}>
                      Join waiting list instead
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}