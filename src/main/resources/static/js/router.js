import { useEffect, useState } from "react";
import html from "./lib/html.js";

function currentHash() {
  return window.location.hash.replace(/^#/, "") || "/";
}

export function navigate(path) {
  window.location.hash = path;
}

export function useRoute() {
  const [hash, setHash] = useState(currentHash());
  useEffect(() => {
    const onChange = () => setHash(currentHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  return { path, params };
}

export function Link({ to, className, children, onClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) onClick();
    navigate(to);
  };
  return html`<a href=${`#${to}`} className=${className} onClick=${handleClick}>${children}</a>`;
}
