import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';
import { api } from '../api/client.js';

const GREETING = {
  role: 'bot',
  content:
    "Hi! Thanks for calling. I'm your AI order assistant — tell me what you're craving and I'll find it on the menu.",
};

export default function ChatView({ onAddItem }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setSending(true);
    try {
      const wire = next
        .filter((m) => m.role === 'user' || m.role === 'bot')
        .map((m) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content,
        }));
      const res = await api.chat(wire);
      setMessages((cur) => [
        ...cur,
        {
          role: 'bot',
          content: res.reply,
          suggestedItems: res.suggestedItems ?? [],
        },
      ]);
    } catch (err) {
      setMessages((cur) => [
        ...cur,
        {
          role: 'system',
          content: `Couldn't reach the assistant: ${err.message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <div className="view chat__messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} onAddItem={onAddItem} />
        ))}
        {sending && (
          <div className="bubble bubble--bot">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          value={input}
          placeholder="Tell me what you'd like…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </>
  );
}
