import { useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";

export default function CreateGarage() {
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", dailyCapacity: 5 });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const hasLocation = form.latitude !== "" && form.longitude !== "";

  const locate = () => {
    if (!navigator.geolocation) return setError("Location isn't available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(5), longitude: pos.coords.longitude.toFixed(5) }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Use 'From address' or enter coordinates manually.");
      },
      { timeout: 8000 }
    );
  };

  // look up coordinates from the address the owner already typed
  const fromAddress = async () => {
    if (!form.address.trim()) return setError("Type the garage address first.");
    setGeocoding(true);
    setError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(form.address.trim())}`);
      const results = await res.json();
      if (!results.length) throw new Error();
      setForm((f) => ({ ...f, latitude: Number(results[0].lat).toFixed(5), longitude: Number(results[0].lon).toFixed(5) }));
    } catch {
      setError("Couldn't find that address on the map. Try adding the city, or use your current location.");
    } finally {
      setGeocoding(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!hasLocation) return setError("Set the garage location so nearby customers can find you.");
    setSaving(true);
    setError(null);
    try {
      const garage = await api.post("/api/garages", {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        dailyCapacity: Number(form.dailyCapacity),
      });
      // a new garage is invisible to customers until it has prices, so start there
      navigate(`/owner/garage?id=${garage.id}&tab=prices`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return html`
    <${Layout} title="Add a garage" back="/owner/garages">
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <form className="card" onSubmit=${submit}>
        <div className="field">
          <label htmlFor="g-name">Garage name</label>
          <input id="g-name" required value=${form.name} onChange=${set("name")} placeholder="e.g. MG Road Auto Care" />
        </div>
        <div className="field">
          <label htmlFor="g-address">Address</label>
          <input id="g-address" required value=${form.address} onChange=${set("address")} placeholder="Street, area, city" />
        </div>
        <div className="field">
          <span className="label">Map location</span>
          <div className="location-box">
            <span className="loc-icon"><${Icon} name="pin" size=${18} /></span>
            <div className="loc-text">
              <div className="loc-title">${hasLocation ? "Location set" : "Not set yet"}</div>
              <div className="loc-sub">${hasLocation ? `${form.latitude}, ${form.longitude}` : "Used to show your garage to nearby customers"}</div>
            </div>
          </div>
          <div className="btn-row" style=${{ marginTop: 10 }}>
            <${Button} type="button" variant="outline" size="sm" icon="crosshair" loading=${locating} onClick=${locate}>Current location<//>
            <${Button} type="button" variant="outline" size="sm" icon="search" loading=${geocoding} onClick=${fromAddress}>From address<//>
          </div>
          <details className="manual">
            <summary>Enter coordinates manually</summary>
            <div className="pill-input">
              <input className="input" aria-label="Latitude" placeholder="Latitude" inputMode="decimal" value=${form.latitude} onChange=${set("latitude")} />
              <input className="input" aria-label="Longitude" placeholder="Longitude" inputMode="decimal" value=${form.longitude} onChange=${set("longitude")} />
            </div>
          </details>
        </div>
        <div className="field">
          <label htmlFor="g-cap">Bookings you can take per day</label>
          <input id="g-cap" required type="number" min="1" max="500" value=${form.dailyCapacity} onChange=${set("dailyCapacity")} />
          <p className="hint">Once a day is full, customers are asked to pick another date.</p>
        </div>
        <${Button} type="submit" size="lg" loading=${saving}>Create garage<//>
      </form>
    <//>
  `;
}
