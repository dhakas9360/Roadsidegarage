import { useEffect, useState } from "react";
import html from "../../../lib/html.js";
import { Alert } from "../../../components/Layout.js";
import { RatingStars } from "../../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../../components/Spinner.js";
import { api } from "../../../api.js";

function monthKey(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function LeaderboardTab({ garageId }) {
  const [month, setMonth] = useState(monthKey(0));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/garages/${garageId}/leaderboard?month=${month}`)
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [garageId, month]);

  return html`
    <${Alert} onClose=${() => setError(null)}>${error}<//>
    <div className="segmented">
      <button type="button" className=${month === monthKey(0) ? "active" : ""} onClick=${() => setMonth(monthKey(0))}>This month</button>
      <button type="button" className=${month === monthKey(-1) ? "active" : ""} onClick=${() => setMonth(monthKey(-1))}>Last month</button>
    </div>
    <div className="section-title">Employee of the month · ${monthLabel(month)}</div>
    ${loading
      ? html`<${SkeletonList} count=${2} />`
      : entries.length === 0
        ? html`<div className="card"><${EmptyState} icon="trophy" title="No ratings yet" subtitle="Once customers rate completed jobs, your top technicians show up here." /></div>`
        : entries.map(
            (e) => html`
              <div key=${e.technicianId} className="card">
                <div className="person">
                  <div className=${`rank rank-${e.rank}`}>${e.rank}</div>
                  <div style=${{ minWidth: 0, flex: 1 }}>
                    <p className="card-title">${e.technicianName || `Technician #${e.technicianUserId}`}</p>
                    <p className="card-sub">${e.jobsRatedThisMonth} rated job${e.jobsRatedThisMonth === 1 ? "" : "s"}</p>
                  </div>
                  <div style=${{ textAlign: "right" }}>
                    <div className="price-sm">${e.averageRating.toFixed(1)}</div>
                    <${RatingStars} value=${e.averageRating} size=${12} />
                  </div>
                </div>
              </div>
            `
          )}
  `;
}
