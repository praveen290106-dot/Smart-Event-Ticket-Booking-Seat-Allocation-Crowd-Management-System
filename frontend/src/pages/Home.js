import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const seatPattern = Array.from({ length: 32 }, (_, i) => {
  if ([2, 3, 4, 10, 11, 18, 19, 20, 26].includes(i)) return "on";
  if ([6, 7, 14, 15, 22, 23, 24].includes(i)) return "on2";
  return "";
});

const MODULES = [
  { tag: "Module 1", title: "Linked List", desc: "Booking history and recently viewed events, newest first." },
  { tag: "Module 2", title: "Stack / Queue", desc: "Undo your last booking; fair FIFO waiting list when sold out." },
  { tag: "Module 3", title: "Binary Tree / BST", desc: "Category hierarchy, plus O(log n) lookup by Event/Seat/Booking ID." },
  { tag: "Module 4", title: "Graph — BFS / DFS", desc: "Venue map: nearest exit and full zone reachability checks." },
  { tag: "Module 5", title: "Binary Search + Quick Sort", desc: "Events and seats ranked, then looked up in O(log n)." },
  { tag: "Module 6", title: "Backtracking", desc: "Finds a valid contiguous seat block for any group size." },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="hero">
        <div className="hero-inner" style={{ gridTemplateColumns: "1fr", textAlign: "center", justifyItems: "center", paddingBottom: 60 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="hero-eyebrow">Data Structures &amp; Algorithmic Problem Solving</div>
            <h1 style={{ maxWidth: 720, margin: "0 auto" }}>Booking, seated by an algorithm — not a scramble.</h1>
            <p className="lead" style={{ margin: "18px auto 28px", maxWidth: 560 }}>
              Groups get placed together with Backtracking, singles get the nearest open seat,
              sold-out events run a fair queue, and every zone's crowd density updates live.
              Six modules of data structures, one working booking platform.
            </p>
            <div className="cta-row" style={{ justifyContent: "center" }}>
              {user ? (
                <Link
                  to={user.role === "admin" ? "/admin" : user.role === "organizer" ? "/organizer" : "/my-bookings"}
                  className="btn btn-primary"
                >
                  Go to {user.role === "admin" ? "Admin" : user.role === "organizer" ? "Organizer" : "User"} Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary">
                    Get Started · Log in →
                  </Link>
                  <Link to="/register" className="btn btn-outline">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="seat-visual" style={{ marginTop: 46, width: "100%", maxWidth: 420 }}>
            {seatPattern.map((s, i) => (
              <div key={i} className={`seat ${s}`} />
            ))}
          </div>
        </div>
      </section>

      <div className="page">
        <div className="section-head" style={{ justifyContent: "center", textAlign: "center", flexDirection: "column" }}>
          <span className="tag" style={{ margin: "0 auto 10px" }}>The DSA Engine</span>
          <h2>Every module, doing real work</h2>
        </div>
        <div className="grid-3">
          {MODULES.map((m) => (
            <div className="card card-hover float-box fade-in-up" key={m.title}>
              <span className="tag">{m.tag}</span>
              <h3 style={{ marginTop: 10 }}>{m.title}</h3>
              <p style={{ margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}