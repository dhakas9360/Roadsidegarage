import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button, { ConfirmButton } from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import StatusBadge, { StatusTracker } from "../../components/StatusBadge.js";
import { RatingStars } from "../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";
import { ACTIVE_STATUSES, humanize, money, friendlyDate, poll } from "../../lib/format.js";

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

const STATUS_HINT = {
  PENDING: "We're confirming your booking…",
  UNASSIGNED: "All technicians are busy — you'll be assigned automatically as soon as one frees up.",
  ASSIGNED: "A technician is assigned and will start soon.",
  IN_PROGRESS: "Your technician is working on it.",
  COMPLETED: "All done! How did it go?",
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState(null);

  const load = () =>
    api
      .get("/api/bookings/my")
      .then((data) => setBookings(data.sort((a, b) => b.id - a.id)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // live status: refresh every 15s while the page is open
    return poll(load, 15000);
  }, []);

  const cancel = async (id) => {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/api/bookings/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = bookings.filter((b) => ACTIVE_STATUSES.has(b.status)).length;
  const effectiveFilter = filter ?? (activeCount > 0 ? "active" : "all");
  const visible = bookings.filter((b) =>
    effectiveFilter === "all" ? true : effectiveFilter === "active" ? ACTIVE_STATUSES.has(b.status) : !ACTIVE_STATUSES.has(b.status)
  );

  return html`
    <${Layout} title="My bookings" subtitle=${activeCount ? `${activeCount} in progress · updates live` : undefined}>
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      ${loading && html`<${SkeletonList} count=${3} />`}

      ${!loading &&
      bookings.length === 0 &&
      html`
        <div className="card">
          <${EmptyState} icon="receipt" title="No bookings yet" subtitle="When you book a garage, you can track the technician here.">
            <${Button} block=${false} icon="search" onClick=${() => navigate("/customer/home")}>Find help<//>
          <//>
        </div>
      `}

      ${!loading &&
      bookings.length > 0 &&
      html`
        <div className="segmented" role="tablist">
          ${FILTERS.map(
            (f) => html`
              <button key=${f.key} type="button" role="tab" aria-selected=${effectiveFilter === f.key} className=${effectiveFilter === f.key ? "active" : ""} onClick=${() => setFilter(f.key)}>
                ${f.label}${f.key === "active" && activeCount > 0 ? html`<span className="tab-count">${activeCount}</span>` : null}
              </button>
            `
          )}
        </div>
        ${visible.length === 0 && html`<${EmptyState} icon="inbox" title=${effectiveFilter === "active" ? "Nothing in progress" : "No past bookings"} />`}
      `}

      ${visible.map(
        (b) => html`
          <article key=${b.id} className="card fade-in">
            <div className="card-row top">
              <div style=${{ minWidth: 0 }}>
                <p className="card-title">${humanize(b.faultType.name)}</p>
                <p className="card-sub">${b.garage.name} · ${friendlyDate(b.appointmentDate)}</p>
              </div>
              <${StatusBadge} status=${b.status} />
            </div>

            <${StatusTracker} status=${b.status} />
            ${STATUS_HINT[b.status] && html`<p className="hint" style=${{ marginTop: 10 }}>${STATUS_HINT[b.status]}</p>`}

            <div className="meta-list">
              <span className="meta"><${Icon} name="car" size=${15} /> ${b.vehicle.model || humanize(b.vehicle.vehicleType.name)}${b.vehicle.licensePlate ? ` · ${b.vehicle.licensePlate}` : ""}</span>
              ${b.serviceAddress && html`<span className="meta"><${Icon} name="pin" size=${15} /> ${b.serviceAddress}</span>`}
              ${b.technicianName &&
              html`
                <span className="meta">
                  <${Icon} name="wrench" size=${15} /><span>${b.technicianName}</span>
                  ${b.technicianPhone && ACTIVE_STATUSES.has(b.status) && html`<span className="meta-sep">·</span><a href=${`tel:${b.technicianPhone}`}>${b.technicianPhone}</a>`}
                </span>
              `}
              ${b.status === "RATED" && html`<span className="meta"><${RatingStars} value=${b.rating} />${b.ratingComment && html`<span className="muted">“${b.ratingComment}”</span>`}</span>`}
            </div>

            <div className="card-footer">
              <span className="price-sm">${money(b.quotedPrice)}</span>
              <div className="card-actions">
                ${b.technicianPhone &&
                ACTIVE_STATUSES.has(b.status) &&
                html`<a className="btn btn-outline btn-sm" href=${`tel:${b.technicianPhone}`}><${Icon} name="phone" size=${15} /><span>Call</span></a>`}
                ${ACTIVE_STATUSES.has(b.status) &&
                html`<${ConfirmButton} size="sm" confirmLabel="Confirm cancel" loading=${busyId === b.id} onConfirm=${() => cancel(b.id)}>Cancel<//>`}
                ${b.status === "COMPLETED" &&
                html`<${Button} size="sm" icon="star" onClick=${() => navigate(`/customer/rate?id=${b.id}`)}>Rate the job<//>`}
              </div>
            </div>
          </article>
        `
      )}
    <//>
  `;
}
