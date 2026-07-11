import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate, Link } from "../../router.js";
import { useAuth } from "../../auth.js";

const FAULT_EMOJI = {
  BATTERY_ISSUE: "🔋",
  FLAT_TYRE: "🛞",
  BRAKE_PROBLEM: "🛑",
  ENGINE_OVERHEATING: "🌡️",
  ELECTRICAL_FAULT: "⚡",
};

export default function Home() {
  const { session } = useAuth();
  const [faultTypes, setFaultTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);

  const [describeText, setDescribeText] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [locationMode, setLocationMode] = useState("gps");
  const [addressQuery, setAddressQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState(null);

  const [form, setForm] = useState({
    faultTypeId: "",
    vehicleId: "",
    lat: "",
    lng: "",
    radiusKm: 50,
  });

  useEffect(() => {
    Promise.all([api.get("/api/fault-types"), api.get("/api/vehicles/my")])
      .then(([faults, myVehicles]) => {
        setFaultTypes(faults);
        setVehicles(myVehicles);
        setForm((f) => ({
          ...f,
          faultTypeId: faults[0]?.id ?? "",
          vehicleId: myVehicles[0]?.id ?? "",
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const locate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const findByAddress = async () => {
    if (!addressQuery.trim()) {
      setGeocodeError("Enter an address first.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    setResolvedAddress(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressQuery.trim())}`
      );
      const results = await res.json();
      if (!results.length) {
        setGeocodeError("Couldn't find that address. Try being more specific.");
        return;
      }
      const { lat, lon, display_name } = results[0];
      setForm((f) => ({ ...f, lat: Number(lat).toFixed(5), lng: Number(lon).toFixed(5) }));
      setResolvedAddress(display_name);
    } catch (err) {
      setGeocodeError("Couldn't look up that address right now.");
    } finally {
      setGeocoding(false);
    }
  };

  const suggestFault = async () => {
    if (!describeText.trim()) {
      setAiError("Describe the issue first.");
      return;
    }
    setSuggesting(true);
    setAiError(null);
    setSuggestion(null);
    try {
      const result = await api.post("/api/ai/classify-fault", { description: describeText.trim() });
      setForm((f) => ({ ...f, faultTypeId: result.faultTypeId }));
      setSuggestion(result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const findGarages = (e) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));
    const params = new URLSearchParams({
      lat: form.lat,
      lng: form.lng,
      radiusKm: form.radiusKm,
      faultTypeId: form.faultTypeId,
      vehicleTypeId: vehicle.vehicleType.id,
      vehicleId: form.vehicleId,
    });
    navigate(`/customer/results?${params.toString()}`);
  };

  if (loading) return html`<${Layout} title="RoadFix"><div style=${{ marginTop: 60 }}><${Spinner} dark /></div><//>`;

  if (vehicles.length === 0) {
    return html`
      <${Layout} title="RoadFix" subtitle="Find help for your vehicle, fast">
        <${EmptyState}
          emoji="🚗"
          title="Add a vehicle first"
          subtitle="We need to know what you're driving before we can quote a price."
        />
        <${Link} to="/customer/vehicles"><${Button}>Add a vehicle<//><//>
      <//>
    `;
  }

  return html`
    <${Layout} title="RoadFix">
      <div className="home-hero">
        <h2>Hey ${session?.username || "there"} 👋</h2>
        <p>What's wrong with your ride today?</p>
      </div>
      ${error && html`<div className="error-banner">${error}</div>`}
      <form onSubmit=${findGarages}>
        <div className="card">
          <div className="field">
            <label>Describe your issue (optional)</label>
            <textarea
              rows="2"
              placeholder="e.g. my car makes a grinding noise when I brake"
              value=${describeText}
              onChange=${(e) => setDescribeText(e.target.value)}
            ></textarea>
            <div style=${{ marginTop: 8 }}>
              <${Button} type="button" variant="outline" size="sm" loading=${suggesting} onClick=${suggestFault}>
                ✨ Suggest fault type
              <//>
            </div>
            ${aiError && html`<p className="muted" style=${{ color: "var(--red)", marginTop: 6 }}>${aiError}</p>`}
            ${suggestion &&
            html`
              <p className="muted" style=${{ marginTop: 6 }}>
                Looks like <strong>${suggestion.faultTypeName.replaceAll("_", " ")}</strong> (${suggestion.urgency} urgency) — ${suggestion.explanation}
              </p>
            `}
          </div>
          <div className="field">
            <label>What's the fault?</label>
            <div className="fault-grid">
              ${faultTypes.map(
                (f) => html`
                  <div
                    key=${f.id}
                    className=${`fault-chip ${String(form.faultTypeId) === String(f.id) ? "active" : ""}`}
                    onClick=${() => setForm({ ...form, faultTypeId: f.id })}
                  >
                    <span className="fault-emoji">${FAULT_EMOJI[f.name] || "🔧"}</span>
                    <span>${f.name.replaceAll("_", " ")}</span>
                  </div>
                `
              )}
            </div>
          </div>
          <div className="field">
            <label>Which vehicle?</label>
            <select value=${form.vehicleId} onChange=${(e) => setForm({ ...form, vehicleId: e.target.value })}>
              ${vehicles.map(
                (v) => html`<option key=${v.id} value=${v.id}>${v.model || v.vehicleType.name} · ${v.licensePlate || "no plate"}<//>`
              )}
            </select>
          </div>
          <div className="field">
            <label>📍 Your location</label>
            <div className="tabs" style=${{ marginBottom: 10 }}>
              <div className=${`tab ${locationMode === "gps" ? "active" : ""}`} onClick=${() => setLocationMode("gps")}>
                📍 My location
              </div>
              <div className=${`tab ${locationMode === "address" ? "active" : ""}`} onClick=${() => setLocationMode("address")}>
                🏠 Enter address
              </div>
            </div>
            ${locationMode === "gps"
              ? html`
                  <div className="pill-input">
                    <input placeholder="Latitude" required value=${form.lat} onChange=${(e) => setForm({ ...form, lat: e.target.value })} />
                    <input placeholder="Longitude" required value=${form.lng} onChange=${(e) => setForm({ ...form, lng: e.target.value })} />
                  </div>
                  <div style=${{ marginTop: 8 }}>
                    <${Button} type="button" variant="outline" size="sm" loading=${locating} onClick=${locate}>
                      📍 Use current location
                    <//>
                  </div>
                `
              : html`
                  <div className="pill-input">
                    <input
                      placeholder="e.g. 12 MG Road, New Delhi"
                      value=${addressQuery}
                      onChange=${(e) => setAddressQuery(e.target.value)}
                    />
                    <${Button} type="button" variant="outline" size="sm" loading=${geocoding} onClick=${findByAddress}>
                      Find
                    <//>
                  </div>
                  ${geocodeError && html`<p className="muted" style=${{ color: "var(--red)", marginTop: 6 }}>${geocodeError}</p>`}
                  ${resolvedAddress &&
                  html`<p className="muted" style=${{ marginTop: 6 }}>📍 ${resolvedAddress}</p>`}
                `}
          </div>
          <div className="field">
            <label>Search radius: ${form.radiusKm} km</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value=${form.radiusKm}
              onChange=${(e) => setForm({ ...form, radiusKm: e.target.value })}
            />
          </div>
        </div>
        <${Button} type="submit">🔍 Find nearby garages<//>
      </form>
    <//>
  `;
}
