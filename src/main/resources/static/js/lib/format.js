// Shared display helpers so every page labels things the same way.

export const FAULT_EMOJI = {
  BATTERY_ISSUE: "🔋",
  FLAT_TYRE: "🛞",
  BRAKE_PROBLEM: "🛑",
  ENGINE_OVERHEATING: "🌡️",
  ELECTRICAL_FAULT: "⚡",
};

export const VEHICLE_EMOJI = {
  BIKE: "🏍️",
  HATCHBACK: "🚗",
  SEDAN: "🚘",
  SUV: "🚙",
  TRUCK: "🚚",
};

export const ACTIVE_STATUSES = new Set(["PENDING", "UNASSIGNED", "ASSIGNED", "IN_PROGRESS"]);
export const FINISHED_STATUSES = new Set(["COMPLETED", "RATED"]);

/** "BATTERY_ISSUE" -> "Battery issue" */
const ACRONYMS = new Set(["SUV"]);

export function humanize(name = "") {
  if (ACRONYMS.has(name)) return name;
  const s = name.replaceAll("_", " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export function money(value) {
  return value == null ? "—" : inr.format(value);
}

/** "2026-11-07" -> "Today" / "Tomorrow" / "Sat, 14 Nov" */
export function friendlyDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Google Maps directions link for a booking's service location. */
export function mapsLink(lat, lng, address) {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/** Local calendar date as YYYY-MM-DD (toISOString() would shift to UTC). */
export function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Re-runs fn every `ms` while the tab is visible. Returns a cleanup function. */
export function poll(fn, ms) {
  const tick = () => document.visibilityState === "visible" && fn();
  const id = setInterval(tick, ms);
  document.addEventListener("visibilitychange", tick);
  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", tick);
  };
}
