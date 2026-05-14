import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const initialForm = {
  restaurantName: '',
  contactName: '',
  email: '',
  phone: '',
  preferredTime: '',
  notes: '',
};

function validateClient(form) {
  if (!form.restaurantName.trim()) return 'Restaurant name is required.';
  if (!form.contactName.trim()) return 'Contact name is required.';
  if (!form.email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(form.email.trim())) return 'Email format looks wrong.';
  if (!form.phone.trim()) return 'Phone is required.';
  if (form.phone.replace(/\D/g, '').length < 7) {
    return 'Phone number must contain at least 7 digits.';
  }
  if (!form.preferredTime.trim()) return 'Preferred demo time is required.';
  return null;
}

export default function BookDemoModal({ onClose }) {
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);

  // Close on Escape, lock body scroll while open
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && state !== 'submitting') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state, onClose]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    const clientErr = validateClient(form);
    if (clientErr) {
      setError(clientErr);
      setState('error');
      return;
    }
    setState('submitting');
    setError(null);
    try {
      const saved = await api.submitDemoBooking({
        restaurantName: form.restaurantName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preferredTime: form.preferredTime.trim(),
        notes: form.notes.trim() || null,
      });
      console.log('[book-demo] booking created', saved);
      setState('success');
    } catch (err) {
      console.error('[book-demo] submission failed', err);
      setError(err.message || 'Network error — please try again.');
      setState('error');
    }
  }

  function backdropClick(e) {
    if (e.target === e.currentTarget && state !== 'submitting') onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={backdropClick} role="dialog" aria-modal="true">
      <div className="modal-card">
        <button
          className="modal-card__close"
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={state === 'submitting'}
        >
          ×
        </button>

        {state === 'success' ? (
          <div className="modal-card__success">
            <h2>🎉 Thanks!</h2>
            <p>We'll be in touch within 24 hours to schedule your demo.</p>
            <button type="button" className="cta" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2>Book a Free Demo</h2>
            <p className="modal-card__sub">
              Tell us about your restaurant and we'll set up a personalized walkthrough.
            </p>

            <label>
              <span>Restaurant name</span>
              <input
                type="text"
                value={form.restaurantName}
                onChange={update('restaurantName')}
                disabled={state === 'submitting'}
                autoFocus
                required
              />
            </label>

            <label>
              <span>Your name</span>
              <input
                type="text"
                value={form.contactName}
                onChange={update('contactName')}
                disabled={state === 'submitting'}
                autoComplete="name"
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                disabled={state === 'submitting'}
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>Phone</span>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={update('phone')}
                disabled={state === 'submitting'}
                autoComplete="tel"
                required
              />
            </label>

            <label>
              <span>Preferred demo time</span>
              <input
                type="text"
                placeholder="e.g. next Tuesday afternoon"
                value={form.preferredTime}
                onChange={update('preferredTime')}
                disabled={state === 'submitting'}
                required
              />
            </label>

            <label>
              <span>Notes <em>(optional)</em></span>
              <textarea
                rows={3}
                placeholder="Anything we should know about your operation"
                value={form.notes}
                onChange={update('notes')}
                disabled={state === 'submitting'}
              />
            </label>

            {error && <div className="login__error">{error}</div>}

            <button type="submit" className="cta" disabled={state === 'submitting'}>
              {state === 'submitting' ? 'Sending…' : 'Request demo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
