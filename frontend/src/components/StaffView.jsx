import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const STATUS_FLOW = ['PENDING', 'COOKING', 'READY', 'COMPLETED'];
const STATUS_COLORS = {
  PENDING: '#f1c40f',
  COOKING: '#e67e22',
  READY: '#27ae60',
  COMPLETED: '#7f8c8d',
  CANCELLED: '#95a5a6',
};

function relative(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function StaffView() {
  const [section, setSection] = useState('orders'); // 'orders' | 'leads'
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const [o, l] = await Promise.all([
        api.listOrders(),
        api.listDemoBookings().catch(() => []), // tolerate transient lead failure
      ]);
      setOrders(o.sort((a, b) => b.id - a.id));
      setLeads(l);
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

  async function advance(order) {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx === STATUS_FLOW.length - 1) return;
    try {
      await api.updateOrderStatus(order.id, STATUS_FLOW[idx + 1]);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancel(order) {
    if (!confirm(`Cancel order #${order.id}?`)) return;
    try {
      await api.cancelOrder(order.id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="view">
        <div className="empty">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <div className="tabs staff-tabs">
        <button
          type="button"
          className={section === 'orders' ? 'is-active' : ''}
          onClick={() => setSection('orders')}
        >
          Orders {orders.length > 0 && <span className="badge">{orders.length}</span>}
        </button>
        <button
          type="button"
          className={section === 'leads' ? 'is-active' : ''}
          onClick={() => setSection('leads')}
        >
          Leads {leads.length > 0 && <span className="badge">{leads.length}</span>}
        </button>
      </div>

      <div className="view staff">
        {error && <div className="login__error">{error}</div>}

        {section === 'orders' && (
          <>
            {orders.length === 0 && <div className="empty">No orders yet.</div>}
            {orders.map((o) => {
              const idx = STATUS_FLOW.indexOf(o.status);
              const canAdvance = idx >= 0 && idx < STATUS_FLOW.length - 1;
              return (
                <div className="kitchen-card" key={o.id}>
                  <div className="kitchen-card__head">
                    <strong>Order #{o.id}</strong>
                    <span
                      className="kitchen-card__status"
                      style={{ background: STATUS_COLORS[o.status] }}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="kitchen-card__meta">
                    {o.customerName || '—'} · {o.customerPhone || 'no phone'} · $
                    {Number(o.totalPrice).toFixed(2)}
                  </div>
                  <ul className="kitchen-card__items">
                    {o.items.map((line) => (
                      <li key={line.id}>
                        {line.quantity}× {line.menuItem.name}
                        {line.note && <em> — {line.note}</em>}
                      </li>
                    ))}
                  </ul>
                  <div className="kitchen-card__actions">
                    {canAdvance && (
                      <button type="button" onClick={() => advance(o)}>
                        → {STATUS_FLOW[idx + 1]}
                      </button>
                    )}
                    {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                      <button type="button" className="ghost" onClick={() => cancel(o)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {section === 'leads' && (
          <>
            {leads.length === 0 && <div className="empty">No demo bookings yet.</div>}
            {leads.map((l) => (
              <div className="kitchen-card" key={l.id}>
                <div className="kitchen-card__head">
                  <strong>{l.restaurantName}</strong>
                  <span
                    className="kitchen-card__status"
                    style={{ background: '#3498db' }}
                  >
                    {l.status}
                  </span>
                </div>
                <div className="kitchen-card__meta">
                  {l.contactName} · {l.email} · {l.phone}
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
          </>
        )}
      </div>
    </>
  );
}
