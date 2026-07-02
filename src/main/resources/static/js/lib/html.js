import { createElement, Fragment } from "react";
import htm from "htm";

const html = htm.bind((type, props, ...children) => {
  if (type === "Fragment") return createElement(Fragment, props, ...children);
  return createElement(type, props, ...children);
});

export default html;
