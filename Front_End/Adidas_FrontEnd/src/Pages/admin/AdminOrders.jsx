import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const statusChip = {
  pending: "chip-pending",
  confirmed: "chip-processing",
  processing: "chip-processing",
  shipped: "chip-shipped",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

const paymentChip = {
  unpaid: "chip-pending",
  paid: "chip-paid",
  failed: "chip-failed",
  refunded: "chip-refunded",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalOrders: 0,
    totalPages: 0,
    currentPage: 1,
    pageLimit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch orders whenever filters or page change
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/orders/admin", {
          params: {
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            status: status || undefined,
            paymentStatus: paymentStatus || undefined,
          },
        });

        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Could not retrieve orders.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [page, status, paymentStatus, debouncedSearch]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2,
    }).format(price);
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setDebouncedSearch("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
          Fulfilment
        </p>

        <h1 className="mt-2 text-3xl font-bold">Orders</h1>

        <p className="mt-2 text-sm text-ink-soft">
          Manage and track all customer orders.
        </p>
      </header>

      {/* Total orders */}
      <div className="glass flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-ink-soft">Total orders</p>

          <p className="mt-2 font-display text-3xl font-bold">
            {pagination.totalOrders}
          </p>
        </div>

        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-grape/15 to-aqua/15 text-2xl">
          🛒
        </span>
      </div>

      {/* Search and filters */}
      <div className="glass p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field border-0 bg-white/40 focus:bg-white/70"
          />

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="">All order statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="">All payment statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <button
          onClick={resetFilters}
          className="mt-4 text-sm font-semibold text-grape underline underline-offset-4 transition hover:text-sky"
        >
          Clear filters
        </button>
      </div>

      {/* Orders table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-ink-soft">Loading orders...</div>
        ) : error ? (
          <div className="p-10 text-center text-danger">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-ink-soft">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/40 text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/50">
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="transition hover:bg-white/50"
                  >
                    <td className="px-6 py-4 font-medium">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {order.user?.name || "Deleted user"}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {order.user?.email || "N/A"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-ink-soft">
                      {formatDate(order.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 font-medium">
                      {formatPrice(order.totalAmount)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`chip ${
                          paymentChip[order.paymentStatus] || "chip-unpaid"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`chip ${
                          statusChip[order.status] || "chip-unpaid"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="font-semibold text-grape transition hover:text-sky"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="btn-glass px-4 py-2 text-[11px]"
            >
              Previous
            </button>

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="btn-glass px-4 py-2 text-[11px]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
