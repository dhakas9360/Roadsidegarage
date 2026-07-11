import { useEffect, useRef, useState } from "react";
import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { navigate } from "../router.js";
import { api } from "../api.js";

const POLL_MS = 15000;

export default function TopBar({ title, subtitle, back }) {
  const { logout, session } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const poll = () =>
      api
        .get("/api/notifications/unread-count")
        .then((r) => {
          if (!cancelled) setUnread(r.count);
        })
        .catch(() => {});
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  return html`
    <div className="topbar">
      <div className="topbar-row">
        <div className="brand" style=${back ? { cursor: "pointer" } : {}} onClick=${back ? () => navigate(back) : undefined}>
          ${back && html`<span>←</span>`}
          ${!title && html`<span className="brand-mark">RF</span>`}
          <span>${title || "RoadFix"}</span>
        </div>
        <div style=${{ display: "flex", gap: 6 }}>
          <button className="icon-btn" title="Notifications" style=${{ position: "relative" }} onClick=${() => navigate("/notifications")}>
            🔔
            ${unread > 0 && html`<span className="notif-badge">${unread > 9 ? "9+" : unread}</span>`}
          </button>
          <div className="user-menu" ref=${menuRef} style=${{ position: "relative" }}>
            <button className="icon-btn" title="Account" onClick=${() => setMenuOpen((v) => !v)}>
              👤
            </button>
            ${menuOpen &&
            html`
              <div className="user-menu-dropdown">
                <button
                  className="user-menu-item"
                  onClick=${() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <span className="user-menu-icon">👤</span>User Profile
                </button>
                <button
                  className="user-menu-item"
                  onClick=${() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                >
                  <span className="user-menu-icon">⚙️</span>Settings
                </button>
                <button
                  className="user-menu-item user-menu-item-danger"
                  onClick=${() => {
                    setMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  <span className="user-menu-icon">🚪</span>Log out
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
      ${subtitle && html`<div className="topbar-sub">${subtitle}</div>`}
    </div>
  `;
}
