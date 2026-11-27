import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

// The first message customers see. Written by us, not by Gemini.
const WELCOME_MESSAGE = {
  role: "model",
  text: 'Hi! I\'m the MLocal assistant. Tell me what you\'re looking for, like "running shoes" or "something for the gym".',
  products: [],
};

// One small clickable product card under a bot message.
function ChatProductCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="flex items-center gap-3 rounded-xl bg-white/60 p-2 transition hover:bg-white/70"
    >
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-12 w-12 flex-none rounded-lg object-cover"
        />
      ) : (
        <div className="h-12 w-12 flex-none rounded-lg bg-white/60" />
      )}

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
        <p className="text-xs text-ink-soft">
          EGP {Number(product.price).toLocaleString("en-US")}
          {!product.inStock && <span className="ml-2 text-danger">Out of stock</span>}
        </p>
      </div>
    </Link>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

    // After every change, scroll down so the newest message is visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

    async function sendMessage(event) {
    event.preventDefault(); // stop the form from reloading the page

    const text = input.trim();
    if (!text || isLoading) return; // nothing typed, or already waiting

    // 1. The EARLIER messages, in the shape the backend expects.
    //    slice(1) skips our welcome message (Gemini never wrote it).
    const history = messages.slice(1).map(({ role, text }) => ({ role, text }));

    // 2. Show the customer's message right away.
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      // 3. Ask the backend. Gemini can be slow, so allow up to 30 seconds.
      const { data } = await api.post(
        "/api/chat",
        { message: text, history },
        { timeout: 30000 },
      );

      // 4. Add the bot's answer and its products.
      setMessages((current) => [
        ...current,
        { role: "model", text: data.reply, products: data.products ?? [] },
      ]);
    } catch (err) {
      // 5. Show the backend's friendly message, or a general one.
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  } 

    return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 sm:right-5 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="glass-strong flex h-[32rem] max-h-[calc(100dvh-7rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <p className="font-display text-base font-bold text-ink">MLocal assistant</p>
              <p className="text-xs text-ink-soft">Ask me about our products</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full px-2 text-lg text-ink-soft transition hover:text-ink"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              // Show only the products the bot actually mentioned.
              const shownProducts = (message.products ?? []).filter((product) =>
                message.text.includes(product.name),
              );

              return (
                <div key={index} className={isUser ? "flex justify-end" : "flex justify-start"}>
                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={
                        isUser
                          ? "whitespace-pre-line rounded-2xl rounded-br-sm bg-cta px-4 py-2 text-sm text-on-cta"
                          : "whitespace-pre-line rounded-2xl rounded-bl-sm bg-white/60 px-4 py-2 text-sm text-ink"
                      }
                    >
                      {message.text}
                    </div>

                    {shownProducts.map((product) => (
                      <ChatProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="animate-pulse rounded-2xl rounded-bl-sm bg-white/60 px-4 py-2 text-sm text-ink-soft">
                  Typing…
                </div>
              </div>
            )}

            {error && <p className="text-center text-xs text-danger">{error}</p>}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/60 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message…"
              maxLength={500}
              className="field py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-primary px-4 py-2"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* The round chat button */}
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cta text-2xl text-on-cta shadow-glow transition hover:scale-105"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}