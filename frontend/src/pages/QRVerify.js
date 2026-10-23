import React, { useState } from "react";
import api from "../api";

export default function QRVerify() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await api.post("/bookings/verify-qr", { qr_code: code.trim() });
      setResult({ ok: true, ...data });
    } catch (err) {
      setResult({ ok: false, ...(err.response?.data || { reason: "Verification failed." }) });
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  return (
    <div className="page-narrow">
      <div className="card fade-in-up">
        <h1>Ticket check-in</h1>
        <p>Type or scan a ticket's QR code to verify and check the holder in.</p>

        <form onSubmit={handleVerify}>
          <div className="field">
            <label>QR code</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="QR-XXXXXXXXXXXX"
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Checking..." : "Verify & check in"}
          </button>
        </form>

        {result && (
          <div
            className="card"
            style={{
              marginTop: 20,
              background: result.ok ? "rgba(52,211,153,0.10)" : "rgba(251,113,133,0.10)",
              border: `1px solid ${result.ok ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.3)"}`,
            }}
          >
            {result.ok ? (
              <>
                <div style={{ fontWeight: 700, color: "#7EEAC0" }}>✅ Entry granted</div>
                <div style={{ display: "flex", gap: 8, margin: "8px 0 6px", flexWrap: "wrap" }}>
                  <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12 }}>Event ID: #{result.event_id}</span>
                  <span className="tag" style={{ fontFamily: "monospace", fontSize: 12 }}>User ID: #{result.user_id}</span>
                  {result.booking_id && <span className="tag" style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>Booking ID: #{result.booking_id}</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{result.event_title} · {result.venue}</div>
                <div style={{ fontSize: 13.5 }}>Seats: {result.seats} · {result.ticket_type?.toUpperCase()}</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, color: "#FFB4C0" }}>❌ Entry denied</div>
                <div style={{ fontSize: 13.5, marginTop: 6 }}>{result.reason}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}