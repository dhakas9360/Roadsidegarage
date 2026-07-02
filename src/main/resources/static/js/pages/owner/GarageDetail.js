import { useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import PricesTab from "./tabs/PricesTab.js";
import TechniciansTab from "./tabs/TechniciansTab.js";
import BookingsTab from "./tabs/BookingsTab.js";
import LeaderboardTab from "./tabs/LeaderboardTab.js";
import { useRoute } from "../../router.js";

const TABS = [
  { key: "prices", label: "Prices", Comp: PricesTab },
  { key: "technicians", label: "Technicians", Comp: TechniciansTab },
  { key: "bookings", label: "Bookings", Comp: BookingsTab },
  { key: "leaderboard", label: "Leaderboard", Comp: LeaderboardTab },
];

export default function GarageDetail() {
  const { params } = useRoute();
  const garageId = params.get("id");
  const [tab, setTab] = useState("prices");
  const Active = TABS.find((t) => t.key === tab).Comp;

  return html`
    <${Layout} title="Garage" back="/owner/garages">
      <div className="tabs">
        ${TABS.map(
          (t) => html`
            <div key=${t.key} className=${`tab ${tab === t.key ? "active" : ""}`} onClick=${() => setTab(t.key)}>
              ${t.label}
            </div>
          `
        )}
      </div>
      <${Active} garageId=${garageId} />
    <//>
  `;
}
