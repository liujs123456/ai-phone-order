import { useState } from 'react';
import { api, staffAuth } from '../api/client.js';

export default function LoginView({ onLoggedIn, onCancel }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await api.staffLogin(username.trim(), password);
      staffAuth.save(resp);
      onLoggedIn(staffAuth.getUser());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function quickFill() {
    setUsername('staff');
    setPassword('staff123');
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <h2>👨‍🍳 Staff Login</h2>
        <p className="login__sub">Kitchen dashboard access</p>

        <label>
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="login__hint">
          Demo:
          <button type="button" className="link" onClick={quickFill}>
            staff / staff123
          </button>
        </div>

        {onCancel && (
          <button
            type="button"
            className="link"
            style={{ alignSelf: 'center' }}
            onClick={onCancel}
          >
            ← back to ordering
          </button>
        )}
      </form>
    </div>
  );
}
