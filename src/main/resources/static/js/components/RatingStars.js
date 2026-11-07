import html from "../lib/html.js";
import Icon from "./Icon.js";

export function RatingStars({ value = 0, max = 5, count, size = 14 }) {
  const rounded = Math.round(value || 0);
  return html`
    <span className="stars" aria-label=${`${(value || 0).toFixed(1)} out of ${max}`}>
      ${Array.from({ length: max }, (_, i) => html`
        <span key=${i} className=${`star ${i < rounded ? "filled" : ""}`}><${Icon} name="star" size=${size} fill="currentColor" strokeWidth=${1} /></span>
      `)}
      ${count !== undefined && html`<span className="stars-meta">${value ? value.toFixed(1) : "New"}${count ? ` · ${count}` : ""}</span>`}
    </span>
  `;
}

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export function StarPicker({ value, onChange }) {
  return html`
    <div className="star-picker-wrap">
      <span className="stars star-picker" role="radiogroup" aria-label="Rating">
        ${[1, 2, 3, 4, 5].map(
          (n) => html`
            <button
              type="button"
              key=${n}
              role="radio"
              aria-checked=${n === value}
              aria-label=${`${n} star${n > 1 ? "s" : ""}`}
              className=${`star ${n <= value ? "filled" : ""}`}
              onClick=${() => onChange(n)}
            >
              <${Icon} name="star" size=${38} fill="currentColor" strokeWidth=${1} />
            </button>
          `
        )}
      </span>
      <div className="star-picker-label">${LABELS[value] || ""}</div>
    </div>
  `;
}
