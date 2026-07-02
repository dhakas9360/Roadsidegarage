import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import { RatingStars } from "../../../components/RatingStars.js";
import Spinner, { EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

export default function TechniciansTab({ garageId }) {
  const [members, setMembers] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState("");

  const load = () =>
    Promise.all([api.get(`/api/garage-members/garage/${garageId}`), api.get("/api/garage-members/available-technicians")])
      .then(([m, a]) => {
        setMembers(m);
        setAvailable(a);
        setSelected(a[0]?.id || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [garageId]);

  const addTechnician = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/garage-members", { garageId: Number(garageId), userId: Number(selected) });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return html`<${Spinner} dark />`;

  return html`
    ${error && html`<div className="error-banner">${error}</div>`}

    ${available.length > 0 &&
    html`
      <div className="card">
        <div className="section-title">Add a technician</div>
        <p className="muted" style=${{ marginTop: -8, marginBottom: 12 }}>
          Only accounts registered as Technician that aren't attached to a garage yet show up here.
        </p>
        <form onSubmit=${addTechnician}>
          <div className="field">
            <select value=${selected} onChange=${(e) => setSelected(e.target.value)}>
              ${available.map((u) => html`<option key=${u.id} value=${u.id}>${u.username}<//>`)}
            </select>
          </div>
          <${Button} type="submit" loading=${saving}>Add to this garage<//>
        </form>
      </div>
    `}

    ${members.length === 0
      ? html`<${EmptyState} emoji="🔧" title="No technicians yet" subtitle="Add one above so bookings can be assigned." />`
      : members.map(
          (m) => html`
            <div key=${m.id} className="card card-row">
              <div>
                <p className="card-title">Technician #${m.userId}</p>
                <p className="card-sub">${m.activeJobs || 0} active job(s) · ${m.available ? "Available" : "Unavailable"}</p>
              </div>
              <div style=${{ textAlign: "right" }}>
                <${RatingStars} value=${m.rating} />
                <div className="muted">${m.ratingCount || 0} ratings</div>
              </div>
            </div>
          `
        )}
  `;
}
