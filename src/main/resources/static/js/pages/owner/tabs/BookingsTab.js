import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import StatusBadge from "../../../components/StatusBadge.js";
import Spinner, { EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

const CANCELLABLE = new Set(["PENDING", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS"]);

export default function BookingsTab({ garageId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api
      .get(`/api/bookings/garage/${garageId}`)
      .then((data) => setBookings(data.sort((a, b) => b.id - a.id)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [garageId]);

  const cancel = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/api/bookings/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return html`<${Spinner} dark />`;

  return html`
    ${error && html`<div className="error-banner">${error}</div>`}
    ${bookings.length === 0 && html`<${EmptyState} emoji="🧾" title="No bookings yet" />`}
    ${bookings.map(
      (b) => html`
        <div key=${b.id} className="card">
          <div className="card-row">
            <div>
              <p className="card-title">${b.faultType.name.replaceAll("_", " ")}</p>
              <p className="card-sub">${b.vehicle.vehicleType.name} · ${b.appointmentDate}</p>
            </div>
            <${StatusBadge} status=${b.status} />
          </div>
          <div className="card-row" style=${{ marginTop: 10 }}>
            <div className="muted">
              ₹${b.quotedPrice} ${b.assignedMember ? `· tech #${b.assignedMember.userId}` : ""}
            </div>
            ${CANCELLABLE.has(b.status) &&
            html`<${Button} size="sm" variant="danger" loading=${busyId === b.id} onClick=${() => cancel(b.id)}>Cancel<//>`}
          </div>
        </div>
      `
    )}
  `;
}
