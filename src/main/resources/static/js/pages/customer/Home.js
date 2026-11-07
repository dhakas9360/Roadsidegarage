import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import StatusBadge from "../../components/StatusBadge.js";
import { Alert } from "../../components/Layout.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";
import { useAuth } from "../../auth.js";
import { FAULT_EMOJI, VEHICLE_EMOJI, ACTIVE_STATUSES, FINISHED_STATUSES, humanize } from "../../lib/format.js";

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

  // Count garages two ways: all nearby, and the ones that can actually take THIS job (they've priced
  // the selected fault for the selected vehicle type). Only the second kind shows up in search results,
  // so showing just the first number made garages look bookable when they weren't.
  const selectedVehicleTypeId = vehicles.find((v) => String(v.id) === String(form.vehicleId))?.vehicleType.id;
  useEffect(() => {
    if (!form.lat || !form.lng) {
      setNearbyCount(null);
      return;
    }
    let cancelled = false;
    setNearbyCountLoading(true);
    const timer = setTimeout(() => {
      const base = `/api/garages/nearby?lat=${form.lat}&lng=${form.lng}&radiusKm=${form.radiusKm}`;
      const canFilter = form.faultTypeId && selectedVehicleTypeId;
      Promise.all([
        api.get(base),
        canFilter ? api.get(`${base}&faultTypeId=${form.faultTypeId}&vehicleTypeId=${selectedVehicleTypeId}`) : null,
      ])
        .then(([all, bookable]) => {
          if (!cancelled) setNearbyCount({ total: all.length, bookable: bookable ? bookable.length : all.length });
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
  }, [form.lat, form.lng, form.radiusKm, form.faultTypeId, selectedVehicleTypeId]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser — search by address instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setForm((f) => ({ ...f, lat, lng }));
        saveLastLocation(lat, lng);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Allow location access, or search by address instead.");
      },
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
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser — search by address instead.");
      return;
    }
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

  if (loading) return html`<${Layout} title="RoadFix"><${SkeletonList} count=${3} /><//>`;

  if (vehicles.length === 0) {
    return html`
      <${Layout} title="RoadFix">
        <div className="home-hero">
          <h2>Hey ${session?.username || "there"} 👋</h2>
          <p>Let's get your vehicle on file first.</p>
        </div>
        <div className="card">
          <${EmptyState}
            icon="car"
            title="Add your first vehicle"
            subtitle="We need to know what you drive so garages can quote you an exact price."
          >
            <${Button} block=${false} icon="plus" onClick=${() => navigate("/customer/vehicles")}>Add a vehicle<//>
          <//>
        </div>
      <//>
    `;
  }

  const activeBooking = bookings.find((b) => ACTIVE_STATUSES.has(b.status));
  const lastFinishedBooking = !activeBooking && bookings.find((b) => FINISHED_STATUSES.has(b.status));
  const selectedFault = faultTypes.find((f) => String(f.id) === String(form.faultTypeId));
  const hasLocation = Boolean(form.lat && form.lng);
  const radiusPct = ((form.radiusKm - 5) / 95) * 100;

  return html`
    <${Layout} title="RoadFix">
      <div className="home-hero">
        <h2>Hey ${session?.username || "there"} 👋</h2>
        <p>What's wrong with your ride today?</p>
      </div>

      ${activeBooking &&
      html`
        <div className="info-banner" role="button" tabIndex="0" onClick=${() => navigate("/customer/bookings")}>
          <span className="info-banner-icon blue"><${Icon} name="wrench" size=${20} /></span>
          <div style=${{ minWidth: 0 }}>
            <p className="info-banner-title">Active booking at ${activeBooking.garage.name}</p>
            <p className="info-banner-sub">${humanize(activeBooking.faultType.name)} · track progress</p>
          </div>
          <${StatusBadge} status=${activeBooking.status} />
        </div>
      `}

      ${lastFinishedBooking &&
      html`
        <div className="info-banner" role="button" tabIndex="0" onClick=${() => rebook(lastFinishedBooking)}>
          <span className="info-banner-icon"><${Icon} name="refresh" size=${20} /></span>
          <div style=${{ minWidth: 0 }}>
            <p className="info-banner-title">Book again with ${lastFinishedBooking.garage.name}</p>
            <p className="info-banner-sub">${humanize(lastFinishedBooking.faultType.name)} · same spot as last time</p>
          </div>
          <span className="info-banner-arrow"><${Icon} name="chevron" size=${18} /></span>
        </div>
      `}

      <button type="button" className="sos-btn" disabled=${sosLoading} onClick=${sos}>
        <span className="sos-icon"><${Icon} name="siren" size=${22} /></span>
        <span>
          <span className="sos-title">${sosLoading ? "Locating you…" : "Stuck right now?"}</span>
          <span className="sos-sub">One tap — we'll find the nearest garage using your GPS</span>
        </span>
      </button>

      <${Alert} onClose=${() => setError(null)}>${error}<//>

      <form onSubmit=${findGarages}>
        <div className="card">
          <div className="field">
            <span className="label">What's the problem?</span>
            <div className="fault-grid" role="radiogroup">
              ${faultTypes.map(
                (f) => html`
                  <button
                    type="button"
                    role="radio"
                    aria-checked=${String(form.faultTypeId) === String(f.id)}
                    key=${f.id}
                    className=${`fault-chip ${String(form.faultTypeId) === String(f.id) ? "active" : ""}`}
                    onClick=${() => setForm({ ...form, faultTypeId: f.id })}
                  >
                    <span className="fault-emoji">${FAULT_EMOJI[f.name] || "🔧"}</span>
                    <span>${humanize(f.name)}</span>
                  </button>
                `
              )}
            </div>
            ${selectedFault && html`<p className="hint">${selectedFault.description}</p>`}
          </div>

          <div className="field">
            <label htmlFor="describe">Not sure? Describe it <span className="muted">(optional)</span></label>
            <div className="input-row">
              <input
                id="describe"
                className="input"
                placeholder="e.g. grinding noise when I brake"
                value=${describeText}
                onChange=${(e) => setDescribeText(e.target.value)}
              />
              <${Button} type="button" variant="secondary" size="sm" icon="sparkles" loading=${suggesting} onClick=${suggestFault}>Suggest<//>
            </div>
            ${aiError && html`<p className="hint" style=${{ color: "var(--red)" }}>${aiError}</p>`}
            ${suggestion &&
            html`
              <div className="alert alert-info" style=${{ marginTop: 10, marginBottom: 0 }}>
                <span className="alert-text">
                  Looks like <strong>${humanize(suggestion.faultTypeName)}</strong> (${suggestion.urgency} urgency) — ${suggestion.explanation}
                </span>
              </div>
            `}
          </div>
        </div>

        <div className="card">
          <div className="field">
            <span className="label">Which vehicle?</span>
            <div className="vehicle-grid" role="radiogroup">
              ${vehicles.map(
                (v) => html`
                  <button
                    type="button"
                    role="radio"
                    aria-checked=${String(form.vehicleId) === String(v.id)}
                    key=${v.id}
                    className=${`vehicle-chip ${String(form.vehicleId) === String(v.id) ? "active" : ""}`}
                    onClick=${() => setForm({ ...form, vehicleId: v.id })}
                  >
                    <span className="vehicle-emoji">${VEHICLE_EMOJI[v.vehicleType.name] || "🚗"}</span>
                    <span>
                      <span className="vehicle-chip-name">${v.model || humanize(v.vehicleType.name)}</span>
                      <span className="vehicle-chip-plate">${v.licensePlate || humanize(v.vehicleType.name)}</span>
                    </span>
                  </button>
                `
              )}
              <button type="button" className="vehicle-chip vehicle-chip-add" onClick=${() => navigate("/customer/vehicles")}>
                <${Icon} name="plus" size=${16} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="field">
            <span className="label">Where are you?</span>
            <div className="segmented" role="tablist">
              <button type="button" role="tab" aria-selected=${locationMode === "gps"} className=${locationMode === "gps" ? "active" : ""} onClick=${() => setLocationMode("gps")}>
                <${Icon} name="crosshair" size=${15} /> Current location
              </button>
              <button type="button" role="tab" aria-selected=${locationMode === "address"} className=${locationMode === "address" ? "active" : ""} onClick=${() => setLocationMode("address")}>
                <${Icon} name="pin" size=${15} /> Search address
              </button>
            </div>

            ${locationMode === "gps"
              ? html`
                  <div className="location-box">
                    <span className="loc-icon"><${Icon} name="pin" size=${18} /></span>
                    <div className="loc-text">
                      <div className="loc-title">${hasLocation ? "Location set" : "No location yet"}</div>
                      <div className="loc-sub">${hasLocation ? `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}` : "Allow location access to find garages near you"}</div>
                    </div>
                    <${Button} type="button" variant=${hasLocation ? "outline" : "primary"} size="sm" icon="crosshair" loading=${locating} onClick=${locate}>
                      ${hasLocation ? "Update" : "Locate me"}
                    <//>
                  </div>
                  <details className="manual">
                    <summary>Enter coordinates manually</summary>
                    <div className="pill-input">
                      <input className="input" aria-label="Latitude" placeholder="Latitude" inputMode="decimal" value=${form.lat} onChange=${(e) => setForm({ ...form, lat: e.target.value })} />
                      <input className="input" aria-label="Longitude" placeholder="Longitude" inputMode="decimal" value=${form.lng} onChange=${(e) => setForm({ ...form, lng: e.target.value })} />
                    </div>
                  </details>
                `
              : html`
                  <div className="input-row">
                    <input
                      className="input"
                      aria-label="Address"
                      placeholder="e.g. 12 MG Road, Bengaluru"
                      value=${addressQuery}
                      onChange=${(e) => setAddressQuery(e.target.value)}
                      onKeyDown=${(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          findByAddress();
                        }
                      }}
                    />
                    <${Button} type="button" variant="outline" size="sm" icon="search" loading=${geocoding} onClick=${findByAddress}>Find<//>
                  </div>
                  ${geocodeError && html`<p className="hint" style=${{ color: "var(--red)" }}>${geocodeError}</p>`}
                  ${resolvedAddress && html`<p className="hint"><${Icon} name="pin" size=${12} className="inline-icon" /> ${resolvedAddress}</p>`}
                `}
            ${hasLocation && html`<${NearbyBadge} loading=${nearbyCountLoading} count=${nearbyCount} radiusKm=${form.radiusKm} fault=${selectedFault} vehicle=${vehicles.find((v) => String(v.id) === String(form.vehicleId))} />`}
          </div>

          <div className="field">
            <div className="card-row" style=${{ marginBottom: 10 }}>
              <label htmlFor="radius" className="label" style=${{ margin: 0 }}>Search radius</label>
              <span className="badge badge-neutral">${form.radiusKm} km</span>
            </div>
            <input
              id="radius"
              type="range"
              min="5"
              max="100"
              step="5"
              value=${form.radiusKm}
              style=${{ backgroundSize: `${radiusPct}% 100%` }}
              onChange=${(e) => setForm({ ...form, radiusKm: Number(e.target.value) })}
            />
            <div className="range-labels"><span>5 km</span><span>100 km</span></div>
          </div>
        </div>

        <div className="sticky-cta">
          <${Button} type="submit" size="lg" icon="search" disabled=${!hasLocation || !form.faultTypeId}>
            ${hasLocation ? "Find nearby garages" : "Set your location to continue"}
          <//>
        </div>
      </form>
    <//>
  `;
}

/** "N garages can fix this within X km", with an explanation when garages exist but none price this job. */
function NearbyBadge({ loading, count, radiusKm, fault, vehicle }) {
  if (loading || !count) {
    return html`<div className="stat-badge"><${Icon} name="garage" size=${14} />${loading ? "Checking nearby garages…" : "Couldn't check nearby garages"}</div>`;
  }
  const plural = (n) => `${n} garage${n === 1 ? "" : "s"}`;
  if (count.bookable > 0) {
    return html`<div className="stat-badge"><${Icon} name="garage" size=${14} />${plural(count.bookable)} can fix this within ${radiusKm} km</div>`;
  }
  const job = `${fault ? humanize(fault.name).toLowerCase() : "this fault"} on a ${vehicle ? humanize(vehicle.vehicleType.name) : "vehicle"}`;
  return html`
    <div className="alert alert-warning" style=${{ marginTop: 10, marginBottom: 0 }}>
      <span className="alert-text">
        ${count.total > 0
          ? `${plural(count.total)} within ${radiusKm} km, but none ${count.total === 1 ? "has" : "have"} set a price for ${job} yet. Try another fault, or a wider radius.`
          : `No garages within ${radiusKm} km. Try a wider radius.`}
      </span>
    </div>
  `;
}
