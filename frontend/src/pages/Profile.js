import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      setName(data.user.name);
      setImagePreview(data.user.profile_image);
    });
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Please choose an image under 1.5MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setImagePreview(dataUrl);
  };

  const handleSave = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.put("/profile", { name, profile_image: imagePreview });
      await refreshUser();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  };

  const initials = name ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "";

  return (
    <div className="page-narrow">
      <div className="card auth-card fade-in-up">
        <h1>Your profile</h1>
        <p>Update your display name and profile photo.</p>

        {error && <div className="error-banner">{error}</div>}
        {message && <div className="success-banner">{message}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              width: 74, height: 74, borderRadius: "50%", cursor: "pointer",
              background: imagePreview ? `center/cover no-repeat url(${imagePreview})` : "linear-gradient(135deg, var(--blue), var(--teal))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 22, flexShrink: 0,
              border: "2px solid var(--line)",
            }}
            title="Click to change photo"
          >
            {!imagePreview && initials}
          </div>
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current.click()}>
              Change photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            <p style={{ fontSize: 12.5, margin: "6px 0 0" }}>JPG or PNG, under 1.5MB.</p>
          </div>
        </div>

        <div className="field">
          <label>User ID</label>
          <input value={user?.id ? `#${user.id}` : ""} disabled style={{ background: "var(--surface)", color: "var(--text-soft)", fontFamily: "monospace", fontWeight: 600 }} />
        </div>
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user?.email || ""} disabled style={{ background: "var(--surface)", color: "var(--text-soft)" }} />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={user?.role || ""} disabled style={{ background: "var(--surface)", color: "var(--text-soft)", textTransform: "capitalize" }} />
        </div>

        <button className="btn btn-primary btn-block" onClick={handleSave} disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}