import html from "../lib/html.js";
import TopBar from "./TopBar.js";
import BottomNav from "./BottomNav.js";

export default function Layout({ title, subtitle, back, noNav, children }) {
  return html`
    <div className="app-frame">
      <${TopBar} title=${title} subtitle=${subtitle} back=${back} />
      <div className=${`content ${noNav ? "no-pad-bottom" : ""}`}>${children}</div>
      ${!noNav && html`<${BottomNav} />`}
    </div>
  `;
}
