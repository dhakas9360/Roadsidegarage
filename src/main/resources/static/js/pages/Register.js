import { useState } from "react";
import html from "../lib/html.js";
import Button from "../components/Button.js";
import Icon from "../components/Icon.js";
import { Alert } from "../components/Layout.js";
import { AuthShell } from "./Login.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";
import { navigate, Link } from "../router.js";

const ROLES = [
  { value: "ROLE_USER", label: "Customer", icon: "car", hint: "I need help with my vehicle" },
  { value: "ROLE_GARAGE_OWNER", label: "Garage owner", icon: "garage", hint: "I run a garage" },
  { value: "ROLE_GARAGE_MEMBER", label: "Technician", icon: "wrench", hint: "I fix vehicles at a garage" },
];

export default function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", role: "ROLE_USER" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const selectedRole = ROLES.find((r) => r.value === form.role);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credentials = { username: form.username.trim(), password: form.password };
      await api.post("/auth/register", {
        ...credentials,
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        roles: [form.role],
      });
      // sign straight in instead of bouncing the user back to the login form
      const session = await api.post("/auth/login", credentials);
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
      title="Create your account"
      subtitle="One account for every roadside emergency."
      footer=${html`<div className="auth-switch">Already have an account? <${Link} to="/login" className="link-plain">Log in<//></div>`}
    >
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <form onSubmit=${submit}>
        <div className="field">
          <span className="label">I am a…</span>
          <div className="role-picker" role="radiogroup">
            ${ROLES.map(
              (r) => html`
                <button
                  type="button"
                  role="radio"
                  aria-checked=${form.role === r.value}
                  key=${r.value}
                  className=${`role-chip ${form.role === r.value ? "active" : ""}`}
                  onClick=${() => setForm({ ...form, role: r.value })}
                >
                  <${Icon} name=${r.icon} size=${22} />
                  ${r.label}
                </button>
              `
            )}
          </div>
          <p className="hint">${selectedRole.hint}</p>
        </div>
        <div className="field field-icon">
          <label htmlFor="reg-user">Username</label>
          <span className="field-icon-glyph"><${Icon} name="user" size=${17} /></span>
          <input id="reg-user" required autoComplete="username" value=${form.username} onChange=${set("username")} placeholder="Pick a username" />
        </div>
        <div className="field field-icon">
          <label htmlFor="reg-email">Email</label>
          <span className="field-icon-glyph"><${Icon} name="mail" size=${17} /></span>
          <input id="reg-email" required type="email" autoComplete="email" value=${form.email} onChange=${set("email")} placeholder="you@example.com" />
        </div>
        <div className="field field-icon">
          <label htmlFor="reg-phone">Phone</label>
          <span className="field-icon-glyph"><${Icon} name="phone" size=${17} /></span>
          <input
            id="reg-phone"
            required
            type="tel"
            autoComplete="tel"
            pattern="[+]?[0-9 \\-]{7,18}"
            title="7–15 digits, optionally starting with +"
            placeholder="+91 98765 43210"
            value=${form.phone}
            onChange=${set("phone")}
          />
        </div>
        <div className="field field-icon">
          <label htmlFor="reg-pass">Password</label>
          <span className="field-icon-glyph"><${Icon} name="lock" size=${17} /></span>
          <input id="reg-pass" required type="password" autoComplete="new-password" minLength="6" value=${form.password} onChange=${set("password")} placeholder="At least 6 characters" />
        </div>
        <${Button} type="submit" size="lg" loading=${loading}>Create account<//>
      </form>
    <//>
  `;
}
