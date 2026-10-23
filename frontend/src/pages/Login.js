import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === "organizer") navigate("/organizer");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/my-bookings");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="card auth-card">
        <h1>Welcome back</h1>
        <p>Log in to book seats, manage tickets, or run your event.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email or Username</label>
            <input type="text" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com or username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 8, background: "var(--bg-glass)", border: "1px solid var(--border)", fontSize: 12.5, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--purple)" }}>Default Accounts:</div>
          <div>👤 <strong>User:</strong> <code>testuser@gmail.com</code> | PW: <code>123456</code></div>
          <div>🎪 <strong>Organizer:</strong> <code>testorg@1gmail.com</code> | PW: <code>123456</code></div>
          <div>🛡️ <strong>Admin:</strong> <code>admin@smartevent.local</code> | PW: <code>Admin@123</code></div>
        </div>

        <p style={{ marginTop: 18, fontSize: 14 }}>
          New here? <Link to="/register" style={{ color: "var(--blue)", fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
