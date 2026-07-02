import html from "../lib/html.js";

export default function Button({ variant = "primary", size, loading, children, ...props }) {
  const cls = ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : ""].filter(Boolean).join(" ");
  return html`
    <button className=${cls} disabled=${loading || props.disabled} ...${props}>
      ${loading ? html`<span className="spinner"></span>` : children}
    </button>
  `;
}
