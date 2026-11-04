import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth.jsx";

const navigation = [
  { name: "Dashboard", path: "/admin", icon: "▦", end: true },
  { name: "Products", path: "/admin/products", icon: "□" },
  { name: "Orders", path: "/admin/orders", icon: "▤" },
  { name: "Users", path: "/admin/users", icon: "♙" },
];

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-gradient-to-r from-grape to-sky text-white shadow-glow"
        : "text-ink-soft hover:bg-white/60 hover:text-ink"
    }`;

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="glass sticky top-3 z-50 mx-3 flex items-center justify-between px-4 py-3 lg:hidden">
        <span className="font-display text-lg font-bold tracking-tight">
          <span className="text-gradient">MLocal</span>{" "}
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Admin
          </span>
        </span>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-full p-2 text-xl transition hover:bg-white/60"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`glass-strong fixed inset-y-3 left-3 z-40 flex w-64 flex-col rounded-glass-lg transition-transform duration-300 lg:sticky lg:top-3 lg:ml-3 lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-[110%]"
          }`}
        >
          <div className="border-b border-white/60 px-6 py-7">
            <h1 className="font-display text-xl font-bold tracking-tight">
              <span className="text-gradient">MLocal</span>
              <span>.</span>
            </h1>

            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-soft">
              Admin panel
            </p>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
            <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-soft">
              Management
            </p>

            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={linkClasses}
                onClick={() => setMenuOpen(false)}
              >
                <span className="w-5 text-lg">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-1.5 border-t border-white/60 p-3">
            <NavLink
              to="/"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-white/60 hover:text-ink"
              onClick={() => setMenuOpen(false)}
            >
              <span className="w-5 text-lg">←</span>
              Back to store
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <span className="w-5 text-lg">↪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {menuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="min-h-full p-3 sm:p-5 lg:pl-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
