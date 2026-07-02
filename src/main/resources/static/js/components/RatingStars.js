import html from "../lib/html.js";

export function RatingStars({ value = 0, max = 5 }) {
  const stars = Array.from({ length: max }, (_, i) => i < Math.round(value));
  return html`
    <span className="stars">
      ${stars.map((filled, i) => html`<span key=${i} className=${`star ${filled ? "filled" : ""}`}>★</span>`)}
    </span>
  `;
}

export function StarPicker({ value, onChange }) {
  return html`
    <span className="stars star-picker">
      ${[1, 2, 3, 4, 5].map(
        (n) => html`
          <span key=${n} className=${`star ${n <= value ? "filled" : ""}`} onClick=${() => onChange(n)}>★</span>
        `
      )}
    </span>
  `;
}
