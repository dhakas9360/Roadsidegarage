import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicleTypeId: "", model: "", year: "", licensePlate: "" });

  const load = () =>
    Promise.all([api.get("/api/vehicles/my"), api.get("/api/vehicle-types")])
      .then(([v, t]) => {
        setVehicles(v);
        setVehicleTypes(t);
        setForm((f) => ({ ...f, vehicleTypeId: f.vehicleTypeId || t[0]?.id || "" }));
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
      await api.post("/api/vehicles", { ...form, year: form.year ? Number(form.year) : null });
      setForm({ vehicleTypeId: vehicleTypes[0]?.id || "", model: "", year: "", licensePlate: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return html`<${Layout} title="My vehicles"><${Spinner} dark /><//>`;

  return html`
    <${Layout} title="My vehicles">
      ${error && html`<div className="error-banner">${error}</div>`}
      ${vehicles.length === 0 && !showForm && html`<${EmptyState} emoji="🚗" title="No vehicles yet" subtitle="Add one to start booking." />`}
      ${vehicles.map(
        (v) => html`
          <div key=${v.id} className="card card-row">
            <div>
              <p className="card-title">${v.model || v.vehicleType.name}</p>
              <p className="card-sub">${v.vehicleType.name} · ${v.year || "?"} · ${v.licensePlate || "no plate"}</p>
            </div>
          </div>
        `
      )}
      ${showForm
        ? html`
            <div className="card">
              <div className="section-title">Add vehicle</div>
              <form onSubmit=${submit}>
                <div className="field">
                  <label>Vehicle type</label>
                  <select value=${form.vehicleTypeId} onChange=${(e) => setForm({ ...form, vehicleTypeId: e.target.value })}>
                    ${vehicleTypes.map((t) => html`<option key=${t.id} value=${t.id}>${t.name}<//>`)}
                  </select>
                </div>
                <div className="field">
                  <label>Model</label>
                  <input value=${form.model} onChange=${(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Honda City" />
                </div>
                <div className="field">
                  <label>Year</label>
                  <input type="number" value=${form.year} onChange=${(e) => setForm({ ...form, year: e.target.value })} placeholder="2021" />
                </div>
                <div className="field">
                  <label>License plate</label>
                  <input value=${form.licensePlate} onChange=${(e) => setForm({ ...form, licensePlate: e.target.value })} />
                </div>
                <div className="btn-block-row">
                  <${Button} variant="outline" type="button" onClick=${() => setShowForm(false)}>Cancel<//>
                  <${Button} type="submit" loading=${saving}>Save<//>
                </div>
              </form>
            </div>
          `
        : html`<${Button} onClick=${() => setShowForm(true)}>+ Add a vehicle<//>`}
    <//>
  `;
}
