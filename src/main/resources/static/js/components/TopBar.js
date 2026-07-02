import html from "../lib/html.js";
import { useAuth } from "../auth.js";
import { navigate } from "../router.js";

export default function TopBar({ title, subtitle, back }) {
  const { logout } = useAuth();

  return html`
    <div className="topbar">
      <div className="topbar-row">
        <div className="brand" style=${back ? { cursor: "pointer" } : {}} onClick=${back ? () => navigate(back) : undefined}>
          ${back && html`<span>←</span>`}
          ${!title && html`<span className="brand-mark">RF</span>`}
          <span>${title || "RoadFix"}</span>
        </div>
        <button
          className="icon-btn"
          title="Log out"
          onClick=${() => {
            logout();
            navigate("/login");
          }}
        >
          ⏻
        </button>
      </div>
      ${subtitle && html`<div className="topbar-sub">${subtitle}</div>`}
    </div>
  `;
}
