import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import StatusBadge from "../../components/StatusBadge.js";
import Spinner, { EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const load = () =>
    api
      .get("/api/garage-members/me")
      .then((p) => {
        setProfile(p);
        return api.get("/api/jobs/assigned").then((j) => setJobs(j.sort((a, b) => b.id - a.id)));
      })
      .catch(() => {
        setProfile(null);
        return api.get("/api/garages").then(setGarages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const joinGarage = async (garageId) => {
    setJoiningId(garageId);
    setError(null);
    try {
      await api.post("/api/garage-members/join", { garageId });
      setLoading(true);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoiningId(null);
    }
  };

  const act = async (id, action) => {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/api/jobs/${id}/${action}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailability = async () => {
    setTogglingAvail(true);
    try {
      await api.patch(`/api/garage-members/me/availability?available=${!profile.available}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingAvail(false);
    }
  };

  if (loading) return html`<${Layout} title="My jobs"><${Spinner} dark /><//>`;

  if (!profile) {
    return html`
      <${Layout} title="My jobs" subtitle="Join a garage to start getting jobs">
        ${error && html`<div className="error-banner">${error}</div>`}
        ${garages.length === 0
          ? html`<${EmptyState} emoji="🔧" title="No garages yet" subtitle="Once a garage owner registers one, it'll show up here to join." />`
          : garages.map(
              (g) => html`
                <div key=${g.id} className="card card-row">
                  <div>
                    <p className="card-title">${g.name}</p>
                    <p className="card-sub">${g.address}</p>
                  </div>
                  <${Button} size="sm" loading=${joiningId === g.id} onClick=${() => joinGarage(g.id)}>Join<//>
                </div>
              `
            )}
      <//>
    `;
  }

  return html`
    <${Layout} title="My jobs" subtitle=${`Rating ${profile.rating?.toFixed(1) ?? "0.0"} ★ · ${profile.activeJobs || 0} active`}>
      ${error && html`<div className="error-banner">${error}</div>`}
      <div className="card card-row">
        <div>
          <p className="card-title">Availability</p>
          <p className="card-sub">${profile.available ? "You're visible for new jobs" : "You won't get new jobs"}</p>
        </div>
        <${Button} size="sm" variant=${profile.available ? "dark" : "outline"} loading=${togglingAvail} onClick=${toggleAvailability}>
          ${profile.available ? "Go offline" : "Go online"}
        <//>
      </div>

      ${jobs.length === 0 && html`<${EmptyState} emoji="🧰" title="No jobs yet" subtitle="New assignments will show up here." />`}
      ${jobs.map(
        (j) => html`
          <div key=${j.id} className="card">
            <div className="card-row">
              <div>
                <p className="card-title">${j.faultType.name.replaceAll("_", " ")}</p>
                <p className="card-sub">${j.vehicle.vehicleType.name} ${j.vehicle.model || ""} · ${j.appointmentDate}</p>
              </div>
              <${StatusBadge} status=${j.status} />
            </div>
            ${j.serviceAddress &&
            html`<p className="card-sub" style=${{ marginTop: 6 }}>📍 ${j.serviceAddress}</p>`}
            ${(j.status === "ASSIGNED" || j.status === "IN_PROGRESS") && j.customerName &&
            html`
              <p className="card-sub" style=${{ marginTop: 2 }}>
                👤 ${j.customerName}
                ${j.customerPhone && html` · <a href=${`tel:${j.customerPhone}`}>${j.customerPhone}</a>`}
              </p>
            `}
            <div className="card-row" style=${{ marginTop: 10 }}>
              <div className="muted">₹${j.quotedPrice}</div>
              ${j.status === "ASSIGNED" &&
              html`<${Button} size="sm" loading=${busyId === j.id} onClick=${() => act(j.id, "accept")}>Accept<//>`}
              ${j.status === "IN_PROGRESS" &&
              html`<${Button} size="sm" variant="dark" loading=${busyId === j.id} onClick=${() => act(j.id, "complete")}>Mark complete<//>`}
            </div>
          </div>
        `
      )}
    <//>
  `;
}
