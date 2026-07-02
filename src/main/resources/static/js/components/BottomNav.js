import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { useRoute, Link } from "../router.js";

const NAV = {
  ROLE_USER: [
    { to: "/customer/home", icon: "🔍", label: "Search" },
    { to: "/customer/bookings", icon: "🧾", label: "Bookings" },
    { to: "/customer/vehicles", icon: "🚗", label: "Vehicles" },
  ],
  ROLE_GARAGE_OWNER: [
    { to: "/owner/garages", icon: "🏠", label: "Garages" },
    { to: "/owner/garages/new", icon: "➕", label: "Add Garage" },
  ],
  ROLE_GARAGE_MEMBER: [{ to: "/technician/jobs", icon: "🔧", label: "Jobs" }],
};

export default function BottomNav() {
  const { role } = useAuth();
  const { path } = useRoute();
  const items = NAV[role] || [];

  return html`
    <div className="bottom-nav">
      ${items.map(
        (item) => html`
          <${Link} key=${item.to} to=${item.to} className=${path.startsWith(item.to) || (item.to.endsWith("/garages") && path.startsWith("/owner/garage") && !path.includes("new")) ? "active" : ""}>
            <span className="nav-icon">${item.icon}</span>
            ${item.label}
          <//>
        `
      )}
    </div>
  `;
}
