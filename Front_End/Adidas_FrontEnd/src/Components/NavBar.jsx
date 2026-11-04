import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.jsx";
import { useCart } from "../context/useCart.js";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto max-w-[1600px]">
        <div className="glass-nav overflow-hidden">
          <div className="flex h-9 items-center justify-center rounded-t-[1.3rem] bg-gradient-to-r from-[#5b21b6] via-[#1d4ed8] to-[#0e7490] px-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white">
            Free shipping over 1000 EGP
          </div>

          <nav className="relative flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="rounded-full p-2 transition hover:bg-white/60 md:hidden"
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
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

              <Link
                to="/"
                className="font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]"
              >
                <span className="text-gradient">MLocal</span>
                <span className="text-ink">.</span>
              </Link>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <Link to="/products" className="nav-link">
                Shop
              </Link>

              <Link to="/my-orders" className="nav-link">
                My orders
              </Link>

              {user?.role === "admin" && (
                <Link to="/admin" className="nav-link">
                  Admin
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
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

              {user ? (
                <>
                  <span className="hidden text-sm font-medium text-ink-soft lg:inline">
                    Hi, {user.name}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-primary hidden px-4 py-2 text-[11px] sm:inline-flex"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="nav-link hidden sm:inline-flex"
                  >
                    Log in
                  </Link>

                  <Link
                    to="/signup"
                    className="btn-primary hidden px-4 py-2 text-[11px] sm:inline-flex"
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
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-grape to-aqua px-1.5 py-0.5 text-[10px] font-bold text-white shadow-glow">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearch} className="glass mt-3 flex gap-2 p-2">
            <input
              name="search"
              autoFocus
              placeholder="Search products..."
              className="field flex-1 border-0 bg-white/40 focus:bg-white/70"
            />

            <button
              type="submit"
              className="btn-primary px-5 py-2 text-[11px]"
            >
              Search
            </button>
          </form>
        )}

        {menuOpen && (
          <div className="glass mt-3 grid gap-1 p-3 md:hidden">
            <Link
              to="/products"
              className="nav-link w-full"
              onClick={() => setMenuOpen(false)}
            >
              Shop
            </Link>

            <Link
              to="/my-orders"
              className="nav-link w-full"
              onClick={() => setMenuOpen(false)}
            >
              My orders
            </Link>

            <Link
              to="/my-account"
              className="nav-link w-full"
              onClick={() => setMenuOpen(false)}
            >
              My account
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="nav-link w-full"
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}

            <div className="mt-2 flex gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-primary flex-1 py-2 text-[11px]"
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-glass flex-1 py-2 text-[11px]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log in
                  </Link>

                  <Link
                    to="/signup"
                    className="btn-primary flex-1 py-2 text-[11px]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
