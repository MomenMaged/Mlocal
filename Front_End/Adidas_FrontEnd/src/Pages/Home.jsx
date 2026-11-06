import api from "../services/api.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Home() {
  const categoryImages = [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
  ];

  const productImages = [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85",
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85",
    "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85",
  ];

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    async function loadStorefront() {
      try {
        setLoading(true);
        setError("");

        const [categoryResponse, productResponse] = await Promise.all([
          api("/api/category"),
          api("/api/products"),
        ]);

        const categoryData = categoryResponse.data;
        const productData = productResponse.data;

        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : categoryData.categories ?? []
        );

        setProducts(
          Array.isArray(productData)
            ? productData
            : productData.products ?? []
        );
      } catch (err) {
        console.error("Failed to load storefront:", err);
        setError(err.message || "Unable to load products.");
      } finally {
        setLoading(false);
      }
    }

    loadStorefront();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading storefront...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Unable to load the store</h1>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-2">
      {/* Hero */}
      <section id="sports" className="px-3 pt-4 sm:px-5">
        <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-[2rem]">
          <img
            src="https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=2000&q=90"
            alt="Athlete training in a sports facility"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/55 to-grape/50" />

          <div className="relative z-10 px-4 py-10 sm:px-10 sm:py-16 lg:py-24">
            <div className="glass-strong max-w-2xl rounded-[2rem] p-7 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-grape">
                New season. New goals.
              </p>

              <h1 className="mt-4 font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                IMPOSSIBLE
                <br />
                <span className="text-gradient">IS NOTHING.</span>
              </h1>

              <p className="mt-5 max-w-md text-base leading-7 text-ink-soft">
                Gear up, push further, and find your next favourite piece of
                sportswear.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#products" className="btn-primary">
                  Shop now →
                </a>

                <Link to="/products" className="btn-glass">
                  Browse all
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Free shipping over 1000 EGP",
                "Easy 14-day returns",
                "Secure checkout",
              ].map((perk) => (
                <div
                  key={perk}
                  className="glass-subtle flex items-center gap-2 px-4 py-3 text-sm font-semibold"
                >
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-grape to-aqua" />
                  {perk}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category cards */}
      <section className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
              Find your style
            </p>

            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Shop by category
            </h2>
          </div>

          <Link
            to="/products"
            className="hidden shrink-0 text-sm font-bold text-ink underline decoration-grape decoration-2 underline-offset-4 sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories
            .slice(0, showAllCategories ? categories.length : 5)
            .map((category, index) => (
              <Link
                key={category._id || category.id || category.name}
                to={
                  category._id
                    ? `/products?category=${category._id}`
                    : "/products"
                }
                className="group relative h-[340px] overflow-hidden rounded-[1.75rem] border border-white/60 shadow-glass sm:h-[400px]"
              >
                <img
                  src={
                    category.image ||
                    categoryImages[index % categoryImages.length]
                  }
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="glass-strong rounded-2xl p-4">
                    <h3 className="text-xl font-bold">{category.name}</h3>

                    <p className="mt-1 text-sm text-ink-soft">
                      Explore the {category.name} collection.
                    </p>

                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-grape">
                      Explore →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>

        {categories.length > 5 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => setShowAllCategories((prev) => !prev)}
              className="btn-glass"
            >
              {showAllCategories
                ? "Show less ↑"
                : "More categories ↓"}
            </button>
          </div>
        )}
      </section>

      {/* Featured products */}
      <section
        id="products"
        className="mx-auto max-w-[1600px] scroll-mt-28 px-4 pb-12 sm:px-6 sm:pb-16"
      >
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
              Picked for you
            </p>

            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Trending now
            </h2>
          </div>

          <Link
            to="/products"
            className="shrink-0 text-sm font-bold text-ink underline decoration-grape decoration-2 underline-offset-4"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product, index) => (
            <Link
              key={product._id || product.id}
              to={`/products/${product._id || product.id}`}
              className="glass card-hover group block overflow-hidden"
            >
              <div className="relative overflow-hidden">
                <img
                  src={
                    product.images?.[0] ||
                    product.image ||
                    productImages[index % productImages.length]
                  }
                  alt={product.name}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <span
                  className={`chip absolute left-3 top-3 ${
                    Array.isArray(product.sizes) &&
                    product.sizes.some((entry) => entry.quantity > 0)
                      ? "chip-delivered"
                      : "chip-cancelled"
                  }`}
                >
                  {Array.isArray(product.sizes) &&
                  product.sizes.some((entry) => entry.quantity > 0)
                    ? "In stock"
                    : "Out of stock"}
                </span>
              </div>

              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  {product.categories?.name ||
                    product.category?.name ||
                    "Sportswear"}
                </p>

                <h3 className="mt-1.5 line-clamp-1 font-display text-base font-bold">
                  {product.name}
                </h3>

                <p className="mt-2 text-sm font-bold">
                  EGP {Number(product.price).toLocaleString("en-US")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brand message */}
      <section className="px-4 pb-4 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="glass-strong relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:py-20">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-grape/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-aqua/25 blur-3xl" />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-grape">
                Made for movement
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
                Your next move starts here.
              </h2>

              <Link to="/products" className="btn-primary mt-8">
                Explore collection
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
