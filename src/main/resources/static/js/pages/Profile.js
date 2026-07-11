import { useEffect, useState } from "react";
import html from "../lib/html.js";
import Layout from "../components/Layout.js";
import Button from "../components/Button.js";
import Spinner, { EmptyState } from "../components/Spinner.js";
import StatusBadge from "../components/StatusBadge.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";
import { navigate } from "../router.js";
import { getTheme, applyTheme } from "../theme.js";

const ROLE_LABELS = {
  ROLE_USER: "Customer",
  ROLE_GARAGE_OWNER: "Garage Owner",
  ROLE_GARAGE_MEMBER: "Technician",
};

export default function Profile() {
  const { session, logout } = useAuth();
  const back = session ? homePathForRole(primaryRole(session.roles)) : "/login";
  const isCustomer = (session?.roles || []).includes("ROLE_USER");

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", nationality: "", residentialAddress: "" });
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState(getTheme());

  const load = () =>
    Promise.all([api.get("/api/users/me"), isCustomer ? api.get("/api/bookings/my") : Promise.resolve([])])
      .then(([u, o]) => {
        setProfile(u);
        setForm({ email: u.email, phone: u.phone, nationality: u.nationality || "", residentialAddress: u.residentialAddress || "" });
        setOrders(o.sort((a, b) => b.id - a.id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const startEdit = () => {
    setForm({
      email: profile.email,
      phone: profile.phone,
      nationality: profile.nationality || "",
      residentialAddress: profile.residentialAddress || "",
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put("/api/users/me", form);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  if (loading) return html`<${Layout} title="Profile" back=${back}><${Spinner} dark /><//>`;

  return html`
    <${Layout} title="Profile" back=${back}>
      ${error && html`<div className="error-banner">${error}</div>`}

      <div className="card">
        <div className="card-row" style=${{ marginBottom: 12 }}>
          <p className="card-title" style=${{ margin: 0 }}>User details</p>
          ${!editing && html`<${Button} size="sm" variant="outline" onClick=${startEdit}>Edit<//>`}
        </div>

        ${editing
          ? html`
              <form onSubmit=${saveEdit}>
                <div className="field">
                  <label>Username</label>
                  <input value=${profile.username} disabled />
                </div>
                <div className="field">
                  <label>Email ID</label>
                  <input type="email" value=${form.email} onChange=${(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="field">
                  <label>Contact number</label>
                  <input value=${form.phone} onChange=${(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label>Nationality</label>
                  <input value=${form.nationality} onChange=${(e) => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Indian" />
                </div>
                <div className="field">
                  <label>Residential address</label>
                  <textarea
                    value=${form.residentialAddress}
                    onChange=${(e) => setForm({ ...form, residentialAddress: e.target.value })}
                    placeholder="House no., street, city, state, PIN"
                    rows="3"
                  ></textarea>
                </div>
                <div className="btn-block-row">
                  <${Button} variant="outline" type="button" onClick=${() => setEditing(false)}>Cancel<//>
                  <${Button} type="submit" loading=${saving}>Save<//>
                </div>
              </form>
            `
          : html`
              <p className="card-sub">Username: <strong>${profile.username}</strong></p>
              <p className="card-sub">Email ID: ${profile.email}</p>
              <p className="card-sub">Contact number: ${profile.phone}</p>
              <p className="card-sub">Nationality: ${profile.nationality || "—"}</p>
              <p className="card-sub">Residential address: ${profile.residentialAddress || "—"}</p>
              <div style=${{ marginTop: 8 }}>
                ${(profile.roles || []).map(
                  (r) => html`<span key=${r} className="badge badge-ASSIGNED" style=${{ marginRight: 6 }}>${ROLE_LABELS[r] || r}</span>`
                )}
              </div>
            `}
      </div>

      ${isCustomer &&
      html`
        <p className="section-title">Order list</p>
        ${orders.length === 0 && html`<${EmptyState} emoji="🧾" title="No orders yet" subtitle="Your bookings will show up here." />`}
        ${orders.map(
          (o) => html`
            <div key=${o.id} className="card">
              <div className="card-row">
                <div>
                  <p className="card-title">${o.garage.name}</p>
                  <p className="card-sub">${o.faultType.name.replaceAll("_", " ")} · ${o.appointmentDate}</p>
                </div>
                <${StatusBadge} status=${o.status} />
              </div>
            </div>
          `
        )}
      `}

      <p className="section-title">Settings</p>
      <div className="card card-row">
        <div>
          <p className="card-title" style=${{ margin: 0 }}>Appearance</p>
          <p className="card-sub">${theme === "dark" ? "Night mode" : "Day mode"}</p>
        </div>
        <button className="theme-toggle" title="Toggle day/night mode" onClick=${toggleTheme}>
          ${theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <${Button}
        variant="danger"
        onClick=${() => {
          logout();
          navigate("/login");
        }}
      >
        Log out
      <//>
    <//>
  `;
}
