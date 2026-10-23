import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import MyBookings from "./pages/MyBookings";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VenueCrowd from "./pages/VenueCrowd";
import Profile from "./pages/Profile";
import QRVerify from "./pages/QRVerify";

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <div className="app-shell">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/venue" element={<VenueCrowd />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute roles={["user"]}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user"]}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer"
              element={
                <ProtectedRoute roles={["organizer"]}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verify"
              element={
                <ProtectedRoute roles={["organizer", "admin"]}>
                  <QRVerify />
                </ProtectedRoute>
              }
            />
          </Routes>
          <footer className="footer">
            Smart Event Ticket Booking, Seat Allocation &amp; Crowd Management System 
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  </AuthProvider>
);
}