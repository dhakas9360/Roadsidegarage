import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { useRoute, Link } from "../router.js";
import Icon from "./Icon.js";

const NAV = {
  ROLE_USER: [
    { to: "/customer/home", icon: "search", label: "Get help" },
    { to: "/customer/bookings", icon: "receipt", label: "Bookings" },
    { to: "/customer/vehicles", icon: "car", label: "Vehicles" },
    { to: "/profile", icon: "user", label: "Profile" },
  ],
  ROLE_GARAGE_OWNER: [
    { to: "/owner/garages", icon: "garage", label: "Garages", match: (p) => p === "/owner/garages" || p === "/owner/garage" },
    { to: "/owner/garages/new", icon: "plus", label: "Add garage" },
    { to: "/profile", icon: "user", label: "Profile" },
  ],
  ROLE_GARAGE_MEMBER: [
    { to: "/technician/jobs", icon: "wrench", label: "Jobs" },
    { to: "/profile", icon: "user", label: "Profile" },
  ],
};

export default function BottomNav() {
  const { role } = useAuth();
  const { path } = useRoute();
  const items = NAV[role] || [];

  return html`
    <nav className="bottom-nav" aria-label="Main">
      ${items.map((item) => {
        const active = item.match ? item.match(path) : path === item.to || path.startsWith(item.to + "/");
        return html`
          <${Link} key=${item.to} to=${item.to} className=${active ? "active" : ""}>
            <span className="nav-icon"><${Icon} name=${item.icon} size=${21} strokeWidth=${active ? 2.4 : 2} /></span>
            <span className="nav-label">${item.label}</span>
          <//>
        `;
      })}
    </nav>
  `;
}
