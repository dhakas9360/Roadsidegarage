import { createRoot } from "react-dom/client";
import html from "./lib/html.js";
import { AuthProvider } from "./auth.js";
import App from "./App.js";
import { getTheme, applyTheme } from "./theme.js";

applyTheme(getTheme());

const root = createRoot(document.getElementById("root"));
root.render(html`
  <${AuthProvider}>
    <${App} />
  <//>
`);
