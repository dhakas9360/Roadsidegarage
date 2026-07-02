import { useState } from "react";
import html from "../../lib/html.js";
import Layout from "../../components/Layout.js";
import Button from "../../components/Button.js";
import { StarPicker } from "../../components/RatingStars.js";
import { api } from "../../api.js";
import { useRoute, navigate } from "../../router.js";

export default function RateBooking() {
  const { params } = useRoute();
  const id = params.get("id");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/bookings/${id}/rate`, { rating, comment });
      navigate("/customer/bookings");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return html`
    <${Layout} title="Rate the job" back="/customer/bookings">
      ${error && html`<div className="error-banner">${error}</div>`}
      <div className="card" style=${{ textAlign: "center" }}>
        <div className="section-title">How was the fix?</div>
        <${StarPicker} value=${rating} onChange=${setRating} />
        <form onSubmit=${submit} style=${{ marginTop: 16, textAlign: "left" }}>
          <div className="field">
            <label>Add a comment (optional)</label>
            <textarea rows="3" value=${comment} onChange=${(e) => setComment(e.target.value)} placeholder="Fast, friendly, fixed it right..." />
          </div>
          <${Button} type="submit" loading=${saving}>Submit rating<//>
        </form>
      </div>
    <//>
  `;
}
