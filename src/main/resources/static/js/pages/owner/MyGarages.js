import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import { RatingStars } from "../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { navigate } from "../../router.js";

export default function MyGarages() {
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/garages/my")
      .then(async (list) => {
        // flag garages with no prices: they never show up in customer searches
        const counts = await Promise.all(list.map((g) => api.get(`/api/garages/${g.id}/prices`).then((p) => p.length).catch(() => null)));
        setGarages(list.map((g, i) => ({ ...g, priceCount: counts[i] })));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return html`
    <${Layout}
      title="My garages"
      subtitle=${garages.length ? `${garages.length} garage${garages.length === 1 ? "" : "s"}` : undefined}
      actions=${garages.length > 0 && html`<${Button} size="sm" variant="secondary" icon="plus" onClick=${() => navigate("/owner/garages/new")}>New<//>`}
    >
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      ${loading && html`<${SkeletonList} count=${2} />`}
      ${!loading &&
      garages.length === 0 &&
      html`
        <div className="card">
          <${EmptyState} icon="garage" title="Add your first garage" subtitle="Set your location, prices and team — customers nearby can then book you.">
            <${Button} block=${false} icon="plus" onClick=${() => navigate("/owner/garages/new")}>Add a garage<//>
          <//>
        </div>
      `}
      ${garages.map(
        (g) => html`
          <div
            key=${g.id}
            className="card card-interactive fade-in"
            role="button"
            tabIndex="0"
            onClick=${() => navigate(`/owner/garage?id=${g.id}${g.priceCount === 0 ? "&tab=prices" : ""}`)}
            onKeyDown=${(e) => e.key === "Enter" && navigate(`/owner/garage?id=${g.id}${g.priceCount === 0 ? "&tab=prices" : ""}`)}
          >
            <div className="person">
              <div className="page-head-icon" style=${{ width: 44, height: 44 }}><${Icon} name="garage" size=${22} /></div>
              <div style=${{ minWidth: 0, flex: 1 }}>
                <p className="card-title">${g.name}</p>
                <p className="card-sub">${g.address}</p>
              </div>
              <span style=${{ color: "var(--faint)" }}><${Icon} name="chevron" size=${20} /></span>
            </div>
            ${g.priceCount === 0 &&
            html`<div className="alert alert-warning" style=${{ marginTop: 12, marginBottom: 0 }}><span className="alert-text">Not visible to customers yet — tap to add prices.</span></div>`}
            <div className="card-footer">
              <${RatingStars} value=${g.rating} count=${g.ratingCount || 0} />
              <span className="muted"><${Icon} name="calendar" size=${13} className="inline-icon" /> ${g.dailyCapacity} bookings/day</span>
            </div>
          </div>
        `
      )}
    <//>
  `;
}
