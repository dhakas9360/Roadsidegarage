import html from "../lib/html.js";

export default function StatusBadge({ status }) {
  return html`<span className=${`badge badge-${status}`}>${status.replace("_", " ")}</span>`;
}
