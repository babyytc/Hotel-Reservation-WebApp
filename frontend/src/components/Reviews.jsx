import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../ui/Reviews.css";
import { apiUrl } from "../utils/api";

function Stars({ value = 0 }) {
  const normalized = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(normalized);
  const hasHalf = normalized - full >= 0.5;

  return (
    <span className="stars" aria-label={`Rating ${normalized} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) {
          return (
            <span key={i} className="star full">
              ★
            </span>
          );
        }
        if (i === full && hasHalf) {
          return (
            <span key={i} className="star half">
              ★
            </span>
          );
        }
        return (
          <span key={i} className="star">
            ☆
          </span>
        );
      })}
    </span>
  );
}

function ReviewCard({ review }) {
  if (!review) return null;

  const name = review.member_name || review.member?.name;
  const firstInitial = name?.[0]?.toUpperCase() || "G";
  const tierRaw = review.member?.tier || review.tier || "silver";
  const tier = String(tierRaw || "SILVER").toUpperCase();
  const room = review.room_type_name || review.room_name;
  const created = review.created_at
    ? new Date(review.created_at).toLocaleString()
    : "";

  return (
    <article className="review-card">
      <header className="review-card__top">
        <div className="review-card__who">
          <div className="avatar" aria-hidden>
            {firstInitial}
          </div>
          <div className="identity">
            <div className="name">{name || `Guest #${review.member_id || ""}`}</div>
            <div className="meta">
              <span className={`tier tier-${tier.toLowerCase()}`}>{tier}</span>
              {created && (
                <span className="dot" aria-hidden="true">
                  •
                </span>
              )}
              {created && <time>{created}</time>}
            </div>
          </div>
        </div>
        <div className="review-card__rating">
          <Stars value={review.rating} />
        </div>
      </header>

      <div className="review-card__body">
        {room && <span className="room">Stayed in {room}</span>}
        {review.text && <p className="text">{review.text}</p>}
      </div>

      <footer className="review-card__foot">
        {review.booking_id && (
          <span className="badge">Booking #{review.booking_id}</span>
        )}
      </footer>
    </article>
  );
}

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get(apiUrl("reviewuser/getReviews.php"), {
          params: { limit: 6, offset: 0 },
        });

        if (!alive) return;

        const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
        setItems(rows);
        setCount(Number(res.data?.total ?? rows.length));

        const sum = rows.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        const nextAvg = rows.length ? sum / rows.length : Number(res.data?.avg || 0);
        setAvg(Number(nextAvg) || 0);
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setError("Unable to load reviews.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const roundedAvg = useMemo(() => (avg ? Number(avg).toFixed(2) : "0.00"), [avg]);

  return (
    <section className="reviews-section" id="reviews">
      <div className="reviews-header">
        <div>
          <p className="eyebrow">Guest Stories</p>
          <h2>Reviews from Recent Stays</h2>
        </div>
        <div className="reviews-stats">
          <Stars value={avg} />
          <span className="avg">{roundedAvg}</span>
          <span className="count">({count} reviews)</span>
        </div>
      </div>

      {error && <div className="reviews-error">{error}</div>}
      {loading ? (
        <div className="reviews-loading">Loading reviews…</div>
      ) : items.length === 0 ? (
        <p className="reviews-empty">Be the first to write a review.</p>
      ) : (
        <div className="reviews-grid">
          {items.map((review) => (
            <ReviewCard key={review.review_id} review={review} />
          ))}
        </div>
      )}

      <div className="reviews-cta">
        <Link className="reviews-button" to="/reviews/new">
          Share Your Experience
        </Link>
      </div>
    </section>
  );
}
