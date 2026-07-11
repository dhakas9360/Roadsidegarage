import { useEffect } from "react";
import html from "./lib/html.js";
import { useAuth, homePathForRole } from "./auth.js";
import { useRoute, navigate } from "./router.js";

import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Notifications from "./pages/Notifications.js";
import Profile from "./pages/Profile.js";

import Home from "./pages/customer/Home.js";
import GarageResults from "./pages/customer/GarageResults.js";
import Vehicles from "./pages/customer/Vehicles.js";
import MyBookings from "./pages/customer/MyBookings.js";
import RateBooking from "./pages/customer/RateBooking.js";

import MyGarages from "./pages/owner/MyGarages.js";
import CreateGarage from "./pages/owner/CreateGarage.js";
import GarageDetail from "./pages/owner/GarageDetail.js";

import MyJobs from "./pages/technician/MyJobs.js";

const PUBLIC_ROUTES = { "/login": Login, "/register": Register };

const PROTECTED_ROUTES = {
  "/notifications": { role: null, Component: Notifications },
  "/profile": { role: null, Component: Profile },
  "/settings": { role: null, Component: Profile },

  "/customer/home": { role: "ROLE_USER", Component: Home },
  "/customer/results": { role: "ROLE_USER", Component: GarageResults },
  "/customer/vehicles": { role: "ROLE_USER", Component: Vehicles },
  "/customer/bookings": { role: "ROLE_USER", Component: MyBookings },
  "/customer/rate": { role: "ROLE_USER", Component: RateBooking },

  "/owner/garages": { role: "ROLE_GARAGE_OWNER", Component: MyGarages },
  "/owner/garages/new": { role: "ROLE_GARAGE_OWNER", Component: CreateGarage },
  "/owner/garage": { role: "ROLE_GARAGE_OWNER", Component: GarageDetail },

  "/technician/jobs": { role: "ROLE_GARAGE_MEMBER", Component: MyJobs },
};

export default function App() {
  const { session, role } = useAuth();
  const { path } = useRoute();

  useEffect(() => {
    if (!session && path !== "/login" && path !== "/register") {
      navigate("/login");
      return;
    }
    if (session && (path === "/login" || path === "/register" || path === "/")) {
      navigate(homePathForRole(role));
      return;
    }
    if (session && PROTECTED_ROUTES[path] && PROTECTED_ROUTES[path].role && PROTECTED_ROUTES[path].role !== role) {
      navigate(homePathForRole(role));
    }
  }, [session, path, role]);

  if (!session) {
    const Public = PUBLIC_ROUTES[path];
    return Public ? html`<${Public} />` : null;
  }

  const route = PROTECTED_ROUTES[path];
  if (!route || (route.role && route.role !== role)) return null;

  return html`<${route.Component} />`;
}
