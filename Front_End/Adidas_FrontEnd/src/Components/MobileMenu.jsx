import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useCategories from "../hooks/useCategories.js";
import ThemeToggle from "./ThemeToggle.jsx";

const pexels = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop`;
const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=300&h=300&q=70`;

// Photo for each category tile (used when the category has no image of its own)
const categoryPhotos = {
  shoes: pexels(20082767),
  slides: pexels(18186215),
  clothing: pexels(2439863),
  "t-shirts": pexels(11726363),
  hoodies: pexels(48013),
  sweatshirts: unsplash("1578587018452-892bacefd3f2"),
  jackets: pexels(15024013),
  pants: pexels(17400728),
  shorts: pexels(4719921),
  socks: pexels(9594142),
  bags: pexels(3779632),
  caps: unsplash("1588850561407-ed78c282e89b"),
  basketball: pexels(1192043),
  tennis: pexels(2996278),
  kids: pexels(10657969),
  men: pexels(2096476),
  women: pexels(6049164),
};

const PROMO_IMAGE =
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=900&q=75";

// Small outline icons (24×24, stroke = currentColor)
const icons = {
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  cart: (
    <>
      <path d="M3 3h2l2.5 12.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6" />
      <circle cx="10" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export default function MobileMenu({ open, onClose, user, itemCount, onLogout, onSearch }) {
  const closeButtonRef = useRef(null);
  // Shared with the navbar: one request per page load (see hooks/useCategories.js)
  const categories = useCategories();

  // Move keyboard focus into the menu when it opens (accessibility)
  useEffect(() => {
    if (open) closeButtonRef.current?.focus({ preventScroll: true });
  }, [open]);

  const quickActions = [
    { to: "/products", icon: "bag", label: "Shop all" },
    { to: "/cart", icon: "cart", label: "Cart", badge: itemCount },
    { to: "/my-orders", icon: "box", label: "Orders" },
    { to: "/my-account", icon: "user", label: "Account" },
  ];

  // Each block gets an index so the CSS can stagger them in (--i)
  let block = 0;
  const step = () => ({ "--i": block++ });

  return (
    <div
      id="mobile-menu"
      className="mobile-sheet md:hidden"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
      inert={!open}
    >
      {/* Top bar */}
      <div
        className="menu-item flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]"
        style={step()}
      >
        <Link to="/" onClick={onClose} className="font-display text-2xl font-bold tracking-tight">
          <span className="text-gradient">MLocal</span>
          <span className="text-ink">.</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle className="btn-glass h-10 w-10 p-0" />

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="btn-glass h-10 w-10 p-0"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        {/* Search */}
        <form onSubmit={onSearch} role="search" className="menu-item px-4" style={step()}>
          <label className="menu-search">
            <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-ink-soft" />
            <input
              name="search"
              type="search"
              enterKeyHint="search"
              placeholder="Search shoes, hoodies, bags…"
              className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-soft/70"
            />
          </label>
        </form>

        {/* Promo banner */}
        <div className="menu-item px-4" style={step()}>
          <Link to="/products" onClick={onClose} className="menu-promo">
            <img src={PROMO_IMAGE} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/30 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-4 text-white">
              <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
                New season
              </span>
              <p className="mt-1.5 font-display text-xl font-bold leading-tight">
                Impossible
                <br />
                is nothing.
              </p>
              <span className="glass-pill mt-2.5 w-fit">Shop now →</span>
            </div>
          </Link>
        </div>

        {/* Categories: horizontal swipe row */}
        <section className="menu-item" style={step()}>
          <div className="mb-3 flex items-end justify-between px-5">
            <h2 className="text-lg font-semibold">Shop by category</h2>
            <Link to="/products" onClick={onClose} className="text-sm font-medium text-grape">
              See all
            </Link>
          </div>

          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
            {categories.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="menu-cat animate-pulse bg-white/10" />
                ))
              : categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/products?category=${category._id}`}
                    onClick={onClose}
                    className="menu-cat snap-start"
                  >
                    {(category.image || categoryPhotos[category.name?.toLowerCase()]) && (
                      <img
                        src={category.image || categoryPhotos[category.name.toLowerCase()]}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                    <span className="menu-cat-label">{category.name}</span>
                  </Link>
                ))}
          </div>
        </section>

        {/* Quick actions */}
        <div className="menu-item grid grid-cols-4 gap-2.5 px-4" style={step()}>
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} onClick={onClose} className="menu-tile">
              <span className="relative">
                <Icon name={action.icon} className="h-6 w-6" />
                {action.badge > 0 && <span className="menu-badge">{action.badge}</span>}
              </span>
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="menu-item px-4" style={step()}>
            <Link to="/admin" onClick={onClose} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
              <Icon name="shield" className="h-5 w-5 text-danger" />
              <span className="flex-1 text-sm font-semibold">Admin dashboard</span>
              <span className="text-ink-soft">→</span>
            </Link>
          </div>
        )}

        {/* Perks */}
        <div className="menu-item flex gap-2 px-4 text-xs text-ink-soft" style={step()}>
          <span className="glass-subtle flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5">
            <Icon name="truck" className="h-4 w-4 shrink-0 text-grape" /> Free shipping
          </span>
          <span className="glass-subtle flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5">
            <Icon name="refresh" className="h-4 w-4 shrink-0 text-grape" /> 14-day returns
          </span>
        </div>

        {/* Account bar */}
        <div className="menu-item mt-auto px-4" style={step()}>
          {user ? (
            <div className="glass flex items-center gap-3 rounded-full p-2 pr-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cta font-semibold text-on-cta">
                {user.name?.trim()?.[0]?.toUpperCase() || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block truncate text-xs text-ink-soft">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                className="btn-glass h-10 w-10 shrink-0 p-0 text-danger"
              >
                <Icon name="logout" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <Link to="/login" onClick={onClose} className="btn-glass flex-1">
                Log in
              </Link>
              <Link to="/signup" onClick={onClose} className="btn-primary flex-1">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
