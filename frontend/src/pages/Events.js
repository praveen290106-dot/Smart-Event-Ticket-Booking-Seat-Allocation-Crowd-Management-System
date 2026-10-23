import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [sortBy, setSortBy] = useState("popularity");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);

  const load = async (by) => {
    setLoading(true);
    const { data } = await api.get(`/events?sort_by=${by}&order=desc`);
    setEvents(data.events);
    setLoading(false);
  };

  useEffect(() => { load(sortBy); }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId) return;
    const { data } = await api.get(`/events/search?id=${searchId}`);
    setSearchResult(data.result);
    setSearchMeta({ comparisons: data.comparisons, technique: data.technique });
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2>Event Rankings &amp; Browse</h2>
            {user && (
              <span className="tag" style={{ fontSize: 12, padding: "4px 10px" }}>
                User ID: #{user.id}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0" }}>
            Ranked in <strong>Descending Order</strong> using <strong>Quick Sort</strong> (Module 5) — look up a specific event ID with <strong>Binary Search</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              🏆 Ranking Table
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              ▦ Cards Grid
            </button>
          </div>
          <select className="field" style={{ margin: 0, minWidth: 200 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="popularity">Sort: Most Popular (Bookings ↓)</option>
            <option value="price">Sort: Highest General Price (₹ ↓)</option>
            <option value="seats">Sort: Largest Capacity (Seats ↓)</option>
            <option value="date">Sort: Latest Event Date (Date ↓)</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSearch} className="card" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
        <input
          type="number"
          placeholder="Look up event by ID (Binary Search)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={{ flex: 1, padding: "10px 13px", borderRadius: 8, border: "1.5px solid var(--line)" }}
        />
        <button className="btn btn-outline btn-sm" type="submit">Search</button>
      </form>
      {searchMeta && (
        <div className="card" style={{ marginBottom: 24, background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.3)" }}>
          {searchResult ? (() => {
            const isSrClosed = Boolean(
              searchResult.is_booking_closed ||
              (new Date() >= new Date(new Date(searchResult.event_date).getTime() - 24 * 60 * 60 * 1000))
            );
            return (
              <p style={{ margin: 0 }}>
                Found <strong>{searchResult.title}</strong> (Event ID: #{searchResult.id}) in <strong>{searchMeta.comparisons}</strong> comparison(s) using {searchMeta.technique}.{" "}
                <Link to={`/events/${searchResult.id}`} style={{ color: "var(--blue)", fontWeight: 600 }}>
                  {isSrClosed ? "View Details (Booking Closed) →" : "Select & Book Seats →"}
                </Link>
              </p>
            );
          })() : (
            <p style={{ margin: 0 }}>No event found with ID #{searchId} ({searchMeta.comparisons} comparisons using {searchMeta.technique}).</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p>No events yet. If you're an organizer, create the first one.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="card float-box" style={{ padding: 0, overflow: "hidden", marginBottom: 30 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Events Leaderboard &amp; Ranking (Descending Order)
            </span>
            <span className="tag" style={{ fontSize: 11 }}>
              Algorithm: Quick Sort (Descending)
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80, textAlign: "center" }}>Rank</th>
                  <th>Event ID</th>
                  <th>Event Name</th>
                  <th>Organizer</th>
                  <th>Date &amp; Venue</th>
                  <th>Popularity</th>
                  <th>Ticket Prices</th>
                  <th>Capacity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, index) => {
                  const rank = index + 1;
                  const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
                  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                  const totalSeats = (ev.rows_count || 0) * (ev.seats_per_row || 0);

                  const now = new Date();
                  const evDate = new Date(ev.event_date);
                  const isPast = now >= evDate;
                  const isCutoff = now >= new Date(evDate.getTime() - 24 * 60 * 60 * 1000);
                  const isClosed = Boolean(ev.is_booking_closed || isPast || isCutoff);

                  return (
                    <tr key={ev.id}>
                      <td style={{ textAlign: "center" }}>
                        <span className={`rank-badge ${rankClass}`}>
                          {rankEmoji}
                        </span>
                      </td>
                      <td>
                        <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 700 }}>
                          #{ev.id}
                        </span>
                      </td>
                      <td>
                        <Link to={`/events/${ev.id}`} style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                          {ev.title}
                        </Link>
                        <div style={{ marginTop: 2 }}>
                          <span className="tag" style={{ textTransform: "capitalize", fontSize: 10.5, padding: "1px 6px" }}>
                            {ev.category}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ev.organizer_name || "Organizer"}</div>
                        <span className="tag" style={{ fontSize: 11, padding: "1px 6px", fontFamily: "monospace" }}>
                          User ID: #{ev.organizer_id}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13.5 }}>{new Date(ev.event_date).toLocaleDateString()}</div>
                        <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{ev.venue}</div>
                        <div style={{ marginTop: 4 }}>
                          {isClosed ? (
                            <span
                              className={`tag ${isPast ? "tag-red" : "tag-amber"}`}
                              style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 6px" }}
                              title={isPast ? "Event date has passed" : "Booking closed (1 day before event date)"}
                            >
                              {isPast ? "🔒 Booking Closed (Ended)" : "⏳ Booking Closed (24h Cutoff)"}
                            </span>
                          ) : (
                            <span className="tag tag-teal" style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 6px" }}>
                              ✓ Booking Open
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="tag tag-amber" style={{ fontSize: 12, fontWeight: 700 }}>
                          🔥 {ev.popularity} bookings
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>
                          VIP: <strong style={{ color: "#E8B84B" }}>₹{Number(ev.price_vip).toLocaleString()}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                          Prem: ₹{Number(ev.price_premium).toLocaleString()} · Gen: ₹{Number(ev.price_general).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-soft)" }}>
                        {totalSeats} seats
                      </td>
                      <td>
                        {isClosed ? (
                          <Link to={`/events/${ev.id}`} className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap", opacity: 0.85 }}>
                            View (Closed)
                          </Link>
                        ) : (
                          <Link to={`/events/${ev.id}`} className="btn btn-primary btn-sm" style={{ whiteSpace: "nowrap" }}>
                            Select Seats →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {events.map((ev, index) => {
            const now = new Date();
            const evDate = new Date(ev.event_date);
            const isPast = now >= evDate;
            const isCutoff = now >= new Date(evDate.getTime() - 24 * 60 * 60 * 1000);
            const isClosed = Boolean(ev.is_booking_closed || isPast || isCutoff);

            return (
              <Link to={`/events/${ev.id}`} key={ev.id} className="card card-hover event-card" style={isClosed ? { opacity: 0.9 } : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="cat">{ev.category}</span>
                    {isClosed && (
                      <span className={`tag ${isPast ? "tag-red" : "tag-amber"}`} style={{ fontSize: 10.5, fontWeight: 700 }}>
                        {isPast ? "🔒 Closed" : "⏳ 24h Cutoff"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className={`rank-badge ${index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : ""}`} style={{ width: 26, height: 26, fontSize: 11 }}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                      Event ID: #{ev.id}
                    </span>
                  </div>
                </div>
                <h3>{ev.title}</h3>
                <p className="meta">{ev.venue} · {new Date(ev.event_date).toLocaleDateString()}</p>
                <div className="price-row">
                  <span className="price">₹{Number(ev.price_general).toLocaleString()}+</span>
                  <span className="tag">🔥 {ev.popularity} bookings</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
