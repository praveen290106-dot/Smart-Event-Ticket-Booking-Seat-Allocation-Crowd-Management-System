import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const initials = user ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        <span className="dot" />
        SmartEvent
      </NavLink>
      <nav>
        {user && !isHome && (
          <>
            <NavLink to="/events" className={({ isActive }) => (isActive ? "active" : "")}>Events</NavLink>
            <NavLink to="/venue" className={({ isActive }) => (isActive ? "active" : "")}>Venue &amp; Crowd</NavLink>
          </>
        )}

        {user && user.role === "user" && (
          <NavLink to="/my-bookings" className={({ isActive }) => (isActive ? "active" : "")}>User Dashboard</NavLink>
        )}
        {user && user.role === "organizer" && (
          <>
            <NavLink to="/organizer" className={({ isActive }) => (isActive ? "active" : "")}>Organizer</NavLink>
            <NavLink to="/verify" className={({ isActive }) => (isActive ? "active" : "")}>Scan Ticket</NavLink>
          </>
        )}
        {user && user.role === "admin" && (
          <>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>Admin</NavLink>
            <NavLink to="/verify" className={({ isActive }) => (isActive ? "active" : "")}>Scan Ticket</NavLink>
          </>
        )}

        {!user && (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>Log in</NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>Sign up</NavLink>
          </>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={`Switch to ${theme === "dark" ? "Light theme (White & Light Green)" : "Dark theme (Black & Neon Purple)"}`}
          aria-label="Toggle Theme"
        >
          <span className="theme-icon">{theme === "dark" ? "🌙" : "☀️"}</span>
          <span className="theme-label">{theme === "dark" ? "Dark" : "Light"}</span>
        </button>

        {user && (
          <div className="user-chip">
            <NavLink to="/profile" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user.profile_image
                ? <img src={user.profile_image} alt="" className="avatar" style={{ objectFit: "cover" }} />
                : <span className="avatar">{initials}</span>}
              <span style={{ fontSize: 13.5 }}>{user.name.split(" ")[0]}</span>
              <span className="tag" style={{ fontSize: 11, padding: "2px 7px", fontFamily: "monospace" }}>
                ID: #{user.id}
              </span>
            </NavLink>
            <button className="link-btn" onClick={handleLogout} title="Log out">⏻</button>
          </div>
        )}
      </nav>
    </header>
  );
}