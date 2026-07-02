import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import { RatingStars } from "../../../components/RatingStars.js";
import Spinner, { EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardTab({ garageId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/garages/${garageId}/leaderboard`)
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [garageId]);

  if (loading) return html`<${Spinner} dark />`;

  const monthLabel = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });

  return html`
    ${error && html`<div className="error-banner">${error}</div>`}
    <div className="section-title">🏆 Employee of the month — ${monthLabel}</div>
    ${entries.length === 0
      ? html`<${EmptyState} emoji="🏆" title="No ratings yet this month" subtitle="Once jobs get rated, the leaderboard fills in." />`
      : entries.map(
          (e) => html`
            <div key=${e.technicianId} className="card card-row">
              <div className="card-row" style=${{ gap: 12 }}>
                <div style=${{ fontSize: 22, width: 30 }} className=${e.rank <= 3 ? `rank-${e.rank}` : ""}>
                  ${MEDALS[e.rank] || `#${e.rank}`}
                </div>
                <div>
                  <p className="card-title">Technician #${e.technicianUserId}</p>
                  <p className="card-sub">${e.jobsRatedThisMonth} job(s) rated</p>
                </div>
              </div>
              <${RatingStars} value=${e.averageRating} />
            </div>
          `
        )}
  `;
}
