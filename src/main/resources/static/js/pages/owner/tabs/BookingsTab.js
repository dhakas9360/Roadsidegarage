import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button, { ConfirmButton } from "../../../components/Button.js";
import Icon from "../../../components/Icon.js";
import { Alert } from "../../../components/Layout.js";
import StatusBadge from "../../../components/StatusBadge.js";
import { RatingStars } from "../../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";
import { ACTIVE_STATUSES, humanize, money, friendlyDate, poll } from "../../../lib/format.js";

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "waiting", label: "Needs technician" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
];

const MATCH = {
  active: (b) => ACTIVE_STATUSES.has(b.status),
  waiting: (b) => b.status === "UNASSIGNED",
  done: (b) => !ACTIVE_STATUSES.has(b.status),
  all: () => true,
};

export default function BookingsTab({ garageId, onChange }) {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [picked, setPicked] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [chosenFilter, setFilter] = useState(null);

  const load = () =>
    Promise.all([api.get(`/api/bookings/garage/${garageId}`), api.get(`/api/garage-members/garage/${garageId}`)])
      .then(([b, t]) => {
        setBookings(b.sort((a, c) => c.id - a.id));
        setTechnicians(t);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    return poll(load, 15000);
  }, [garageId]);

  const run = async (id, fn) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (id) => run(id, () => api.patch(`/api/bookings/${id}/cancel`));

  const retryAutoAssign = (id) =>
    run(id, async () => {
      const result = await api.patch(`/api/bookings/${id}/reassign`);
      if (result.status === "UNASSIGNED") setNotice("Every technician is offline or at their job limit. The booking will be assigned automatically when someone frees up.");
    });

  const assignPicked = (id) => {
    if (!picked[id]) return setError("Pick a technician first.");
    return run(id, () => api.patch(`/api/bookings/${id}/assign?technicianId=${picked[id]}`));
  };

  if (loading) return html`<${SkeletonList} count=${2} />`;

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, bookings.filter(MATCH[f.key]).length]));
  // open on what needs attention: waiting > active > everything
  const filter = chosenFilter ?? (counts.waiting ? "waiting" : counts.active ? "active" : "all");
  const visible = bookings.filter(MATCH[filter]);

  return html`
    <${Alert} onClose=${() => setError(null)}>${error}<//>
    <${Alert} tone="info" onClose=${() => setNotice(null)}>${notice}<//>

    <div className="chips">
      ${FILTERS.map(
        (f) => html`<button key=${f.key} type="button" className=${`chip ${filter === f.key ? "active" : ""}`} onClick=${() => setFilter(f.key)}>${f.label} · ${counts[f.key]}</button>`
      )}
    </div>

    ${visible.length === 0 &&
    html`<div className="card"><${EmptyState} icon="receipt" title=${bookings.length ? "Nothing here" : "No bookings yet"} subtitle=${bookings.length ? "Try another filter." : "Bookings from nearby customers will appear here."} /></div>`}

    ${visible.map(
      (b) => html`
        <article key=${b.id} className="card fade-in">
          <div className="card-row top">
            <div style=${{ minWidth: 0 }}>
              <p className="card-title">${humanize(b.faultType.name)}</p>
              <p className="card-sub">#${b.id} · ${friendlyDate(b.appointmentDate)} · ${humanize(b.vehicle.vehicleType.name)}${b.vehicle.model ? ` ${b.vehicle.model}` : ""}</p>
            </div>
            <${StatusBadge} status=${b.status} />
          </div>
          <div className="meta-list">
            <span className="meta">
              <${Icon} name="user" size=${15} /><span>${b.customerName || "Customer"}</span>
              ${b.customerPhone && html`<span className="meta-sep">·</span><a href=${`tel:${b.customerPhone}`}>${b.customerPhone}</a>`}
            </span>
            ${b.serviceAddress && html`<span className="meta"><${Icon} name="pin" size=${15} /> ${b.serviceAddress}</span>`}
            ${b.technicianName && html`<span className="meta"><${Icon} name="wrench" size=${15} /> ${b.technicianName}</span>`}
            ${b.status === "RATED" && html`<span className="meta"><${RatingStars} value=${b.rating} />${b.ratingComment && html`<span className="muted">“${b.ratingComment}”</span>`}</span>`}
          </div>

          ${b.status === "UNASSIGNED" &&
          html`
            <div className="alert alert-warning" style=${{ marginTop: 12, marginBottom: 10 }}>
              <span className="alert-text">Waiting for a technician. Assign one now, or it'll be picked up automatically when someone frees up.</span>
            </div>
            ${technicians.length === 0
              ? html`<p className="hint">No technicians in this garage yet — add one from the Team tab.</p>`
              : html`
                  <div className="input-row">
                    <select className="input" aria-label="Technician" value=${picked[b.id] || ""} onChange=${(e) => setPicked({ ...picked, [b.id]: e.target.value })}>
                      <option value="">Choose technician…</option>
                      ${technicians.map(
                        (t) => html`<option key=${t.id} value=${t.id}>${t.username || `Tech #${t.userId}`} — ${t.available ? "online" : "offline"}, ${t.activeJobs || 0} active</option>`
                      )}
                    </select>
                    <${Button} size="sm" loading=${busyId === b.id} onClick=${() => assignPicked(b.id)}>Assign<//>
                  </div>
                  <div style=${{ marginTop: 8 }}>
                    <${Button} size="sm" variant="ghost" icon="refresh" disabled=${busyId === b.id} onClick=${() => retryAutoAssign(b.id)}>Auto-assign best available<//>
                  </div>
                `}
          `}

          <div className="card-footer">
            <span className="price-sm">${money(b.quotedPrice)}</span>
            ${ACTIVE_STATUSES.has(b.status) &&
            html`<${ConfirmButton} size="sm" confirmLabel="Confirm cancel" loading=${busyId === b.id} onConfirm=${() => cancel(b.id)}>Cancel booking<//>`}
          </div>
        </article>
      `
    )}
  `;
}
