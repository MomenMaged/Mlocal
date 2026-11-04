import { Link } from "react-router-dom";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/products" },
      { label: "Your bag", to: "/cart" },
      { label: "My orders", to: "/my-orders" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", to: "/my-account" },
      { label: "Security", to: "/my-account/security" },
      { label: "Sign in", to: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="px-3 pb-6 pt-10 sm:px-5">
      <div className="glass mx-auto max-w-[1600px] rounded-glass-lg px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="font-display text-2xl font-bold tracking-tight">
              <span className="text-gradient">MLocal</span>
              <span>.</span>
            </Link>

            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Performance sportswear for every move. Built for the city, the
              track, and everything in between.
            </p>
          </div>

          <div className="flex flex-wrap gap-10">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
                  {column.title}
                </p>

                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm font-medium text-ink transition hover:text-grape"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/60 pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MLocal. Demo storefront.</p>
          <p>Made with a little liquid glass.</p>
        </div>
      </div>
    </footer>
  );
}
