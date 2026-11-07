import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import { RatingStars } from "../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { useRoute, navigate } from "../../router.js";
import { localDate, money, humanize } from "../../lib/format.js";

const SORTS = [
  { key: "distance", label: "Nearest" },
  { key: "price", label: "Cheapest" },
  { key: "rating", label: "Top rated" },
];

const SORTERS = {
  distance: (a, b) => a.distanceKm - b.distanceKm,
  price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || a.distanceKm - b.distanceKm,
  rating: (a, b) => (b.garage.rating || 0) - (a.garage.rating || 0) || a.distanceKm - b.distanceKm,
};

export default function GarageResults() {
  const { params } = useRoute();
  const [garages, setGarages] = useState([]);
  const [unpriced, setUnpriced] = useState([]);
  const [faultName, setFaultName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // roadside help is usually needed right now, so default to (and allow) today
  const [date, setDate] = useState(localDate(0));
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [sort, setSort] = useState("distance");

  const radiusKm = params.get("radiusKm");

  useEffect(() => {
    const query = new URLSearchParams({
      lat: params.get("lat"),
      lng: params.get("lng"),
      radiusKm,
      faultTypeId: params.get("faultTypeId"),
      vehicleTypeId: params.get("vehicleTypeId"),
    });
    const unfiltered = new URLSearchParams({ lat: params.get("lat"), lng: params.get("lng"), radiusKm });
    Promise.all([
      api.get(`/api/garages/nearby?${query.toString()}`),
      api.get("/api/fault-types"),
      api.get(`/api/garages/nearby?${unfiltered.toString()}`).catch(() => []),
    ])
      .then(([list, faults, all]) => {
        setGarages(list);
        // nearby garages that exist but haven't priced this fault + vehicle type, so can't be booked for it
        const bookableIds = new Set(list.map((g) => g.garage.id));
        setUnpriced(all.filter((g) => !bookableIds.has(g.garage.id)));
        const f = faults.find((x) => String(x.id) === params.get("faultTypeId"));
        setFaultName(f ? humanize(f.name) : "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addressMissing = !address.trim();

  const book = async (garageId) => {
    if (addressMissing) {
      setAddressTouched(true);
      setError("Add where the technician should come to, then tap Book.");
      document.getElementById("service-address")?.focus();
      return;
    }
    setError(null);
    setBookingId(garageId);
    try {
      await api.post("/api/bookings/place", {
        garageId,
        faultTypeId: Number(params.get("faultTypeId")),
        vehicleId: Number(params.get("vehicleId")),
        appointmentDate: date,
        serviceAddress: address.trim(),
        serviceLatitude: params.get("lat") ? Number(params.get("lat")) : null,
        serviceLongitude: params.get("lng") ? Number(params.get("lng")) : null,
      });
      navigate("/customer/bookings");
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBookingId(null);
    }
  };

  const sorted = [...garages].sort(SORTERS[sort]);
  const cheapest = garages.length ? Math.min(...garages.map((g) => g.price ?? Infinity)) : null;

  return html`
    <${Layout} title="Nearby garages" subtitle=${faultName ? `${faultName} · within ${radiusKm} km` : undefined} back="/customer/home">
      <${Alert} onClose=${() => setError(null)}>${error}<//>

      <div className="card">
        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="appt-date">When</label>
            <input id="appt-date" type="date" min=${localDate(0)} value=${date} onChange=${(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Quick pick</span>
            <div className="segmented" style=${{ margin: 0 }}>
              <button type="button" className=${date === localDate(0) ? "active" : ""} onClick=${() => setDate(localDate(0))}>Today</button>
              <button type="button" className=${date === localDate(1) ? "active" : ""} onClick=${() => setDate(localDate(1))}>Tomorrow</button>
            </div>
          </div>
        </div>
        <div className="field" style=${{ marginTop: 14 }}>
          <label htmlFor="service-address">Where should the technician come?</label>
          <input
            id="service-address"
            required
            placeholder="e.g. 12 MG Road, near City Mall"
            value=${address}
            aria-invalid=${addressTouched && addressMissing}
            style=${addressTouched && addressMissing ? { borderColor: "var(--red)" } : undefined}
            onBlur=${() => setAddressTouched(true)}
            onChange=${(e) => setAddress(e.target.value)}
          />
          <p className="hint">Landmarks help the technician find you faster.</p>
        </div>
      </div>

      ${loading && html`<${SkeletonList} count=${2} />`}

      ${!loading &&
      garages.length === 0 &&
      html`
        <div className="card">
          <${EmptyState}
            icon="garage"
            title=${unpriced.length ? `No garage nearby offers ${faultName ? faultName.toLowerCase() : "this fix"} for your vehicle yet` : "No garages found nearby"}
            subtitle=${unpriced.length
              ? "The garages below are nearby but haven't set a price for this job, so they can't be booked for it. Try another fault type or a wider radius."
              : "Try a bigger search radius, or check back later — new garages join all the time."}
          >
            <${Button} block=${false} variant="outline" icon="back" onClick=${() => navigate("/customer/home")}>Change search<//>
          <//>
        </div>
      `}

      ${!loading &&
      garages.length === 0 &&
      unpriced.map(
        (g) => html`
          <div key=${g.garage.id} className="card" style=${{ opacity: 0.75 }}>
            <div className="card-row top">
              <div style=${{ minWidth: 0 }}>
                <p className="card-title">${g.garage.name}</p>
                <p className="card-sub">${g.garage.address} · ${g.distanceKm.toFixed(1)} km away</p>
              </div>
              <span className="badge badge-neutral">Not available</span>
            </div>
            <p className="hint">Hasn't set a price for this fault and vehicle type yet.</p>
          </div>
        `
      )}

      ${!loading &&
      garages.length > 0 &&
      html`
        <div className="section-head">
          <div className="section-title">${garages.length} garage${garages.length === 1 ? "" : "s"} found</div>
        </div>
        <div className="chips" role="tablist" aria-label="Sort garages">
          ${SORTS.map((s) => html`<button key=${s.key} type="button" className=${`chip ${sort === s.key ? "active" : ""}`} onClick=${() => setSort(s.key)}>${s.label}</button>`)}
        </div>
      `}

      ${sorted.map(
        (g) => html`
          <div key=${g.garage.id} className="card fade-in">
            <div className="card-row top">
              <div style=${{ minWidth: 0 }}>
                <p className="card-title">${g.garage.name}</p>
                <p className="card-sub">${g.garage.address}</p>
              </div>
              <div style=${{ textAlign: "right", flexShrink: 0 }}>
                <div className="price">${money(g.price)}</div>
                ${g.price === cheapest && garages.length > 1 && html`<span className="badge badge-COMPLETED" style=${{ height: 22, marginTop: 4 }}>Best price</span>`}
              </div>
            </div>
            <div className="meta-list">
              <span className="meta"><${Icon} name="navigate" size=${15} /> ${g.distanceKm.toFixed(1)} km away</span>
              <span className="meta"><${RatingStars} value=${g.garage.rating} count=${g.garage.ratingCount || 0} /></span>
            </div>
            <div className="card-footer">
              <span className="muted">Fixed price · pay after the job</span>
              <${Button}
                size="sm"
                iconRight="chevron"
                loading=${bookingId === g.garage.id}
                disabled=${bookingId !== null && bookingId !== g.garage.id}
                onClick=${() => book(g.garage.id)}
              >
                Book
              <//>
            </div>
          </div>
        `
      )}
    <//>
  `;
}
