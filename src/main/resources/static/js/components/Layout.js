import html from "../lib/html.js";
import TopBar from "./TopBar.js";
import BottomNav from "./BottomNav.js";

export default function Layout({ title, subtitle, back, actions, noNav, children }) {
  return html`
    <div className="app-frame">
      <${TopBar} title=${title} subtitle=${subtitle} back=${back} actions=${actions} />
      <main className=${`content ${noNav ? "no-pad-bottom" : ""}`}>${children}</main>
      ${!noNav && html`<${BottomNav} />`}
    </div>
  `;
}

/** Inline alert banner. tone: error | success | info | warning */
export function Alert({ tone = "error", children, onClose }) {
  if (!children) return null;
  return html`
    <div className=${`alert alert-${tone}`} role=${tone === "error" ? "alert" : "status"}>
      <span className="alert-text">${children}</span>
      ${onClose && html`<button className="alert-close" aria-label="Dismiss" onClick=${onClose}>×</button>`}
    </div>
  `;
}
