import { useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";

export default function CreateGarage() {
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", dailyCapacity: 5 });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const locate = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(5), longitude: pos.coords.longitude.toFixed(5) }));
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const garage = await api.post("/api/garages", {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        dailyCapacity: Number(form.dailyCapacity),
      });
      navigate(`/owner/garage?id=${garage.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return html`
    <${Layout} title="Add garage" back="/owner/garages">
      ${error && html`<div className="error-banner">${error}</div>`}
      <div className="card">
        <form onSubmit=${submit}>
          <div className="field">
            <label>Garage name</label>
            <input required value=${form.name} onChange=${set("name")} />
          </div>
          <div className="field">
            <label>Address</label>
            <input required value=${form.address} onChange=${set("address")} />
          </div>
          <div className="field">
            <label>Location</label>
            <div className="pill-input">
              <input required placeholder="Latitude" value=${form.latitude} onChange=${set("latitude")} />
              <input required placeholder="Longitude" value=${form.longitude} onChange=${set("longitude")} />
            </div>
            <div style=${{ marginTop: 8 }}>
              <${Button} type="button" variant="outline" size="sm" onClick=${locate}>📍 Use current location<//>
            </div>
          </div>
          <div className="field">
            <label>Daily booking capacity</label>
            <input required type="number" min="1" value=${form.dailyCapacity} onChange=${set("dailyCapacity")} />
          </div>
          <${Button} type="submit" loading=${saving}>Create garage<//>
        </form>
      </div>
    <//>
  `;
}
