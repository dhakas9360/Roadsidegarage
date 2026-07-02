import html from "../lib/html.js";

export default function Spinner({ dark }) {
  return html`<div className=${`spinner ${dark ? "dark" : ""}`}></div>`;
}

export function EmptyState({ emoji = "🔧", title, subtitle }) {
  return html`
    <div className="empty-state">
      <span className="emoji">${emoji}</span>
      <div style=${{ fontWeight: 700, color: "var(--ink)" }}>${title}</div>
      ${subtitle && html`<div className="muted" style=${{ marginTop: 4 }}>${subtitle}</div>`}
    </div>
  `;
}
