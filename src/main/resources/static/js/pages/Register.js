import { useState } from "react";
import html from "../lib/html.js";
import Button from "../components/Button.js";
import { api } from "../api.js";
import { navigate, Link } from "../router.js";

const ROLES = [
  { value: "ROLE_USER", label: "Customer", icon: "🚗" },
  { value: "ROLE_GARAGE_OWNER", label: "Garage Owner", icon: "🏠" },
  { value: "ROLE_GARAGE_MEMBER", label: "Technician", icon: "🔧" },
];

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "ROLE_USER" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        roles: [form.role],
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div className="center-screen" style=${{ background: "var(--ink)" }}>
      <div className="auth-card">
        <div style=${{ textAlign: "center", marginBottom: 24, color: "#fff" }}>
          <div className="brand" style=${{ justifyContent: "center", fontSize: 28 }}>
            <span className="brand-mark">RF</span><span>RoadFix</span>
          </div>
        </div>
        <div className="card">
          <div className="section-title">Create account</div>
          ${error && html`<div className="error-banner">${error}</div>`}
          ${success
            ? html`
                <div className="success-banner">You're registered! Log in to continue.</div>
                <${Button} onClick=${() => navigate("/login")}>Go to login<//>
              `
            : html`
                <form onSubmit=${submit}>
                  <div className="field">
                    <label>I am a...</label>
                    <div className="role-picker">
                      ${ROLES.map(
                        (r) => html`
                          <div
                            key=${r.value}
                            className=${`role-chip ${form.role === r.value ? "active" : ""}`}
                            onClick=${() => setForm({ ...form, role: r.value })}
                          >
                            <div style=${{ fontSize: 18 }}>${r.icon}</div>
                            ${r.label}
                          </div>
                        `
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <label>Username</label>
                    <input required value=${form.username} onChange=${set("username")} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input required type="email" value=${form.email} onChange=${set("email")} />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input required type="password" minLength="6" value=${form.password} onChange=${set("password")} />
                  </div>
                  <${Button} type="submit" loading=${loading}>Create account<//>
                </form>
              `}
          <div className="muted" style=${{ textAlign: "center", marginTop: 16 }}>
            Already have an account? <${Link} to="/login" className="link-plain">Log in<//>
          </div>
        </div>
      </div>
    </div>
  `;
}
