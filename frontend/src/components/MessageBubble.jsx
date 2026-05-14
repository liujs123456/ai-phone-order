export default function MessageBubble({ message, onAddItem }) {
  const cls = `bubble bubble--${message.role}`;
  return (
    <div className={cls}>
      <div>{message.content}</div>
      {message.suggestedItems?.length > 0 && (
        <div className="bubble__suggestions">
          {message.suggestedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAddItem?.(item)}
            >
              + {item.name} · ${Number(item.price).toFixed(2)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
