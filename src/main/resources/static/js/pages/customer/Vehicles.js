import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { VEHICLE_EMOJI, humanize } from "../../lib/format.js";

const EMPTY_FORM = { model: "", year: "", licensePlate: "" };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicleTypeId: "", ...EMPTY_FORM });

  const load = () =>
    Promise.all([api.get("/api/vehicles/my"), api.get("/api/vehicle-types")])
      .then(([v, t]) => {
        setVehicles(v);
        setVehicleTypes(t);
        setForm((f) => ({ ...f, vehicleTypeId: f.vehicleTypeId || t[0]?.id || "" }));
        if (v.length === 0) setShowForm(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const v = await api.post("/api/vehicles", {
        vehicleTypeId: Number(form.vehicleTypeId),
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        licensePlate: form.licensePlate.trim().toUpperCase() || null,
      });
      setForm((f) => ({ ...f, ...EMPTY_FORM }));
      setShowForm(false);
      setSaved(`${v.model || humanize(v.vehicleType.name)} added.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const thisYear = new Date().getFullYear();

  return html`
    <${Layout}
      title="My vehicles"
      subtitle=${vehicles.length ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}` : undefined}
      actions=${!showForm && vehicles.length > 0 && html`<${Button} size="sm" variant="secondary" icon="plus" onClick=${() => setShowForm(true)}>Add<//>`}
    >
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <${Alert} tone="success" onClose=${() => setSaved(null)}>${saved}<//>
      ${loading && html`<${SkeletonList} count=${2} />`}

      ${showForm &&
      html`
        <form className="card fade-in" onSubmit=${submit}>
          <div className="card-title" style=${{ marginBottom: 14 }}>Add a vehicle</div>
          <div className="field">
            <span className="label">Type</span>
            <div className="fault-grid" role="radiogroup">
              ${vehicleTypes.map(
                (t) => html`
                  <button
                    type="button"
                    role="radio"
                    aria-checked=${String(form.vehicleTypeId) === String(t.id)}
                    key=${t.id}
                    className=${`tile ${String(form.vehicleTypeId) === String(t.id) ? "active" : ""}`}
                    onClick=${() => setForm({ ...form, vehicleTypeId: t.id })}
                  >
                    <span className="tile-emoji">${VEHICLE_EMOJI[t.name] || "🚗"}</span>
                    ${humanize(t.name)}
                  </button>
                `
              )}
            </div>
          </div>
          <div className="field">
            <label htmlFor="v-model">Model</label>
            <input id="v-model" value=${form.model} onChange=${(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Honda City" />
          </div>
          <div className="form-grid-2" style=${{ marginBottom: 16 }}>
            <div className="field">
              <label htmlFor="v-year">Year</label>
              <input id="v-year" type="number" min="1950" max=${thisYear + 1} value=${form.year} onChange=${(e) => setForm({ ...form, year: e.target.value })} placeholder=${String(thisYear - 3)} />
            </div>
            <div className="field">
              <label htmlFor="v-plate">Number plate</label>
              <input id="v-plate" style=${{ textTransform: "uppercase" }} value=${form.licensePlate} onChange=${(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="KA01AB1234" />
            </div>
          </div>
          <div className="btn-row">
            ${vehicles.length > 0 && html`<${Button} variant="outline" type="button" onClick=${() => setShowForm(false)}>Cancel<//>`}
            <${Button} type="submit" loading=${saving}>Save vehicle<//>
          </div>
        </form>
      `}

      ${!loading && vehicles.length === 0 && !showForm && html`<${EmptyState} icon="car" title="No vehicles yet" subtitle="Add one to start booking." />`}

      ${vehicles.map(
        (v) => html`
          <div key=${v.id} className="card">
            <div className="person">
              <div className="person-avatar" style=${{ fontSize: 22, borderRadius: 12 }}>${VEHICLE_EMOJI[v.vehicleType.name] || "🚗"}</div>
              <div style=${{ minWidth: 0 }}>
                <p className="card-title">${v.model || humanize(v.vehicleType.name)}</p>
                <p className="card-sub">${humanize(v.vehicleType.name)}${v.year ? ` · ${v.year}` : ""}</p>
              </div>
              ${v.licensePlate && html`<span className="badge badge-neutral" style=${{ marginLeft: "auto", letterSpacing: ".05em" }}>${v.licensePlate}</span>`}
            </div>
          </div>
        `
      )}
    <//>
  `;
}
