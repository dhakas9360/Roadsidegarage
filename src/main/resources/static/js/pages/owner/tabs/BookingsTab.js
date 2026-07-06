import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import StatusBadge from "../../../components/StatusBadge.js";
import Spinner, { EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

const CANCELLABLE = new Set(["PENDING", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS"]);

export default function BookingsTab({ garageId }) {
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [picked, setPicked] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  const retryAutoAssign = async (id) => {
    setBusyId(id);
    setError(null);
    try {
      const result = await api.patch(`/api/bookings/${id}/reassign`);
      if (result.status === "UNASSIGNED") setError("Still no technician available at this garage.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const assignPicked = async (id) => {
    const technicianId = picked[id];
    if (!technicianId) {
      setError("Pick a technician first.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/api/bookings/${id}/assign?technicianId=${technicianId}`);
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
          ${b.serviceAddress && html`<p className="card-sub" style=${{ marginTop: 6 }}>📍 ${b.serviceAddress}</p>`}
          <p className="card-sub" style=${{ marginTop: 2 }}>
            👤 ${b.customerName || "unknown"}${b.customerPhone ? ` · ${b.customerPhone}` : ""}
            ${b.technicianName && html` · 🔧 ${b.technicianName}`}
          </p>
          ${b.status === "UNASSIGNED" &&
          html`
            <div className="card-row" style=${{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
              <select
                value=${picked[b.id] || ""}
                onChange=${(e) => setPicked({ ...picked, [b.id]: e.target.value })}
                style=${{ flex: 1, minWidth: 140 }}
              >
                <option value="">Pick a technician...</option>
                ${technicians.map(
                  (t) => html`<option key=${t.id} value=${t.id}>${t.username || `Tech #${t.userId}`} (${t.activeJobs || 0} active)<//>`
                )}
              </select>
              <${Button} size="sm" loading=${busyId === b.id} onClick=${() => assignPicked(b.id)}>Assign<//>
            </div>
            <div style=${{ marginTop: 8 }}>
              <${Button} size="sm" variant="outline" loading=${busyId === b.id} onClick=${() => retryAutoAssign(b.id)}>
                🔁 Retry auto-assign (top rated)
              <//>
            </div>
          `}
          <div className="card-row" style=${{ marginTop: 10 }}>
            <div className="muted">₹${b.quotedPrice}</div>
            ${CANCELLABLE.has(b.status) &&
            html`<${Button} size="sm" variant="danger" loading=${busyId === b.id} onClick=${() => cancel(b.id)}>Cancel<//>`}
          </div>
        </div>
      `
    )}
  `;
}
