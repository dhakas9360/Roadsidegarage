import { useEffect, useState } from "react";
import html from "../lib/html.js";
import Layout from "../components/Layout.js";
import Button from "../components/Button.js";
import Spinner, { EmptyState } from "../components/Spinner.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = () =>
    api
      .get("/api/notifications")
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(err.message);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/api/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const back = session ? homePathForRole(primaryRole(session.roles)) : "/login";

  if (loading) return html`<${Layout} title="Notifications" back=${back}><${Spinner} dark /><//>`;

  const hasUnread = items.some((n) => !n.read);

  return html`
    <${Layout} title="Notifications" back=${back}>
      ${error && html`<div className="error-banner">${error}</div>`}
      ${hasUnread &&
      html`
        <div style=${{ textAlign: "right", marginBottom: 10 }}>
          <${Button} size="sm" variant="outline" loading=${markingAll} onClick=${markAllRead}>Mark all as read<//>
        </div>
      `}
      ${items.length === 0 &&
      html`<${EmptyState} emoji="🔔" title="No notifications yet" subtitle="Booking updates will show up here." />`}
      ${items.map(
        (n) => html`
          <div key=${n.id} className=${`card notif-item ${n.read ? "" : "unread"}`} onClick=${() => !n.read && markRead(n.id)} style=${{ cursor: n.read ? "default" : "pointer" }}>
            <p style=${{ margin: 0 }}>${n.message}</p>
            <p className="muted" style=${{ marginTop: 6, marginBottom: 0 }}>${timeAgo(n.createdAt)}</p>
          </div>
        `
      )}
    <//>
  `;
}
