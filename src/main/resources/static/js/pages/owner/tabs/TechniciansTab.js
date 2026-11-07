import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import { Alert } from "../../../components/Layout.js";
import { RatingStars } from "../../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

export default function TechniciansTab({ garageId, onChange }) {
  const [members, setMembers] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState("");

  const load = () =>
    Promise.all([api.get(`/api/garage-members/garage/${garageId}`), api.get("/api/garage-members/available-technicians")])
      .then(([m, a]) => {
        setMembers(m.sort((x, y) => Number(y.available) - Number(x.available) || (y.rating || 0) - (x.rating || 0)));
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
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return html`<${SkeletonList} count=${2} />`;

  return html`
    <${Alert} onClose=${() => setError(null)}>${error}<//>

    ${available.length > 0 &&
    html`
      <form className="card" onSubmit=${addTechnician}>
        <div className="card-title">Add a technician</div>
        <p className="card-sub" style=${{ marginBottom: 12 }}>Technician accounts that haven't joined a garage yet.</p>
        <div className="input-row">
          <select className="input" aria-label="Technician" value=${selected} onChange=${(e) => setSelected(e.target.value)}>
            ${available.map((u) => html`<option key=${u.id} value=${u.id}>${u.username}</option>`)}
          </select>
          <${Button} type="submit" size="sm" icon="plus" loading=${saving}>Add<//>
        </div>
      </form>
    `}

    ${members.length === 0
      ? html`<div className="card"><${EmptyState} icon="users" title="No technicians yet" subtitle="Technicians can join your garage from their app, or you can add them above." /></div>`
      : html`
          <div className="section-title">Team · ${members.length}</div>
          ${members.map(
            (m) => html`
              <div key=${m.id} className="card">
                <div className="person">
                  <div className="person-avatar">${(m.username || "?").charAt(0).toUpperCase()}</div>
                  <div style=${{ minWidth: 0, flex: 1 }}>
                    <p className="card-title">${m.username || `Technician #${m.userId}`}</p>
                    <p className="card-sub"><span className=${`online-dot ${m.available ? "on" : ""}`}></span>${m.available ? "Online" : "Offline"} · ${m.activeJobs || 0} active job${m.activeJobs === 1 ? "" : "s"}</p>
                  </div>
                  ${m.phone && html`<a className="btn btn-outline btn-sm" href=${`tel:${m.phone}`} aria-label=${`Call ${m.username}`}>Call</a>`}
                </div>
                <div className="card-footer">
                  <${RatingStars} value=${m.rating} count=${m.ratingCount || 0} />
                </div>
              </div>
            `
          )}
        `}
  `;
}
