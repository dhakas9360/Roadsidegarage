import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import Spinner, { EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

export default function PricesTab({ garageId }) {
  const [prices, setPrices] = useState([]);
  const [faultTypes, setFaultTypes] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ faultTypeId: "", vehicleTypeId: "", price: "" });

  const load = () =>
    Promise.all([
      api.get(`/api/garages/${garageId}/prices`),
      api.get("/api/fault-types"),
      api.get("/api/vehicle-types"),
    ])
      .then(([p, f, v]) => {
        setPrices(p);
        setFaultTypes(f);
        setVehicleTypes(v);
        setForm((old) => ({ faultTypeId: old.faultTypeId || f[0]?.id || "", vehicleTypeId: old.vehicleTypeId || v[0]?.id || "", price: "" }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [garageId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/garages/${garageId}/prices`, {
        faultTypeId: Number(form.faultTypeId),
        vehicleTypeId: Number(form.vehicleTypeId),
        price: Number(form.price),
      });
      setForm({ ...form, price: "" });
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
    <div className="card">
      <div className="section-title">Set a price</div>
      <form onSubmit=${submit}>
        <div className="field">
          <label>Fault type</label>
          <select value=${form.faultTypeId} onChange=${(e) => setForm({ ...form, faultTypeId: e.target.value })}>
            ${faultTypes.map((f) => html`<option key=${f.id} value=${f.id}>${f.name.replaceAll("_", " ")}<//>`)}
          </select>
        </div>
        <div className="field">
          <label>Vehicle type</label>
          <select value=${form.vehicleTypeId} onChange=${(e) => setForm({ ...form, vehicleTypeId: e.target.value })}>
            ${vehicleTypes.map((v) => html`<option key=${v.id} value=${v.id}>${v.name}<//>`)}
          </select>
        </div>
        <div className="field">
          <label>Price (₹)</label>
          <input required type="number" min="1" value=${form.price} onChange=${(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <${Button} type="submit" loading=${saving}>Save price<//>
      </form>
    </div>

    ${prices.length === 0
      ? html`<${EmptyState} emoji="₹" title="No prices set" subtitle="Customers can't book until you price at least one fault + vehicle combo." />`
      : html`
          <div className="price-grid">
            ${prices.map(
              (p) => html`
                <div key=${p.id} className="price-row">
                  <div>
                    <strong>${p.faultType.name.replaceAll("_", " ")}</strong>
                    <div className="muted">${p.vehicleType.name}</div>
                  </div>
                  <div style=${{ fontWeight: 800 }}>₹${p.price}</div>
                </div>
              `
            )}
          </div>
        `}
  `;
}
