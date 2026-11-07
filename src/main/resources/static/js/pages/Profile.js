import { useEffect, useState } from "react";
import html from "../lib/html.js";
import Layout, { Alert } from "../components/Layout.js";
import Button from "../components/Button.js";
import Icon from "../components/Icon.js";
import { SkeletonList } from "../components/Spinner.js";
import StatusBadge from "../components/StatusBadge.js";
import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { navigate } from "../router.js";
import { getTheme, applyTheme } from "../theme.js";
import { humanize, friendlyDate, money } from "../lib/format.js";

const ROLE_LABELS = {
  ROLE_USER: "Customer",
  ROLE_GARAGE_OWNER: "Garage owner",
  ROLE_GARAGE_MEMBER: "Technician",
};

function DetailRow({ icon, label, value }) {
  return html`
    <div className="detail-row">
      <span className="detail-icon"><${Icon} name=${icon} size=${16} /></span>
      <div style=${{ minWidth: 0 }}>
        <p className="detail-label">${label}</p>
        <p className="detail-value">${value || html`<span className="muted">Not set</span>`}</p>
      </div>
    </div>
  `;
}

export default function Profile() {
  const { session, logout } = useAuth();
  const isCustomer = (session?.roles || []).includes("ROLE_USER");

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", nationality: "", residentialAddress: "" });
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    Promise.all([api.get("/api/users/me"), isCustomer ? api.get("/api/bookings/my") : Promise.resolve([])])
      .then(([u, o]) => {
        setProfile(u);
        setOrders(o.sort((a, b) => b.id - a.id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = () => {
    setForm({ email: profile.email, phone: profile.phone, nationality: profile.nationality || "", residentialAddress: profile.residentialAddress || "" });
    setSaved(null);
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put("/api/users/me", { ...form, phone: form.phone.replace(/[\s-]/g, "") });
      setProfile(updated);
      setEditing(false);
      setSaved("Profile updated.");
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

  if (loading) return html`<${Layout} title="Profile"><${SkeletonList} count=${2} /><//>`;
  if (!profile) return html`<${Layout} title="Profile"><${Alert}>${error || "Couldn't load your profile."}<//><//>`;

  const totalSpent = orders.filter((o) => o.status === "COMPLETED" || o.status === "RATED").reduce((s, o) => s + (o.quotedPrice || 0), 0);

  return html`
    <${Layout} title="Profile">
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <${Alert} tone="success" onClose=${() => setSaved(null)}>${saved}<//>

      <div className="card profile-hero">
        <div className="profile-avatar">${(profile.username || "?").charAt(0).toUpperCase()}</div>
        <div style=${{ minWidth: 0 }}>
          <h2>${profile.username}</h2>
          <p>${profile.email}</p>
          <div className="badge-row">
            ${(profile.roles || []).map((r) => html`<span key=${r} className="badge badge-accent">${ROLE_LABELS[r] || r}</span>`)}
          </div>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">Details</div>
        ${!editing && html`<${Button} size="sm" variant="ghost" icon="edit" onClick=${startEdit}>Edit<//>`}
      </div>
      <div className="card">
        ${editing
          ? html`
              <form onSubmit=${saveEdit}>
                <div className="field">
                  <label htmlFor="pf-email">Email</label>
                  <input id="pf-email" required type="email" value=${form.email} onChange=${(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="pf-phone">Phone</label>
                  <input id="pf-phone" required type="tel" value=${form.phone} onChange=${(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="pf-nat">Nationality</label>
                  <input id="pf-nat" value=${form.nationality} onChange=${(e) => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Indian" />
                </div>
                <div className="field">
                  <label htmlFor="pf-addr">Home address</label>
                  <textarea id="pf-addr" rows="3" value=${form.residentialAddress} onChange=${(e) => setForm({ ...form, residentialAddress: e.target.value })} placeholder="House no., street, city, PIN"></textarea>
                </div>
                <div className="btn-row">
                  <${Button} variant="outline" type="button" onClick=${() => setEditing(false)}>Cancel<//>
                  <${Button} type="submit" loading=${saving}>Save changes<//>
                </div>
              </form>
            `
          : html`
              <${DetailRow} icon="mail" label="Email" value=${profile.email} />
              <${DetailRow} icon="phone" label="Phone" value=${profile.phone} />
              <${DetailRow} icon="globe" label="Nationality" value=${profile.nationality} />
              <${DetailRow} icon="garage" label="Home address" value=${profile.residentialAddress} />
            `}
      </div>

      ${isCustomer &&
      orders.length > 0 &&
      html`
        <div className="section-head">
          <div className="section-title">Recent bookings</div>
          <${Button} size="sm" variant="ghost" iconRight="chevron" onClick=${() => navigate("/customer/bookings")}>See all<//>
        </div>
        <div className="stats" style=${{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat"><div className="stat-value">${orders.length}</div><div className="stat-label">Bookings</div></div>
          <div className="stat"><div className="stat-value">${money(totalSpent)}</div><div className="stat-label">Spent on fixes</div></div>
        </div>
        ${orders.slice(0, 3).map(
          (o) => html`
            <div key=${o.id} className="card card-row">
              <div style=${{ minWidth: 0 }}>
                <p className="card-title" style=${{ fontSize: 15 }}>${humanize(o.faultType.name)}</p>
                <p className="card-sub">${o.garage.name} · ${friendlyDate(o.appointmentDate)}</p>
              </div>
              <${StatusBadge} status=${o.status} />
            </div>
          `
        )}
      `}

      <div className="section-title">Settings</div>
      <div className="card">
        <div className="settings-row">
          <div className="person">
            <span className="detail-icon"><${Icon} name=${theme === "dark" ? "moon" : "sun"} size=${16} /></span>
            <div>
              <p className="detail-value" style=${{ margin: 0 }}>Dark mode</p>
              <p className="detail-label">${theme === "dark" ? "On" : "Off"}</p>
            </div>
          </div>
          <button type="button" className="switch" role="switch" aria-checked=${theme === "dark"} aria-label="Dark mode" onClick=${toggleTheme}>
            <span className="switch-track"></span><span className="switch-thumb"></span>
          </button>
        </div>
      </div>

      <${Button}
        variant="danger"
        icon="logout"
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
