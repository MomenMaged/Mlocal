import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import { useDebounce } from "../hooks/useDeBounce.js";

const productImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85",
];

// A product is only purchasable once it has at least one size in stock.
// Legacy products without sizes need to be edited in the admin panel first.
function isInStock(product) {
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes.some((entry) => entry.quantity > 0);
  }

  return false;
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const selectedCategory = searchParams.get("category") ?? "all";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [pagination, setPagination] = useState(null);
  const [sortPrice, setSortPrice] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // The URL is the source of truth for search and category, so the navbar,
  // category tiles, and browser back/forward all stay in sync.
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);

    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await api.get("/api/category");

        setCategories(
          Array.isArray(response.data)
            ? response.data
            : response.data.categories || []
        );
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/products", {
          params: {
            search: debouncedSearch.trim() || undefined,
            page,
            limit,
            sortPrice: sortPrice || undefined,
            filters:
              selectedCategory !== "all"
                ? `Category:${selectedCategory}`
                : undefined,
          },
        });

        setProducts(response.data.products);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Failed to load products:", err);
        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [page, limit, debouncedSearch, sortPrice, selectedCategory]);

  function clearFilters() {
    setSortPrice("");
    setPage(1);
    setSearchParams({});
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading products...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <p className="text-lg font-bold">{error}</p>

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
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Page heading */}
      <section className="glass-strong rounded-glass-lg px-6 py-10 sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
          Find your next favourite
        </p>

        <h1 className="mt-3 text-4xl font-bold sm:text-6xl">
          All products
        </h1>

        <p className="mt-4 max-w-xl text-ink-soft">
          Explore our sportswear, footwear, and accessories.
        </p>
      </section>

      {/* Search and filters */}
      <div className="glass mt-6 flex flex-col gap-3 p-3 md:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            updateParam("search", e.target.value);
            setPage(1);
          }}
          placeholder="Search products..."
          className="field min-w-0 flex-1 border-0 bg-white/40 focus:bg-white/70"
        />

        <select
          value={selectedCategory}
          onChange={(e) => {
            updateParam("category", e.target.value);
            setPage(1);
          }}
          className="field md:w-56"
        >
          <option value="all">All categories</option>

          {categories.map((category) => (
            <option
              key={category._id || category.id}
              value={category._id || category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={sortPrice}
          onChange={(e) => {
            setSortPrice(e.target.value);
            setPage(1);
          }}
          className="field md:w-52"
        >
          <option value="">Default order</option>
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {/* Results count */}
      <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">
          {pagination?.totalProducts ?? products.length} products found
        </p>

        <Link
          to="/"
          className="text-sm font-bold text-ink underline decoration-grape decoration-2 underline-offset-4"
        >
          Back to home
        </Link>
      </div>

      {/* Products grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((product, index) => (
            <Link
              key={product._id || product.id}
              to={`/products/${product._id || product.id}`}
              className="glass card-hover group block overflow-hidden"
            >
              <div className="relative overflow-hidden">
                <img
                  src={
                    product.image ||
                    productImages[index % productImages.length]
                  }
                  alt={product.name}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <span
                  className={`chip absolute left-3 top-3 ${
                    isInStock(product) ? "chip-delivered" : "chip-cancelled"
                  }`}
                >
                  {isInStock(product) ? "In stock" : "Out of stock"}
                </span>
              </div>

              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  {product.categories?.name ||
                    product.category?.name ||
                    "Sportswear"}
                </p>

                <h2 className="mt-1.5 line-clamp-1 font-display text-sm font-bold sm:text-base">
                  {product.name}
                </h2>

                <p className="mt-2 text-sm font-bold sm:text-base">
                  EGP {Number(product.price).toLocaleString("en-US")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-strong rounded-glass-lg px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">No products found</h2>

          <p className="mt-2 text-ink-soft">
            Try another search or select a different category.
          </p>

          <button onClick={clearFilters} className="btn-primary mt-6">
            Clear filters
          </button>
        </div>
      )}

      {pagination && pagination.totalPages > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            disabled={!pagination.hasPreviousPage}
            onClick={() => setPage((prev) => prev - 1)}
            className="btn-glass"
          >
            Previous
          </button>

          <span className="text-sm font-semibold text-ink-soft">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>

          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((prev) => prev + 1)}
            className="btn-glass"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

export default Products;
