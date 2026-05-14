import { useEffect, useState } from 'react';
import ChatView from './components/ChatView.jsx';
import MenuView from './components/MenuView.jsx';
import CartView from './components/CartView.jsx';
import LoginView from './components/LoginView.jsx';
import StaffView from './components/StaffView.jsx';
import MyOrdersView from './components/MyOrdersView.jsx';
import BookDemoModal from './components/BookDemoModal.jsx';
import { staffAuth } from './api/client.js';

const CUSTOMER_TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'menu', label: 'Menu' },
  { id: 'cart', label: 'Cart' },
  { id: 'orders', label: 'My Orders' },
];

export default function App() {
  const [staffUser, setStaffUser] = useState(() => staffAuth.getUser());
  const [showLogin, setShowLogin] = useState(false);
  const [showBookDemo, setShowBookDemo] = useState(false);
  const [tab, setTab] = useState('chat');
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onExpired = () => setStaffUser(null);
    window.addEventListener('staff:expired', onExpired);
    return () => window.removeEventListener('staff:expired', onExpired);
  }, []);

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(null), 1800);
  }

  function addItem(menuItem) {
    setCart((prev) => {
      const found = prev.find((l) => l.menuItem.id === menuItem.id);
      if (found) {
        return prev.map((l) =>
          l.menuItem.id === menuItem.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    showToast(`Added ${menuItem.name}`);
  }

  function logoutStaff() {
    staffAuth.clear();
    setStaffUser(null);
    setShowLogin(false);
  }

  // Staff login flow (only takes over the UI when explicitly invoked)
  if (showLogin && !staffUser) {
    return (
      <LoginView
        onLoggedIn={(u) => {
          setStaffUser(u);
          setShowLogin(false);
        }}
        onCancel={() => setShowLogin(false)}
      />
    );
  }

  if (staffUser) {
    return (
      <div className="app">
        <div className="app__header">
          <h1>👨‍🍳 Kitchen Dashboard</h1>
          <div className="app__header-right">
            <span className="pill">{staffUser.displayName ?? staffUser.username}</span>
            <button className="logout" type="button" onClick={logoutStaff}>
              Log out
            </button>
          </div>
        </div>
        <StaffView />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // Default: customer view, no login.
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="app">
      <div className="app__header">
        <h1>🍜 AI Phone Order</h1>
        <div className="app__header-right">
          <button
            className="book-demo-cta"
            type="button"
            onClick={() => setShowBookDemo(true)}
          >
            Book a Free Demo
          </button>
          <button
            className="staff-link"
            type="button"
            onClick={() => setShowLogin(true)}
          >
            Staff
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {CUSTOMER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={tab === t.id ? 'is-active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'cart' && cartCount > 0 && (
              <span className="badge">{cartCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatView onAddItem={addItem} />}
      {tab === 'menu' && <MenuView onAddItem={addItem} />}
      {tab === 'cart' && (
        <CartView
          cart={cart}
          setCart={setCart}
          onPlaced={(order) => {
            showToast(
              `Order #${order.id} placed · $${Number(order.totalPrice).toFixed(2)}`
            );
            setTab('orders');
          }}
        />
      )}
      {tab === 'orders' && <MyOrdersView />}

      {showBookDemo && <BookDemoModal onClose={() => setShowBookDemo(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
