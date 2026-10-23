import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register({ ...form, role });
      navigate(user.role === "organizer" ? "/organizer" : "/events");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="card auth-card">
        <h1>Create your account</h1>
        <p>Book seats for events, or set up an organizer account to run your own.</p>

        <div className="role-toggle">
          <button type="button" className={role === "user" ? "active" : ""} onClick={() => setRole("user")}>
            Attendee
          </button>
          <button type="button" className={role === "organizer" ? "active" : ""} onClick={() => setRole("organizer")}>
            Organizer
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: 18, fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
