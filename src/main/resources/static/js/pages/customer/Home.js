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

const VEHICLE_EMOJI = {
  BIKE: "🏍️",
  HATCHBACK: "🚗",
  SEDAN: "🚘",
  SUV: "🚙",
  TRUCK: "🚚",
};

const ACTIVE_STATUSES = new Set(["PENDING", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS"]);
const FINISHED_STATUSES = new Set(["COMPLETED", "RATED"]);
const LAST_LOCATION_KEY = "roadfix.lastLocation";

function saveLastLocation(lat, lng) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ lat, lng }));
  } catch {}
}

function getLastLocation() {
  try {
    return JSON.parse(localStorage.getItem(LAST_LOCATION_KEY));
  } catch {
    return null;
  }
}

export default function Home() {
  const { session } = useAuth();
  const [faultTypes, setFaultTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const [describeText, setDescribeText] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [locationMode, setLocationMode] = useState("gps");
  const [addressQuery, setAddressQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState(null);

  const [nearbyCount, setNearbyCount] = useState(null);
  const [nearbyCountLoading, setNearbyCountLoading] = useState(false);

  const [form, setForm] = useState({
    faultTypeId: "",
    vehicleId: "",
    lat: "",
    lng: "",
    radiusKm: 50,
  });

  useEffect(() => {
    Promise.all([api.get("/api/fault-types"), api.get("/api/vehicles/my"), api.get("/api/bookings/my")])
      .then(([faults, myVehicles, myBookings]) => {
        setFaultTypes(faults);
        setVehicles(myVehicles);
        setBookings(myBookings.sort((a, b) => b.id - a.id));
        const lastLocation = getLastLocation();
        setForm((f) => ({
          ...f,
          faultTypeId: faults[0]?.id ?? "",
          vehicleId: myVehicles[0]?.id ?? "",
          lat: lastLocation?.lat ?? f.lat,
          lng: lastLocation?.lng ?? f.lng,
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.lat || !form.lng) {
      setNearbyCount(null);
      return;
    }
    let cancelled = false;
    setNearbyCountLoading(true);
    const timer = setTimeout(() => {
      api
        .get(`/api/garages/nearby?lat=${form.lat}&lng=${form.lng}&radiusKm=${form.radiusKm}`)
        .then((list) => {
          if (!cancelled) setNearbyCount(list.length);
        })
        .catch(() => {
          if (!cancelled) setNearbyCount(null);
        })
        .finally(() => {
          if (!cancelled) setNearbyCountLoading(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.lat, form.lng, form.radiusKm]);

  const locate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setForm((f) => ({ ...f, lat, lng }));
        saveLastLocation(lat, lng);
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
      const fixedLat = Number(lat).toFixed(5);
      const fixedLng = Number(lon).toFixed(5);
      setForm((f) => ({ ...f, lat: fixedLat, lng: fixedLng }));
      saveLastLocation(fixedLat, fixedLng);
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

  const rebook = (booking) => {
    const vehicleStillExists = vehicles.some((v) => v.id === booking.vehicle.id);
    const vehicleId = vehicleStillExists ? booking.vehicle.id : vehicles[0]?.id;
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    const params = new URLSearchParams({
      lat: booking.serviceLatitude ?? form.lat,
      lng: booking.serviceLongitude ?? form.lng,
      radiusKm: form.radiusKm,
      faultTypeId: booking.faultType.id,
      vehicleTypeId: vehicle.vehicleType.id,
      vehicleId: vehicle.id,
    });
    navigate(`/customer/results?${params.toString()}`);
  };

  const sos = () => {
    setSosLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        saveLastLocation(lat, lng);
        const vehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId)) || vehicles[0];
        const params = new URLSearchParams({
          lat,
          lng,
          radiusKm: 100,
          faultTypeId: form.faultTypeId || faultTypes[0]?.id,
          vehicleTypeId: vehicle.vehicleType.id,
          vehicleId: vehicle.id,
        });
        setSosLoading(false);
        navigate(`/customer/results?${params.toString()}`);
      },
      () => {
        setSosLoading(false);
        setError("Couldn't get your location. Please allow location access and try again.");
      },
      { timeout: 8000 }
    );
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

  const activeBooking = bookings.find((b) => ACTIVE_STATUSES.has(b.status));
  const lastFinishedBooking = bookings.find((b) => FINISHED_STATUSES.has(b.status));
  const selectedFault = faultTypes.find((f) => String(f.id) === String(form.faultTypeId));
  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));

  return html`
    <${Layout} title="RoadFix">
      <div className="home-hero">
        <h2>Hey ${session?.username || "there"} 👋</h2>
        <p>What's wrong with your ride today?</p>
      </div>

      ${activeBooking &&
      html`
        <div className="info-banner" onClick=${() => navigate("/customer/bookings")}>
          <span className="info-banner-icon">🔧</span>
          <div>
            <p className="info-banner-title">You have an active booking at ${activeBooking.garage.name}</p>
            <p className="info-banner-sub">${activeBooking.status.replace("_", " ")} · tap to view</p>
          </div>
          <span className="info-banner-arrow">→</span>
        </div>
      `}

      ${lastFinishedBooking &&
      html`
        <div className="info-banner" onClick=${() => rebook(lastFinishedBooking)}>
          <span className="info-banner-icon">🔁</span>
          <div>
            <p className="info-banner-title">Book again with ${lastFinishedBooking.garage.name}</p>
            <p className="info-banner-sub">${lastFinishedBooking.faultType.name.replaceAll("_", " ")} · same spot as last time</p>
          </div>
          <span className="info-banner-arrow">→</span>
        </div>
      `}

      <button type="button" className="sos-btn" disabled=${sosLoading} onClick=${sos}>
        ${sosLoading ? "Locating you…" : "🚨 Stuck right now? Get instant help"}
      </button>

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
            ${selectedFault && html`<p className="muted" style=${{ marginTop: 8 }}>${selectedFault.description}</p>`}
          </div>
          <div className="field">
            <label>Which vehicle?</label>
            <div className="vehicle-grid">
              ${vehicles.map(
                (v) => html`
                  <div
                    key=${v.id}
                    className=${`vehicle-chip ${String(form.vehicleId) === String(v.id) ? "active" : ""}`}
                    onClick=${() => setForm({ ...form, vehicleId: v.id })}
                  >
                    <span className="vehicle-emoji">${VEHICLE_EMOJI[v.vehicleType.name] || "🚗"}</span>
                    <span>${v.model || v.vehicleType.name} · ${v.licensePlate || "no plate"}</span>
                  </div>
                `
              )}
            </div>
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
            ${form.lat &&
            form.lng &&
            html`
              <div className="stat-badge">
                🏠 ${nearbyCountLoading ? "Checking nearby garages…" : `${nearbyCount ?? 0} garage${nearbyCount === 1 ? "" : "s"} within ${form.radiusKm} km`}
              </div>
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
