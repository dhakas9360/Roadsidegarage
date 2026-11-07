import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import Button from "../../../components/Button.js";
import { Alert } from "../../../components/Layout.js";
import { SkeletonList, EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";
import { FAULT_EMOJI, VEHICLE_EMOJI, humanize, money } from "../../../lib/format.js";

export default function PricesTab({ garageId }) {
  const [prices, setPrices] = useState([]);
  const [faultTypes, setFaultTypes] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ faultTypeId: "", vehicleTypeId: "", price: "" });

  const load = () =>
    Promise.all([api.get(`/api/garages/${garageId}/prices`), api.get("/api/fault-types"), api.get("/api/vehicle-types")])
      .then(([p, f, v]) => {
        setPrices(p);
        setFaultTypes(f);
        setVehicleTypes(v);
        setForm((old) => ({ ...old, faultTypeId: old.faultTypeId || f[0]?.id || "", vehicleTypeId: old.vehicleTypeId || v[0]?.id || "" }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [garageId]);

  const existing = prices.find((p) => String(p.faultType.id) === String(form.faultTypeId) && String(p.vehicleType.id) === String(form.vehicleTypeId));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      await api.post(`/api/garages/${garageId}/prices`, {
        faultTypeId: Number(form.faultTypeId),
        vehicleTypeId: Number(form.vehicleTypeId),
        price: Number(form.price),
      });
      const f = faultTypes.find((x) => String(x.id) === String(form.faultTypeId));
      const v = vehicleTypes.find((x) => String(x.id) === String(form.vehicleTypeId));
      setSaved(`${humanize(f.name)} · ${humanize(v.name)} set to ${money(Number(form.price))}.`);
      setForm({ ...form, price: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // tap a row to load it into the form for editing
  const edit = (p) => setForm({ faultTypeId: p.faultType.id, vehicleTypeId: p.vehicleType.id, price: String(p.price) });

  if (loading) return html`<${SkeletonList} count=${2} />`;

  const grouped = faultTypes
    .map((f) => ({ fault: f, rows: prices.filter((p) => p.faultType.id === f.id).sort((a, b) => a.vehicleType.id - b.vehicleType.id) }))
    .filter((g) => g.rows.length);
  const totalCombos = faultTypes.length * vehicleTypes.length;

  return html`
    <${Alert} onClose=${() => setError(null)}>${error}<//>
    <${Alert} tone="success" onClose=${() => setSaved(null)}>${saved}<//>

    <form className="card" onSubmit=${submit}>
      <div className="card-row" style=${{ marginBottom: 14 }}>
        <div className="card-title">${existing ? "Update a price" : "Add a price"}</div>
        <span className="badge badge-neutral">${prices.length} / ${totalCombos} priced</span>
      </div>
      <div className="form-grid-2" style=${{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="p-fault">Fault</label>
          <select id="p-fault" value=${form.faultTypeId} onChange=${(e) => setForm({ ...form, faultTypeId: e.target.value })}>
            ${faultTypes.map((f) => html`<option key=${f.id} value=${f.id}>${humanize(f.name)}</option>`)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-vehicle">Vehicle</label>
          <select id="p-vehicle" value=${form.vehicleTypeId} onChange=${(e) => setForm({ ...form, vehicleTypeId: e.target.value })}>
            ${vehicleTypes.map((v) => html`<option key=${v.id} value=${v.id}>${humanize(v.name)}</option>`)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="p-price">Price (₹)</label>
        <div className="input-row">
          <input id="p-price" className="input" required type="number" min="1" step="1" inputMode="numeric" value=${form.price} onChange=${(e) => setForm({ ...form, price: e.target.value })} placeholder=${existing ? `Currently ${existing.price}` : "e.g. 499"} />
          <${Button} type="submit" size="sm" loading=${saving}>${existing ? "Update" : "Save"}<//>
        </div>
      </div>
    </form>

    ${prices.length === 0
      ? html`<div className="card"><${EmptyState} icon="tag" title="No prices yet" subtitle="Customers can only book fault + vehicle combinations you've priced." /></div>`
      : html`
          <div className="section-title">Price list <span className="muted" style=${{ fontWeight: 500 }}>· tap to edit</span></div>
          <div className="price-table">
            ${grouped.map(
              (g) => html`
                <div key=${g.fault.id}>
                  <div className="price-group-head"><span>${FAULT_EMOJI[g.fault.name] || "🔧"}</span>${humanize(g.fault.name)}</div>
                  ${g.rows.map(
                    (p) => html`
                      <div key=${p.id} className="price-row card-interactive" role="button" tabIndex="0" onClick=${() => edit(p)}>
                        <span>${VEHICLE_EMOJI[p.vehicleType.name] || "🚗"} ${humanize(p.vehicleType.name)}</span>
                        <strong>${money(p.price)}</strong>
                      </div>
                    `
                  )}
                </div>
              `
            )}
          </div>
        `}
  `;
}
