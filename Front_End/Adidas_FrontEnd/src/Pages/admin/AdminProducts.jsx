import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";
import { useDebounce } from "../../hooks/useDeBounce.js";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortPrice, setSortPrice] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const limit = 10;

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await api.get("/api/category");

        const data = response.data.categories || response.data;
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }

    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit,
        };

        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        if (selectedCategory !== "all") {
          params.filters = `Category:${selectedCategory}`;
        }

        if (sortPrice) {
          params.sortPrice = sortPrice;
        }

        const response = await api.get("/api/products", {
          params,
          signal: controller.signal,
        });

        const data = response.data;

        setProducts(data.products || []);
        setPagination(data.pagination || {});
      } catch (error) {
        if (error.name !== "CanceledError" && error.name !== "AbortError") {
          console.error("Failed to fetch products:", error);
          setError("Failed to load products. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => controller.abort();
  }, [page, limit, debouncedSearch, selectedCategory, sortPrice, refresh]);

  // Delete product
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/products/${id}`);

      setRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Delete product error:", error);
      alert(error.response?.data?.message || "Failed to delete product.");
    }
  }

  // Stock status
  function getStockStatus(quantity) {
    if (quantity === 0) {
      return { label: "Out of stock", className: "chip-cancelled" };
    }

    if (quantity <= 5) {
      return { label: "Low stock", className: "chip-pending" };
    }

    return { label: "In stock", className: "chip-delivered" };
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleCategoryChange(value) {
    setSelectedCategory(value);
    setPage(1);
  }

  function handleSortChange(value) {
    setSortPrice(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
              Catalogue
            </p>

            <h1 className="mt-2 text-3xl font-bold">Products</h1>

            <p className="mt-2 text-sm text-ink-soft">
              Manage your store products and per-size stock.
            </p>
          </div>

          <Link
            to="/admin/products/new"
            className="btn-primary w-fit px-5 py-2.5"
          >
            + Add product
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="glass flex flex-col gap-3 p-4 md:flex-row">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="field min-w-0 flex-1 border-0 bg-white/40 focus:bg-white/70"
        />

        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="field md:w-56"
        >
          <option value="all">All categories</option>

          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={sortPrice}
          onChange={(e) => handleSortChange(e.target.value)}
          className="field md:w-52"
        >
          <option value="">Sort by price</option>
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{error}</p>

          <button
            onClick={() => setRefresh((prev) => prev + 1)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/40 text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Quantity</th>
                <th className="px-6 py-4 font-semibold">Stock status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/50">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-ink-soft">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-ink-soft">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const hasSizes =
                    Array.isArray(product.sizes) && product.sizes.length > 0;
                  const totalStock = hasSizes
                    ? product.sizes.reduce(
                        (sum, entry) => sum + entry.quantity,
                        0
                      )
                    : 0;
                  const stock = getStockStatus(totalStock);

                  return (
                    <tr
                      key={product._id}
                      className="transition hover:bg-white/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded-xl bg-white/40 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 text-xs text-ink-soft">
                              No image
                            </div>
                          )}

                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-ink-soft">
                        {product.categories?.name || "Uncategorized"}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        EGP {Number(product.price).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-ink-soft">
                        {hasSizes ? (
                          <div className="space-y-1">
                            <p className="font-medium text-ink">
                              {totalStock} total
                            </p>

                            <p className="text-xs text-ink-soft">
                              {product.sizes
                                .map(
                                  (entry) =>
                                    `${entry.size}: ${entry.quantity}`
                                )
                                .join(" · ")}
                            </p>
                          </div>
                        ) : (
                          <span className="font-medium text-amber-700">
                            ⚠ No sizes
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`chip ${stock.className}`}>
                          {stock.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="font-semibold text-grape transition hover:text-sky"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() => handleDelete(product._id)}
                            className="font-semibold text-danger transition hover:text-danger/70"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Refresh indicator */}
        {loading && products.length > 0 && (
          <p className="px-6 py-2 text-xs text-ink-soft">
            Updating products...
          </p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-ink-soft">
          Page {page}
          {pagination.totalPages ? ` of ${pagination.totalPages}` : ""}
        </p>

        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => prev - 1)}
            className="btn-glass px-4 py-2 text-[11px]"
          >
            Previous
          </button>

          <button
            disabled={
              loading ||
              (pagination.totalPages
                ? page >= pagination.totalPages
                : products.length < limit)
            }
            onClick={() => setPage((prev) => prev + 1)}
            className="btn-glass px-4 py-2 text-[11px]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
