import { createRoot } from "react-dom/client";
import html from "./lib/html.js";
import { AuthProvider } from "./auth.js";
import App from "./App.js";

const root = createRoot(document.getElementById("root"));
root.render(html`
  <${AuthProvider}>
    <${App} />
  <//>
`);
