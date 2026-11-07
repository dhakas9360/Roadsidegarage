import { useState } from "react";
import html from "../../lib/html.js";
import Layout, { Alert } from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { StarPicker } from "../../components/RatingStars.js";
import { api } from "../../api.js";
import { useRoute, navigate } from "../../router.js";

const QUICK_TAGS = ["Arrived quickly", "Friendly", "Fixed it right", "Fair price"];

export default function RateBooking() {
  const { params } = useRoute();
  const id = params.get("id");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const addTag = (tag) => setComment((c) => (c.includes(tag) ? c : c ? `${c}, ${tag.toLowerCase()}` : tag));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/bookings/${id}/rate`, { rating, comment: comment.trim() || null });
      navigate("/customer/bookings");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return html`
    <${Layout} title="Rate the job" back="/customer/bookings">
      <${Alert} onClose=${() => setError(null)}>${error}<//>
      <form className="card" onSubmit=${submit}>
        <div style=${{ textAlign: "center" }}>
          <div className="card-title" style=${{ fontSize: 18 }}>How was the fix?</div>
          <p className="card-sub">Your rating helps the best technicians get more jobs.</p>
          <${StarPicker} value=${rating} onChange=${setRating} />
        </div>
        <div className="chips" style=${{ flexWrap: "wrap", justifyContent: "center", margin: "6px 0 14px" }}>
          ${QUICK_TAGS.map((t) => html`<button key=${t} type="button" className="chip" onClick=${() => addTag(t)}>+ ${t}</button>`)}
        </div>
        <div className="field">
          <label htmlFor="rate-comment">Comment <span className="muted">(optional)</span></label>
          <textarea id="rate-comment" rows="3" maxLength="500" value=${comment} onChange=${(e) => setComment(e.target.value)} placeholder="Anything the garage should know?" />
        </div>
        <${Button} type="submit" size="lg" loading=${saving}>Submit rating<//>
      </form>
    <//>
  `;
}
