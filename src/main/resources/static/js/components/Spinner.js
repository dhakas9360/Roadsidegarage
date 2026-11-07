import html from "../lib/html.js";
import Icon from "./Icon.js";

export default function Spinner({ dark }) {
  return html`<div className="spinner-wrap"><div className=${`spinner ${dark ? "dark" : ""}`}></div></div>`;
}

/** Placeholder cards shown while a list loads (reads better than a lone spinner). */
export function SkeletonList({ count = 3 }) {
  return html`
    <div aria-busy="true" aria-label="Loading">
      ${Array.from({ length: count }, (_, i) => html`
        <div key=${i} className="card skeleton-card">
          <div className="skeleton skeleton-line" style=${{ width: "55%" }}></div>
          <div className="skeleton skeleton-line" style=${{ width: "35%" }}></div>
          <div className="skeleton skeleton-line" style=${{ width: "80%", marginTop: 14 }}></div>
        </div>
      `)}
    </div>
  `;
}

export function EmptyState({ emoji, icon = "inbox", title, subtitle, children }) {
  return html`
    <div className="empty-state">
      <div className="empty-icon">${emoji ? html`<span className="empty-emoji">${emoji}</span>` : html`<${Icon} name=${icon} size=${26} />`}</div>
      <div className="empty-title">${title}</div>
      ${subtitle && html`<div className="empty-sub">${subtitle}</div>`}
      ${children && html`<div className="empty-actions">${children}</div>`}
    </div>
  `;
}
