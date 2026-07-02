import { createContext, useContext, useMemo, useState } from "react";
import html from "./lib/html.js";
import { getSession, setSession } from "./api.js";

const AuthContext = createContext(null);

const ROLE_PRIORITY = ["ROLE_GARAGE_OWNER", "ROLE_GARAGE_MEMBER", "ROLE_USER"];

export function primaryRole(roles) {
  if (!roles) return null;
  return ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0] || null;
}

export function homePathForRole(role) {
  if (role === "ROLE_GARAGE_OWNER") return "/owner/garages";
  if (role === "ROLE_GARAGE_MEMBER") return "/technician/jobs";
  return "/customer/home";
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  const value = useMemo(
    () => ({
      session,
      login: (s) => {
        setSession(s);
        setSessionState(s);
      },
      logout: () => {
        setSession(null);
        setSessionState(null);
      },
      role: primaryRole(session?.roles),
    }),
    [session]
  );

  return html`<${AuthContext.Provider} value=${value}>${children}<//>`;
}

export function useAuth() {
  return useContext(AuthContext);
}
