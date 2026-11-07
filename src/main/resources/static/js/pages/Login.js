import { useState } from "react";
import html from "../lib/html.js";
import Button from "../components/Button.js";
import Icon from "../components/Icon.js";
import { Alert } from "../components/Layout.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";
import { navigate, Link } from "../router.js";

export function AuthShell({ title, subtitle, children, footer }) {
  return html`
    <div className="auth-bg">
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="auth-logo"><${Icon} name="wrench" size=${26} strokeWidth=${2.4} /></div>
          <h1 className="auth-title">${title}</h1>
          <p className="auth-sub">${subtitle}</p>
        </div>
        <div className="card">${children}</div>
        ${footer}
        <div className="auth-footer">RoadFix · Created by <a href="mailto:dhakaankit357@gmail.com">Ankit Dhaka</a></div>
      </div>
    </div>
  `;
}

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.post("/auth/login", { username: form.username.trim(), password: form.password });
      login(session);
      navigate(homePathForRole(primaryRole(session.roles)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <${AuthShell}
      title="Welcome back"
      subtitle="Flat tyre, dead battery, bad day — let's get you moving."
      footer=${html`<div className="auth-switch">New to RoadFix? <${Link} to="/register" className="link-plain">Create an account<//></div>`}
    >
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <form onSubmit=${submit}>
        <div className="field field-icon">
          <label htmlFor="login-user">Username</label>
          <span className="field-icon-glyph"><${Icon} name="user" size=${17} /></span>
          <input id="login-user" required autoComplete="username" autoFocus value=${form.username} onChange=${set("username")} placeholder="Your username" />
        </div>
        <div className="field field-icon">
          <label htmlFor="login-pass">Password</label>
          <span className="field-icon-glyph"><${Icon} name="lock" size=${17} /></span>
          <input
            id="login-pass"
            required
            autoComplete="current-password"
            type=${showPassword ? "text" : "password"}
            value=${form.password}
            onChange=${set("password")}
            placeholder="Your password"
            style=${{ paddingRight: 64 }}
          />
          <button type="button" className="btn btn-ghost btn-sm" style=${{ position: "absolute", right: 5, bottom: 5 }} onClick=${() => setShowPassword((v) => !v)}>
            ${showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <${Button} type="submit" size="lg" loading=${loading} iconRight="chevron">Log in<//>
      </form>
    <//>
  `;
}
