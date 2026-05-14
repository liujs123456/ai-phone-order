import { useState } from 'react';
import { api, myOrders } from '../api/client.js';

export default function CartView({ cart, setCart, onPlaced }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const total = cart.reduce(
    (sum, line) => sum + Number(line.menuItem.price) * line.quantity,
    0
  );

  function adjust(menuItemId, delta) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.menuItem.id === menuItemId
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  async function submit() {
    if (cart.length === 0 || !phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        customerName: name.trim() || null,
        customerPhone: phone.trim(),
        items: cart.map((line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          note: line.note ?? null,
        })),
      };
      const order = await api.placeOrder(payload);

      myOrders.add({
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        placedAt: order.createdAt ?? new Date().toISOString(),
        items: cart.map((line) => ({
          name: line.menuItem.name,
          quantity: line.quantity,
          note: line.note ?? null,
        })),
      });

      onPlaced(order);
      setCart([]);
      setName('');
      setPhone('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="view">
        <div className="empty">
          Your cart is empty. Add a dish from the chat or menu tab.
        </div>
      </div>
    );
  }

  return (
    <div className="view cart">
      {cart.map((line) => (
        <div className="cart__line" key={line.menuItem.id}>
          <div className="cart__line-name">
            {line.menuItem.name}
            <div className="menu-card__desc">
              ${Number(line.menuItem.price).toFixed(2)}
            </div>
          </div>
          <div className="cart__qty">
            <button
              type="button"
              onClick={() => adjust(line.menuItem.id, -1)}
              aria-label="Decrease"
            >
              −
            </button>
            <span>{line.quantity}</span>
            <button
              type="button"
              onClick={() => adjust(line.menuItem.id, 1)}
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className="cart__total">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>

      <div className="cart__form">
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="tel"
          inputMode="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        {error && <div className="empty">{error}</div>}
        <button
          className="cart__submit"
          type="button"
          onClick={submit}
          disabled={submitting || !phone.trim()}
        >
          {submitting ? 'Placing…' : `Place order · $${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
