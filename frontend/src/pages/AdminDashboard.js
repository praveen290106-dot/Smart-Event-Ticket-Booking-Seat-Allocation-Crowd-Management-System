import React, { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api";
import { useAuth } from "../AuthContext";

const PIE_COLORS = ["#8B5CF6", "#7C9CFF", "#E8B84B", "#FB7185", "#34D399"];
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts" },
  { id: "analytics", label: "Analytics" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const loadOverview = async () => {
    const [{ data: ov }, { data: ev }] = await Promise.all([
      api.get("/admin/overview"),
      api.get("/admin/events"),
    ]);
    setOverview(ov);
    setEvents(ev.events);
  };
  const loadUsers = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data.users);
  };
  const loadAnalytics = async () => {
    const { data } = await api.get("/admin/analytics/system");
    setAnalytics(data);
  };

  useEffect(() => { loadOverview(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === "accounts") loadUsers();
    if (tab === "analytics") loadAnalytics();
  }, [tab]);

  const setEventStatus = async (id, status) => {
    await api.post(`/admin/events/${id}/status`, { status });
    await loadOverview();
  };
  const setUserStatus = async (id, status) => {
    await api.post(`/admin/users/${id}/status`, { status });
    await loadUsers();
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2>Admin dashboard</h2>
            {user && (
              <span className="tag" style={{ fontSize: 12, padding: "4px 10px" }}>
                Admin User ID: #{user.id}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0" }}>System administration, account control, and event approvals.</p>
        </div>
      </div>

      <div className="pill-steps" style={{ marginBottom: 26 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`step ${tab === t.id ? "done" : ""}`}
            style={{ cursor: "pointer", border: "none" }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && overview && (
        <>
          <div className="grid-4" style={{ marginBottom: 30 }}>
            <div className="card stat-card float-box"><div className="num">{overview.users}</div><div className="label">Attendees</div></div>
            <div className="card stat-card float-box"><div className="num">{overview.organizers}</div><div className="label">Organizers</div></div>
            <div className="card stat-card float-box"><div className="num">{overview.events}</div><div className="label">Events</div></div>
            <div className="card stat-card float-box"><div className="num">₹{overview.total_revenue.toLocaleString()}</div><div className="label">Revenue (confirmed)</div></div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 12 }}>All events</h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event</th>
                  <th>Organizer</th>
                  <th>Organizer ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 700 }}>
                        #{ev.id}
                      </span>
                    </td>
                    <td><strong>{ev.title}</strong></td>
                    <td>{ev.organizer_name}</td>
                    <td>
                      <span className="tag" style={{ fontFamily: "monospace", fontSize: 12 }}>
                        User #{ev.organizer_id}
                      </span>
                    </td>
                    <td>{new Date(ev.event_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`tag ${ev.status === "approved" ? "tag-teal" : ev.status === "rejected" ? "tag-red" : "tag-amber"}`}>
                        {ev.status}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      {ev.status !== "approved" && <button className="btn btn-sm btn-teal" onClick={() => setEventStatus(ev.id, "approved")}>Approve</button>}
                      {ev.status !== "rejected" && <button className="btn btn-sm btn-danger" onClick={() => setEventStatus(ev.id, "rejected")}>Reject</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "accounts" && (
        <div className="card float-box" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="tag tag-blue" style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 700 }}>
                      #{u.id}
                    </span>
                  </td>
                  <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {u.profile_image
                      ? <img src={u.profile_image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                      : <span className="avatar" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{u.name[0]}</span>}
                    {u.name}
                  </td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                  <td>
                    <span className={`tag ${u.status === "active" ? "tag-teal" : "tag-red"}`}>{u.status}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.status === "active"
                      ? <button className="btn btn-sm btn-danger" onClick={() => setUserStatus(u.id, "suspended")}>Suspend</button>
                      : <button className="btn btn-sm btn-teal" onClick={() => setUserStatus(u.id, "active")}>Activate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "analytics" && analytics && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card float-box">
            <h3 style={{ fontSize: 15 }}>Bookings &amp; revenue over time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.bookings_over_time}>
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
              <h3 style={{ fontSize: 15 }}>Revenue by category</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.revenue_by_category} dataKey="revenue" nameKey="category" outerRadius={90} label>
                    {analytics.revenue_by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card float-box">
              <h3 style={{ fontSize: 15 }}>Top 5 events by popularity</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.top_events} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="title" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="popularity" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card float-box">
            <h3 style={{ fontSize: 15 }}>User signups over time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.signups_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="signups" fill="#34D399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}