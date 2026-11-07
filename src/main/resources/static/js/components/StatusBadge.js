import html from "../lib/html.js";
import Icon from "./Icon.js";

const LABELS = {
  PENDING: "Pending",
  UNASSIGNED: "Finding technician",
  ASSIGNED: "Technician assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  RATED: "Rated",
  CANCELLED: "Cancelled",
};

// wording from the technician's point of view
const TECH_LABELS = { ASSIGNED: "New job", RATED: "Rated by customer" };

export default function StatusBadge({ status, viewer }) {
  const label = (viewer === "technician" && TECH_LABELS[status]) || LABELS[status] || status.replace("_", " ");
  return html`<span className=${`badge badge-${status}`}><span className="badge-dot"></span>${label}</span>`;
}

const STEPS = [
  { key: "REQUESTED", label: "Requested" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "On the job" },
  { key: "DONE", label: "Done" },
];

function stepIndex(status) {
  switch (status) {
    case "PENDING":
    case "UNASSIGNED":
      return 0;
    case "ASSIGNED":
      return 1;
    case "IN_PROGRESS":
      return 2;
    case "COMPLETED":
    case "RATED":
      return 3;
    default:
      return -1;
  }
}

/** Horizontal progress tracker for a booking's lifecycle. Hidden for cancelled bookings. */
export function StatusTracker({ status }) {
  const current = stepIndex(status);
  if (current < 0) return null;
  return html`
    <ol className="tracker" aria-label="Booking progress">
      ${STEPS.map((s, i) => {
        const state = i < current || (i === current && current === 3) ? "done" : i === current ? "current" : "todo";
        return html`
          <li key=${s.key} className=${`tracker-step ${state}`}>
            <span className="tracker-dot">${state === "done" ? html`<${Icon} name="check" size=${12} strokeWidth=${3} />` : null}</span>
            <span className="tracker-label">${s.label}</span>
          </li>
        `;
      })}
    </ol>
  `;
}
