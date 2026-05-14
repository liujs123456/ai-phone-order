import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function MenuView({ onAddItem }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listMenu(query);
        if (active) setItems(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="view">
      <input
        className="menu__search"
        type="search"
        placeholder="Search dishes, ingredients, categories…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <div className="empty">{error}</div>}
      {!error && items.length === 0 && !loading && (
        <div className="empty">No matches.</div>
      )}

      <div className="menu__list">
        {items.map((item) => (
          <div className="menu-card" key={item.id}>
            <div className="menu-card__row">
              <div className="menu-card__name">
                {item.name}
                {item.nameCn && (
                  <span className="menu-card__name-cn">{item.nameCn}</span>
                )}
              </div>
              <div className="menu-card__price">
                ${Number(item.price).toFixed(2)}
              </div>
            </div>
            {item.description && (
              <div className="menu-card__desc">{item.description}</div>
            )}
            <div className="menu-card__meta">
              <div>
                <span className="menu-card__tag">{item.category}</span>
                {item.spicyLevel > 0 && (
                  <span className="menu-card__tag">
                    {'🌶️'.repeat(item.spicyLevel)}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => onAddItem(item)}>
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
