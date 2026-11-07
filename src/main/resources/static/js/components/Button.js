import { useEffect, useRef, useState } from "react";
import html from "../lib/html.js";
import Icon from "./Icon.js";

/**
 * variant: primary | secondary | outline | ghost | danger | success | dark
 * size:    sm | md (default) | lg
 * block:   full width (default true for md/lg, false for sm)
 */
export default function Button({ variant = "primary", size = "md", block, icon, iconRight, loading, children, className = "", ...props }) {
  const isBlock = block ?? size !== "sm";
  const cls = ["btn", `btn-${variant}`, `btn-${size}`, isBlock ? "btn-block" : "", className].filter(Boolean).join(" ");
  return html`
    <button className=${cls} disabled=${loading || props.disabled} aria-busy=${loading ? "true" : undefined} ...${props}>
      ${loading
        ? html`<span className="spinner spinner-btn"></span>`
        : html`
            ${icon && html`<${Icon} name=${icon} size=${size === "sm" ? 15 : 18} />`}
            ${children && html`<span>${children}</span>`}
            ${iconRight && html`<${Icon} name=${iconRight} size=${size === "sm" ? 15 : 18} />`}
          `}
    </button>
  `;
}

/**
 * Two-step button for destructive / irreversible actions: the first tap arms it
 * ("Tap again to confirm"), the second tap within 4s runs onConfirm.
 */
export function ConfirmButton({ onConfirm, confirmLabel = "Tap again to confirm", children, variant = "danger", ...props }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const click = () => {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  };

  return html`
    <${Button} ...${props} variant=${armed ? "danger-solid" : variant} onClick=${click}>
      ${armed ? confirmLabel : children}
    <//>
  `;
}
