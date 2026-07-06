import { useEffect, useState } from "react";
import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { navigate } from "../router.js";
import { api } from "../api.js";

const POLL_MS = 15000;

export default function TopBar({ title, subtitle, back }) {
  const { logout, session } = useAuth();
  const [unread, setUnread] = useState(0);

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
          <button
            className="icon-btn"
            title="Log out"
            onClick=${() => {
              logout();
              navigate("/login");
            }}
          >
            ⏻
          </button>
        </div>
      </div>
      ${subtitle && html`<div className="topbar-sub">${subtitle}</div>`}
    </div>
  `;
}
