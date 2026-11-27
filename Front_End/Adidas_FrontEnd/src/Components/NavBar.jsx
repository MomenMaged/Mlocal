import { useState , useEffect, useRef} from "react";
import { Link, useNavigate , useLocation} from "react-router-dom";
import { useAuth } from "../context/useAuth.jsx";
import { useCart } from "../context/useCart.js";
import MobileMenu from "./MobileMenu.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import useCategories from "../hooks/useCategories.js";

// Titles shown beside "Shop". Each one is matched to a real category by name,
// so no database IDs are hard-coded. A title with no matching category is skipped.
const NAV_TITLES = ["Men", "Women", "Kids"];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const headerRef = useRef(null);
const location = useLocation();
  const categories = useCategories();

  // Which link is "the page you are on" (gets the champagne underline)
  const onProducts = location.pathname === "/products";
  const activeCategory = onProducts
    ? new URLSearchParams(location.search).get("category")
    : null;

  const titleLinks = NAV_TITLES.map((title) =>
    categories.find(
      (category) => category.name?.trim().toLowerCase() === title.toLowerCase(),
    ),
  ).filter(Boolean);

useEffect(() => {
  setMenuOpen(false);
  setSearchOpen(false);
}, [location.pathname]);

useEffect(() => {
  if (!menuOpen && !searchOpen) return undefined;

  function handleClickOutside(event) {
    if (headerRef.current && !headerRef.current.contains(event.target)) {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }      

  document.addEventListener("pointerdown", handleClickOutside);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("pointerdown", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  };
}, [menuOpen, searchOpen]);

  // Stop the page behind the full-screen menu from scrolling while it is open
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate("/", { replace: true });
  }

  function handleSearch(event) {
    event.preventDefault();

    const query = new FormData(event.currentTarget).get("search");

    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/products?search=${encodeURIComponent(query ?? "")}`);
  }

  return (
    <>
      {/* Free-shipping note: small champagne text above the pill. It is not sticky,
          so it scrolls away instead of floating over the page content. */}
      <p className="px-4 pb-1.5 pt-[max(0.6rem,env(safe-area-inset-top))] text-center text-[10px] font-semibold uppercase tracking-[0.26em] text-grape">
        Free shipping over 1000 EGP
      </p>

      <header
        ref={headerRef}
        className="sticky top-[env(safe-area-inset-top)] z-60 px-3 pt-1.5 sm:px-5"
      >
        <div className="mx-auto max-w-[1100px]">
          {/* Three columns: left | logo | right. Both side columns are 1fr (equal),
              so the logo always sits exactly in the centre. */}
          <nav className="glass-nav grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 sm:px-3">
            {/* Left: menu button on phones, page links on tablets/desktops */}
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                className="rounded-full p-2 transition hover:bg-white/60 md:hidden"
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {menuOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" />
                  ) : (
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  )}
                </svg>
              </button>

              <div className="hidden items-center gap-1 md:flex">
                <Link
                  to="/products"
                  className="nav-link"
                  aria-current={onProducts && !activeCategory ? "page" : undefined}
                >
                  Shop
                </Link>

                {titleLinks.map((category) => (
                  <Link
                    key={category._id}
                    to={`/products?category=${category._id}`}
                    className="nav-link"
                    aria-current={activeCategory === category._id ? "page" : undefined}
                  >
                    {category.name}
                  </Link>
                ))}

                {/* Only on wide screens, so Shop · Men · Women · Kids always fit.
                    On smaller screens these stay reachable from the account icon and the footer. */}
                {user && (
                  <Link
                    to="/my-orders"
                    className="nav-link hidden xl:inline-flex"
                    aria-current={location.pathname === "/my-orders" ? "page" : undefined}
                  >
                    My orders
                  </Link>
                )}

                {user?.role === "admin" && (
                  <Link to="/admin" className="nav-link hidden xl:inline-flex">
                    Admin
                  </Link>
                )}
              </div>
            </div>

            {/* Centre: logo */}
            <Link
              to="/"
              className="font-display text-2xl font-bold tracking-tight"
            >
              <span className="text-gradient">MLocal</span>
              <span className="text-ink">.</span>
            </Link>

            {/* Right: actions. Less important items hide on smaller screens
                (they are all in the phone menu), so the logo never gets pushed. */}
            <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
              <ThemeToggle className="hidden sm:grid" />

              <button
                type="button"
                aria-label="Search products"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((open) => !open)}
                className="rounded-full p-2 transition hover:bg-white/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 5 5" />
                </svg>
              </button>

              <Link
                to="/my-account"
                aria-label="Account"
                className="hidden rounded-full p-2 transition hover:bg-white/60 sm:block"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                </svg>
              </Link>

              {/* thin divider between icons and account buttons */}
              <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-white/60 md:block" />

              {user ? (
                <>
                  <span className="hidden max-w-32 truncate text-sm font-medium text-ink-soft lg:inline-block">
                    Hi, {user.name}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-primary hidden px-4 py-2 text-xs md:inline-flex"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link hidden lg:inline-flex">
                    Log in
                  </Link>

                  <Link
                    to="/signup"
                    className="btn-primary hidden px-4 py-2 text-xs md:inline-flex"
                  >
                    Sign up
                  </Link>
                </>
              )}

              <Link
                to="/cart"
                className="relative rounded-full p-2 transition hover:bg-white/60"
                aria-label="Cart"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 3h2l2.5 12.5a2 2 0 0 0 2 1.5h8.8a2 2 0 0 0 2-1.6L22 8H6" />
                  <circle cx="10" cy="21" r="1" />
                  <circle cx="18" cy="21" r="1" />
                </svg>

                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-cta px-1.5 py-0.5 text-[10px] font-bold text-on-cta shadow-glow">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>

          {searchOpen && (
            <form onSubmit={handleSearch} className="glass pop-in mt-3 flex gap-2 p-2">
              <input
                name="search"
                autoFocus
                placeholder="Search products..."
                className="field flex-1 border-0 bg-white/40 "
              />

              <button
                type="submit"
                className="btn-primary px-5 py-2 text-[11px]"
              >
                Search
              </button>
            </form>
          )}

          <MobileMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            user={user}
            itemCount={itemCount}
            onLogout={handleLogout}
            onSearch={handleSearch}
          />
        </div>
      </header>
    </>
  );
}

export default Navbar;
