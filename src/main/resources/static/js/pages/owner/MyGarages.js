import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { RatingStars } from "../../components/RatingStars.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate, Link } from "../../router.js";

export default function MyGarages() {
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/garages/my")
      .then(setGarages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return html`<${Layout} title="My garages"><${Spinner} dark /><//>`;

  return html`
    <${Layout} title="My garages">
      ${error && html`<div className="error-banner">${error}</div>`}
      ${garages.length === 0 && html`<${EmptyState} emoji="🏠" title="No garages yet" subtitle="Add your first garage to start taking bookings." />`}
      ${garages.map(
        (g) => html`
          <div key=${g.id} className="card" style=${{ cursor: "pointer" }} onClick=${() => navigate(`/owner/garage?id=${g.id}`)}>
            <div className="card-row">
              <div>
                <p className="card-title">${g.name}</p>
                <p className="card-sub">${g.address}</p>
              </div>
              <div style=${{ textAlign: "right" }}>
                <${RatingStars} value=${g.rating} />
                <div className="muted">${g.ratingCount || 0} ratings</div>
              </div>
            </div>
          </div>
        `
      )}
      <${Link} to="/owner/garages/new"><${Button}>+ Add a garage<//><//>
    <//>
  `;
}
