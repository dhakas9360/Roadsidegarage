import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import StatusBadge from "../../components/StatusBadge.js";
import { RatingStars } from "../../components/RatingStars.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";

const CANCELLABLE = new Set(["PENDING", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS"]);

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api
      .get("/api/bookings/my")
      .then((data) => setBookings(data.sort((a, b) => b.id - a.id)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

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

  if (loading) return html`<${Layout} title="My bookings"><${Spinner} dark /><//>`;

  return html`
    <${Layout} title="My bookings">
      ${error && html`<div className="error-banner">${error}</div>`}
      ${bookings.length === 0 && html`<${EmptyState} emoji="🧾" title="No bookings yet" subtitle="Go find a garage and book a fix." />`}
      ${bookings.map(
        (b) => html`
          <div key=${b.id} className="card">
            <div className="card-row">
              <div>
                <p className="card-title">${b.garage.name}</p>
                <p className="card-sub">${b.faultType.name.replaceAll("_", " ")} · ${b.appointmentDate}</p>
              </div>
              <${StatusBadge} status=${b.status} />
            </div>
            <div className="card-row" style=${{ marginTop: 10 }}>
              <div className="muted">
                ${b.assignedMember ? "Technician assigned · " : ""}₹${b.quotedPrice}
              </div>
              ${b.status === "RATED" && html`<${RatingStars} value=${b.rating} />`}
              ${b.status === "COMPLETED" &&
              html`<${Button} size="sm" onClick=${() => navigate(`/customer/rate?id=${b.id}`)}>Rate job<//>`}
              ${CANCELLABLE.has(b.status) &&
              html`<${Button} size="sm" variant="danger" loading=${busyId === b.id} onClick=${() => cancel(b.id)}>Cancel<//>`}
            </div>
          </div>
        `
      )}
    <//>
  `;
}
