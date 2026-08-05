"use client";

import { useEffect, useState } from "react";
import ThemeSelector from "@/components/ThemeSwitcher";
import { Edit3, LogOut } from "lucide-react";

interface UserProfileData {
  id: string;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
  profile: {
    fullName: string | null;
    jobTitle: string | null;
    employerName: string | null;
    taxReference: string | null;
    preferredCurrency: string;
  } | null;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    jobTitle: "",
    employerName: "",
    taxReference: "",
    preferredCurrency: "ZAR",
  });

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setUserData(data);
      if (data) {
        setForm({
          fullName: data.profile?.fullName ?? "",
          email: data.email ?? "",
          jobTitle: data.profile?.jobTitle ?? "",
          employerName: data.profile?.employerName ?? "",
          taxReference: data.profile?.taxReference ?? "",
          preferredCurrency: data.profile?.preferredCurrency ?? "ZAR",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    loadProfile();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Personal information &amp; system credentials</p>
        </div>
        <button
          className="btn btn-primary flex items-center gap-1.5"
          onClick={() => setEditing(!editing)}
          id="toggle-edit-profile-btn"
        >
          {editing ? "Cancel" : <><Edit3 size={14} /> Edit Profile</>}
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="text-muted" style={{ padding: "48px 0", textAlign: "center" }}>
            Loading profile…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
            {/* Theme Selector Section */}
            <div className="card">
              <ThemeSelector />
            </div>

            {/* User Card */}
            <div className="card">
              <div className="flex items-center gap-5" style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "var(--gold)",
                    color: "#0d1b2a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    fontWeight: "800",
                  }}
                >
                  {userData?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700" }}>
                    {userData?.profile?.fullName ?? userData?.username}
                  </h2>
                  <div className="flex items-center gap-3" style={{ marginTop: "4px" }}>
                    <span className="badge gold">@{userData?.username}</span>
                    <span className="badge active">{userData?.role}</span>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div className="two-col mt-4">
                  <div>
                    <div className="stat-label">Full Name</div>
                    <div className="font-semibold">{userData?.profile?.fullName ?? "—"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Email Address</div>
                    <div className="font-semibold">{userData?.email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Job Title</div>
                    <div className="font-semibold">{userData?.profile?.jobTitle ?? "—"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Employer</div>
                    <div className="font-semibold">{userData?.profile?.employerName ?? "—"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Tax Reference Number</div>
                    <div className="font-semibold">{userData?.profile?.taxReference ?? "—"}</div>
                  </div>
                  <div>
                    <div className="stat-label">Preferred Currency</div>
                    <div className="font-semibold">{userData?.profile?.preferredCurrency ?? "ZAR"}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} style={{ marginTop: "16px" }}>
                  <div className="two-col mb-4">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        className="form-input"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        id="profile-fullname-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        className="form-input"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        id="profile-email-input"
                      />
                    </div>
                  </div>

                  <div className="two-col mb-4">
                    <div className="form-group">
                      <label className="form-label">Job Title</label>
                      <input
                        className="form-input"
                        value={form.jobTitle}
                        onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                        id="profile-jobtitle-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Employer</label>
                      <input
                        className="form-input"
                        value={form.employerName}
                        onChange={(e) => setForm({ ...form, employerName: e.target.value })}
                        id="profile-employer-input"
                      />
                    </div>
                  </div>

                  <div className="two-col mb-4">
                    <div className="form-group">
                      <label className="form-label">Tax Reference Number</label>
                      <input
                        className="form-input"
                        value={form.taxReference}
                        onChange={(e) => setForm({ ...form, taxReference: e.target.value })}
                        id="profile-taxref-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Preferred Currency</label>
                      <select
                        className="form-select"
                        value={form.preferredCurrency}
                        onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}
                        id="profile-currency-select"
                      >
                        <option value="ZAR">ZAR (R)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between items-center mt-6">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" id="save-profile-btn">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Account Sign Out Action Card */}
            <div className="card" style={{ border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.03)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-red" style={{ fontSize: 16 }}>Sign Out of Account</div>
                  <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                    Terminate active session cookie for user <span className="td-mono font-bold">{userData?.username}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger flex items-center gap-1.5"
                  onClick={handleLogout}
                  id="profile-signout-btn"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
