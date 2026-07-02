import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { RatingStars } from "../../components/RatingStars.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { useRoute, navigate } from "../../router.js";

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function GarageResults() {
  const { params } = useRoute();
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(tomorrow());
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams({
      lat: params.get("lat"),
      lng: params.get("lng"),
      radiusKm: params.get("radiusKm"),
      faultTypeId: params.get("faultTypeId"),
      vehicleTypeId: params.get("vehicleTypeId"),
    });
    api
      .get(`/api/garages/nearby?${query.toString()}`)
      .then(setGarages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const book = async (garageId) => {
    setError(null);
    setBookingId(garageId);
    try {
      await api.post("/api/bookings/place", {
        garageId,
        faultTypeId: Number(params.get("faultTypeId")),
        vehicleId: Number(params.get("vehicleId")),
        appointmentDate: date,
      });
      navigate("/customer/bookings");
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingId(null);
    }
  };

  return html`
    <${Layout} title="Nearby garages" back="/customer/home">
      ${error && html`<div className="error-banner">${error}</div>`}
      <div className="card">
        <div className="field" style=${{ marginBottom: 0 }}>
          <label>Appointment date</label>
          <input type="date" min=${tomorrow()} value=${date} onChange=${(e) => setDate(e.target.value)} />
        </div>
      </div>

      ${loading && html`<div style=${{ marginTop: 40 }}><${Spinner} dark /></div>`}

      ${!loading &&
      garages.length === 0 &&
      html`<${EmptyState} emoji="😕" title="No garages found" subtitle="Try a bigger radius or a different fault type." />`}

      ${garages.map(
        (g) => html`
          <div key=${g.garage.id} className="card">
            <div className="card-row">
              <div>
                <p className="card-title">${g.garage.name}</p>
                <p className="card-sub">${g.garage.address}</p>
              </div>
              <div style=${{ textAlign: "right" }}>
                <div style=${{ fontWeight: 800, fontSize: 18, color: "var(--accent-dark)" }}>₹${g.price}</div>
                <div className="muted">${g.distanceKm.toFixed(1)} km away</div>
              </div>
            </div>
            <div className="card-row" style=${{ marginTop: 10 }}>
              <div>
                <${RatingStars} value=${g.garage.rating} />
                <span className="muted" style=${{ marginLeft: 6 }}>(${g.garage.ratingCount || 0})</span>
              </div>
              <${Button} size="sm" loading=${bookingId === g.garage.id} onClick=${() => book(g.garage.id)}>
                Book now
              <//>
            </div>
          </div>
        `
      )}
    <//>
  `;
}
