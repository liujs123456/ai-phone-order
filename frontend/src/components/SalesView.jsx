import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const STATUS_COLORS = {
  NEW: '#3498db',
  CONTACTED: '#9b59b6',
  SCHEDULED: '#1abc9c',
  COMPLETED: '#7f8c8d',
  ARCHIVED: '#95a5a6',
};

function relative(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SalesView() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const data = await api.listDemoBookings();
      setLeads(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="view">
        <div className="empty">Loading leads…</div>
      </div>
    );
  }

  return (
    <div className="view staff">
      {error && <div className="login__error">{error}</div>}
      {leads.length === 0 && (
        <div className="empty">
          No leads yet. They'll appear here when restaurants book a demo.
        </div>
      )}

      {leads.map((l) => (
        <div className="kitchen-card" key={l.id}>
          <div className="kitchen-card__head">
            <strong>{l.restaurantName}</strong>
            <span
              className="kitchen-card__status"
              style={{ background: STATUS_COLORS[l.status] ?? '#7f8c8d' }}
            >
              {l.status}
            </span>
          </div>
          <div className="kitchen-card__meta">
            {l.contactName} · <a href={`mailto:${l.email}`}>{l.email}</a> ·{' '}
            <a href={`tel:${l.phone.replace(/\D/g, '')}`}>{l.phone}</a>
          </div>
          <ul className="kitchen-card__items">
            <li>
              <strong>Wants:</strong> {l.preferredTime}
            </li>
            {l.notes && (
              <li>
                <em>"{l.notes}"</em>
              </li>
            )}
            <li className="muted">submitted {relative(l.createdAt)}</li>
          </ul>
        </div>
      ))}
    </div>
  );
}
