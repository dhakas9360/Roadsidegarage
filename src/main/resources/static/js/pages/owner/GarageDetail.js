import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Icon from "../../components/Icon.js";
import Button from "../../components/Button.js";
import PricesTab from "./tabs/PricesTab.js";
import TechniciansTab from "./tabs/TechniciansTab.js";
import BookingsTab from "./tabs/BookingsTab.js";
import LeaderboardTab from "./tabs/LeaderboardTab.js";
import { api } from "../../api.js";
import { useRoute } from "../../router.js";
import { ACTIVE_STATUSES, localDate } from "../../lib/format.js";

const TABS = [
  { key: "bookings", label: "Bookings", icon: "receipt", Comp: BookingsTab },
  { key: "technicians", label: "Team", icon: "users", Comp: TechniciansTab },
  { key: "prices", label: "Prices", icon: "tag", Comp: PricesTab },
  { key: "leaderboard", label: "Leaderboard", icon: "trophy", Comp: LeaderboardTab },
];

export default function GarageDetail() {
  const { params } = useRoute();
  const garageId = params.get("id");
  const [tab, setTab] = useState(params.get("tab") || "bookings");
  const [garage, setGarage] = useState(null);
  const [stats, setStats] = useState(null);
  const Active = TABS.find((t) => t.key === tab).Comp;

  // header + stats; refreshed whenever a tab reports a change
  const loadSummary = () =>
    Promise.all([
      api.get("/api/garages/my"),
      api.get(`/api/bookings/garage/${garageId}`),
      api.get(`/api/garage-members/garage/${garageId}`),
      api.get(`/api/garages/${garageId}/prices`),
    ])
      .then(([garages, bookings, members, prices]) => {
        setGarage(garages.find((g) => String(g.id) === String(garageId)) || null);
        const today = localDate(0);
        setStats({
          today: bookings.filter((b) => b.appointmentDate === today && b.status !== "CANCELLED").length,
          active: bookings.filter((b) => ACTIVE_STATUSES.has(b.status)).length,
          waiting: bookings.filter((b) => b.status === "UNASSIGNED").length,
          online: members.filter((m) => m.available).length,
          team: members.length,
          prices: prices.length,
        });
      })
      .catch(() => {});

  useEffect(() => {
    loadSummary();
  }, [garageId]);

  return html`
    <${Layout} title=${garage?.name || "Garage"} subtitle=${garage?.address} back="/owner/garages">
      ${stats &&
      html`
        <div className="stats">
          <div className="stat">
            <div className="stat-value">${stats.today}<span className="muted" style=${{ fontSize: 13, fontWeight: 600 }}> / ${garage?.dailyCapacity ?? "–"}</span></div>
            <div className="stat-label">Booked today</div>
          </div>
          <div className=${`stat ${stats.waiting ? "warn" : ""}`}>
            <div className="stat-value">${stats.active}</div>
            <div className="stat-label">${stats.waiting ? `${stats.waiting} waiting` : "Active jobs"}</div>
          </div>
          <div className="stat">
            <div className="stat-value">${stats.online}<span className="muted" style=${{ fontSize: 13, fontWeight: 600 }}> / ${stats.team}</span></div>
            <div className="stat-label">Techs online</div>
          </div>
        </div>
      `}

      ${stats &&
      stats.prices === 0 &&
      tab !== "prices" &&
      html`
        <div className="alert alert-warning">
          <span className="alert-text"><strong>Customers can't find this garage yet.</strong> Search only shows garages that have a price for the customer's fault and vehicle type — add your prices first.</span>
          <${Button} size="sm" onClick=${() => setTab("prices")}>Set prices<//>
        </div>
      `}
      ${stats &&
      stats.prices > 0 &&
      stats.team === 0 &&
      tab !== "technicians" &&
      html`<div className="alert alert-info"><span className="alert-text">No technicians yet — bookings will wait unassigned until someone joins your team.</span></div>`}

      <div className="segmented" role="tablist">
        ${TABS.map(
          (t) => html`
            <button key=${t.key} type="button" role="tab" aria-selected=${tab === t.key} className=${tab === t.key ? "active" : ""} onClick=${() => setTab(t.key)}>
              <${Icon} name=${t.icon} size=${15} />${t.label}
              ${t.key === "bookings" && stats?.waiting ? html`<span className="tab-count">${stats.waiting}</span>` : null}
            </button>
          `
        )}
      </div>
      <${Active} garageId=${garageId} onChange=${loadSummary} />
    <//>
  `;
}
