import { useEffect, useState } from 'react';
import { api, myOrders } from '../api/client.js';

const STATUS_COLOR = {
  PENDING: '#f1c40f',
  COOKING: '#e67e22',
  READY: '#27ae60',
  COMPLETED: '#7f8c8d',
  CANCELLED: '#95a5a6',
};

function relative(timeIso) {
  const diff = (Date.now() - new Date(timeIso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return new Date(timeIso).toLocaleDateString();
}

export default function MyOrdersView() {
  const [orders, setOrders] = useState(() => myOrders.list());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function refreshOne(order) {
    try {
      const live = await api.getOrder(order.id);
      myOrders.patchStatus(order.id, live.status);
      return { ...order, status: live.status };
    } catch (err) {
      return order;
    }
  }

  async function refreshAll() {
    if (orders.length === 0) return;
    setRefreshing(true);
    setError(null);
    try {
      const next = await Promise.all(orders.map(refreshOne));
      setOrders(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 15000);
    return () => clearInterval(id);
  }, []);

  if (orders.length === 0) {
    return (
      <div className="view">
        <div className="empty">
          No orders yet. Place one from the Cart tab and it'll show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="view my-orders">
      <div className="my-orders__head">
        <span>{orders.length} order{orders.length === 1 ? '' : 's'}</span>
        <button
          type="button"
          className="link"
          onClick={refreshAll}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="login__error">{error}</div>}

      {orders.map((o) => (
        <div className="kitchen-card" key={o.id}>
          <div className="kitchen-card__head">
            <strong>Order #{o.id}</strong>
            <span
              className="kitchen-card__status"
              style={{ background: STATUS_COLOR[o.status] ?? '#7f8c8d' }}
            >
              {o.status}
            </span>
          </div>
          <div className="kitchen-card__meta">
            {relative(o.placedAt)} · ${Number(o.totalPrice).toFixed(2)}
          </div>
          <ul className="kitchen-card__items">
            {o.items.map((line, i) => (
              <li key={i}>
                {line.quantity}× {line.name}
                {line.note && <em> — {line.note}</em>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <button
        type="button"
        className="link"
        style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
        onClick={() => {
          if (confirm('Clear all your local order history? This does not cancel them on the server.')) {
            myOrders.clear();
            setOrders([]);
          }
        }}
      >
        Clear history
      </button>
    </div>
  );
}
