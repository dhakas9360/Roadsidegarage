import { useState } from "react";
import html from "../lib/html.js";
import Button from "../components/Button.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";
import { navigate, Link } from "../router.js";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.post("/auth/login", form);
      login(session);
      navigate(homePathForRole(primaryRole(session.roles)));
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
          <div style=${{ color: "#b7b9c2", marginTop: 6 }}>Roadside help, sorted fast.</div>
        </div>
        <div className="card">
          <div className="section-title">Log in</div>
          ${error && html`<div className="error-banner">${error}</div>`}
          <form onSubmit=${submit}>
            <div className="field">
              <label>Username</label>
              <input required value=${form.username} onChange=${set("username")} placeholder="e.g. cust1" />
            </div>
            <div className="field">
              <label>Password</label>
              <input required type="password" value=${form.password} onChange=${set("password")} placeholder="••••••••" />
            </div>
            <${Button} type="submit" loading=${loading}>Log in<//>
          </form>
          <div className="muted" style=${{ textAlign: "center", marginTop: 16 }}>
            New here? <${Link} to="/register" className="link-plain">Create an account<//>
          </div>
        </div>
      </div>
    </div>
  `;
}
