import { useEffect, useRef, useState } from "react";
import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { navigate } from "../router.js";
import { api } from "../api.js";
import Icon from "./Icon.js";
import { getTheme, applyTheme } from "../theme.js";

const POLL_MS = 15000;

export default function TopBar({ title, subtitle, back, actions }) {
  const { logout, session } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const poll = () =>
      api
        .get("/api/notifications/unread-count")
        .then((r) => !cancelled && setUnread(r.count))
        .catch(() => {});
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const initial = (session?.username || "?").charAt(0).toUpperCase();

  return html`
    <header className="topbar">
      <div className="topbar-row">
        <div className="topbar-left">
          ${back
            ? html`<button className="icon-btn" aria-label="Back" onClick=${() => navigate(back)}><${Icon} name="back" size=${20} /></button>`
            : html`<span className="brand-mark" aria-hidden="true"><${Icon} name="wrench" size=${16} strokeWidth=${2.4} /></span>`}
          <div className="topbar-titles">
            <h1 className="topbar-title">${title || "RoadFix"}</h1>
            ${subtitle && html`<div className="topbar-sub">${subtitle}</div>`}
          </div>
        </div>
        <div className="topbar-actions">
          ${actions}
          <button className="icon-btn" aria-label=${`Notifications${unread ? ` (${unread} unread)` : ""}`} onClick=${() => navigate("/notifications")}>
            <${Icon} name="bell" size=${20} />
            ${unread > 0 && html`<span className="notif-badge">${unread > 9 ? "9+" : unread}</span>`}
          </button>
          <div className="user-menu" ref=${menuRef}>
            <button className="avatar-btn" aria-label="Account menu" aria-expanded=${menuOpen} onClick=${() => setMenuOpen((v) => !v)}>
              ${initial}
            </button>
            ${menuOpen &&
            html`
              <div className="user-menu-dropdown" role="menu">
                <div className="user-menu-head">
                  <div className="user-menu-name">${session?.username}</div>
                  <div className="user-menu-role">${roleLabel(session?.roles)}</div>
                </div>
                <button className="user-menu-item" role="menuitem" onClick=${() => go("/profile")}>
                  <${Icon} name="user" size=${16} />Profile
                </button>
                <button className="user-menu-item" role="menuitem" onClick=${toggleTheme}>
                  <${Icon} name=${theme === "dark" ? "sun" : "moon"} size=${16} />${theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <div className="user-menu-sep"></div>
                <button
                  className="user-menu-item user-menu-item-danger"
                  role="menuitem"
                  onClick=${() => {
                    setMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  <${Icon} name="logout" size=${16} />Log out
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    </header>
  `;
}

function roleLabel(roles = []) {
  if (roles.includes("ROLE_GARAGE_OWNER")) return "Garage owner";
  if (roles.includes("ROLE_GARAGE_MEMBER")) return "Technician";
  return "Customer";
}
