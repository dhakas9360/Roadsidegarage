import { useEffect, useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button, { ConfirmButton } from "../../components/Button.js";
import Icon from "../../components/Icon.js";
import StatusBadge from "../../components/StatusBadge.js";
import { RatingStars } from "../../components/RatingStars.js";
import { SkeletonList, EmptyState } from "../../components/Spinner.js";
import { api } from "../../api.js";
import { ACTIVE_STATUSES, humanize, money, friendlyDate, mapsLink, poll } from "../../lib/format.js";

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = () =>
    api
      .get("/api/garage-members/me")
      .then((p) => {
        setProfile(p);
        return api.get("/api/jobs/assigned").then((j) => setJobs(j.sort((a, b) => b.id - a.id)));
      })
      .catch((err) => {
        if (err.status !== 404) throw err;
        setProfile(null);
        return api.get("/api/garages").then(setGarages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // new jobs can be auto-dispatched at any time — keep the list fresh
    return poll(load, 15000);
  }, []);

  const joinGarage = async (garageId) => {
    setJoiningId(garageId);
    setError(null);
    try {
      await api.post("/api/garage-members/join", { garageId });
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

  if (loading) return html`<${Layout} title="My jobs"><${SkeletonList} count=${3} /><//>`;

  if (!profile) {
    return html`
      <${Layout} title="Join a garage" subtitle="Pick the garage you work at to start receiving jobs">
        <${Alert} onClose=${() => setError(null)}>${error}<//>
        ${garages.length === 0
          ? html`<div className="card"><${EmptyState} icon="garage" title="No garages yet" subtitle="Once a garage owner registers their garage, it'll show up here." /></div>`
          : garages.map(
              (g) => html`
                <div key=${g.id} className="card">
                  <div className="person">
                    <div className="page-head-icon" style=${{ width: 44, height: 44 }}><${Icon} name="garage" size=${22} /></div>
                    <div style=${{ minWidth: 0, flex: 1 }}>
                      <p className="card-title">${g.name}</p>
                      <p className="card-sub">${g.address}</p>
                    </div>
                    <${Button} size="sm" loading=${joiningId === g.id} disabled=${joiningId !== null && joiningId !== g.id} onClick=${() => joinGarage(g.id)}>Join<//>
                  </div>
                </div>
              `
            )}
      <//>
    `;
  }

  const active = jobs.filter((j) => ACTIVE_STATUSES.has(j.status));
  const done = jobs.filter((j) => !ACTIVE_STATUSES.has(j.status));
  const visible = showDone ? done : active;

  return html`
    <${Layout} title="My jobs" subtitle=${profile.garage?.name}>
      <${Alert} onClose=${() => setError(null)}>${error}<//>

      <div className="card">
        <div className="settings-row">
          <div>
            <p className="card-title"><span className=${`online-dot ${profile.available ? "on" : ""}`}></span>${profile.available ? "You're online" : "You're offline"}</p>
            <p className="card-sub">${profile.available ? "New jobs will be assigned to you" : "Go online to receive new jobs"}</p>
          </div>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked=${profile.available}
            aria-label="Available for new jobs"
            disabled=${togglingAvail}
            onClick=${toggleAvailability}
          >
            <span className="switch-track"></span><span className="switch-thumb"></span>
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-value">${active.length}</div><div className="stat-label">Active</div></div>
        <div className="stat"><div className="stat-value">${done.length}</div><div className="stat-label">Completed</div></div>
        <div className="stat"><div className="stat-value">${profile.ratingCount ? profile.rating.toFixed(1) : "–"}</div><div className="stat-label">Rating</div></div>
      </div>

      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected=${!showDone} className=${!showDone ? "active" : ""} onClick=${() => setShowDone(false)}>
          To do ${active.length > 0 ? html`<span className="tab-count">${active.length}</span>` : null}
        </button>
        <button type="button" role="tab" aria-selected=${showDone} className=${showDone ? "active" : ""} onClick=${() => setShowDone(true)}>History</button>
      </div>

      ${visible.length === 0 &&
      html`
        <div className="card">
          <${EmptyState}
            icon=${showDone ? "inbox" : "wrench"}
            title=${showDone ? "No finished jobs yet" : "No jobs right now"}
            subtitle=${showDone ? "" : profile.available ? "New assignments show up here automatically." : "You're offline — switch on availability to get jobs."}
          />
        </div>
      `}

      ${visible.map((j) => {
        const directions = mapsLink(j.serviceLatitude, j.serviceLongitude, j.serviceAddress);
        const live = ACTIVE_STATUSES.has(j.status);
        return html`
          <article key=${j.id} className="card fade-in">
            <div className="card-row top">
              <div style=${{ minWidth: 0 }}>
                <p className="card-title">${humanize(j.faultType.name)}</p>
                <p className="card-sub">#${j.id} · ${friendlyDate(j.appointmentDate)} · ${humanize(j.vehicle.vehicleType.name)}${j.vehicle.model ? ` ${j.vehicle.model}` : ""}</p>
              </div>
              <${StatusBadge} status=${j.status} viewer="technician" />
            </div>
            <div className="meta-list">
              ${j.serviceAddress && html`<span className="meta"><${Icon} name="pin" size=${15} /> ${j.serviceAddress}</span>`}
              ${live && j.customerName && html`<span className="meta"><${Icon} name="user" size=${15} /> ${j.customerName}${j.vehicle.licensePlate ? ` · ${j.vehicle.licensePlate}` : ""}</span>`}
              ${j.status === "RATED" && html`<span className="meta"><${RatingStars} value=${j.rating} />${j.ratingComment && html`<span className="muted">“${j.ratingComment}”</span>`}</span>`}
            </div>
            ${live &&
            html`
              <div className="btn-row" style=${{ marginTop: 12 }}>
                ${j.customerPhone && html`<a className="btn btn-outline btn-sm" href=${`tel:${j.customerPhone}`}><${Icon} name="phone" size=${15} /><span>Call customer</span></a>`}
                ${directions && html`<a className="btn btn-outline btn-sm" href=${directions} target="_blank" rel="noopener"><${Icon} name="navigate" size=${15} /><span>Directions</span></a>`}
              </div>
            `}
            <div className="card-footer">
              <span className="price-sm">${money(j.quotedPrice)}</span>
              ${j.status === "ASSIGNED" && html`<${Button} size="sm" icon="wrench" loading=${busyId === j.id} onClick=${() => act(j.id, "accept")}>Start job<//>`}
              ${j.status === "IN_PROGRESS" &&
              html`<${ConfirmButton} size="sm" variant="success" confirmLabel="Tap to confirm done" loading=${busyId === j.id} onConfirm=${() => act(j.id, "complete")}>Mark complete<//>`}
            </div>
          </article>
        `;
      })}
    <//>
  `;
}
