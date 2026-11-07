import { useEffect, useState } from "react";
import html from "../lib/html.js";
import Layout, { Alert } from "../components/Layout.js";
import Button from "../components/Button.js";
import Icon from "../components/Icon.js";
import { SkeletonList, EmptyState } from "../components/Spinner.js";
import { api } from "../api.js";
import { useAuth, homePathForRole, primaryRole } from "../auth.js";
import { navigate } from "../router.js";
import { timeAgo } from "../lib/format.js";

// pick an icon + colour from the message text (notifications are plain strings server-side)
function kindOf(message) {
  const m = message.toLowerCase();
  if (m.includes("cancel")) return { icon: "x", tone: "red" };
  if (m.includes("complete")) return { icon: "check", tone: "green" };
  if (m.includes("rating") || m.includes("★")) return { icon: "star", tone: "violet" };
  if (m.includes("started")) return { icon: "wrench", tone: "blue" };
  if (m.includes("assigned") || m.includes("new job")) return { icon: "user", tone: "blue" };
  if (m.includes("pending") || m.includes("needs a technician")) return { icon: "clock", tone: "amber" };
  return { icon: "bell", tone: "" };
}

function bookingPathFor(role) {
  if (role === "ROLE_GARAGE_MEMBER") return "/technician/jobs";
  if (role === "ROLE_USER") return "/customer/bookings";
  return "/owner/garages";
}

export default function Notifications() {
  const { session, role } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    api
      .get("/api/notifications")
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const open = async (n) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api.patch(`/api/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.bookingId) navigate(bookingPathFor(role));
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
  const unreadCount = items.filter((n) => !n.read).length;

  return html`
    <${Layout}
      title="Notifications"
      subtitle=${unreadCount ? `${unreadCount} unread` : undefined}
      back=${back}
      actions=${unreadCount > 0 && html`<${Button} size="sm" variant="ghost" icon="check" loading=${markingAll} onClick=${markAllRead}>Read all<//>`}
    >
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      ${loading && html`<${SkeletonList} count=${3} />`}
      ${!loading && items.length === 0 && html`<div className="card"><${EmptyState} icon="bell" title="You're all caught up" subtitle="Booking updates will show up here." /></div>`}
      ${items.map((n) => {
        const k = kindOf(n.message);
        return html`
          <div
            key=${n.id}
            className=${`card notif-item ${n.read ? "" : "unread"} ${n.bookingId ? "card-interactive" : ""}`}
            role=${n.bookingId || !n.read ? "button" : undefined}
            tabIndex=${n.bookingId || !n.read ? "0" : undefined}
            onClick=${() => open(n)}
          >
            <span className=${`notif-icon ${k.tone}`}><${Icon} name=${k.icon} size=${17} /></span>
            <div className="notif-body">
              <div className="notif-msg">${n.message}</div>
              <div className="notif-time">${timeAgo(n.createdAt)}</div>
            </div>
            ${!n.read && html`<span className="unread-dot" aria-label="Unread"></span>`}
          </div>
        `;
      })}
    <//>
  `;
}
