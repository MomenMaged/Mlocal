import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const filters = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(amount) {
  return `EGP ${Number(amount || 0).toLocaleString("en-EG")}`;
}

const statusChip = {
  pending: "chip-pending",
  processing: "chip-processing",
  shipped: "chip-shipped",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

function getPaymentLabel(order) {
  if (order.paymentMethod === "cash_on_delivery") {
    return "Cash on delivery";
  }

  return order.paymentStatus === "paid" ? "Paid" : "Unpaid";
}

function getPaymentChip(order) {
  if (order.paymentMethod === "cash_on_delivery") {
    return "chip-processing";
  }

  return order.paymentStatus === "paid" ? "chip-paid" : "chip-pending";
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/orders");

        if (!cancelled) {
          setOrders(response.data.orders || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your orders. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === activeFilter);
  }, [orders, activeFilter]);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading your orders...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <p role="alert" className="text-danger">
            {error}
          </p>

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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page heading */}
      <div className="mb-8 glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          My orders
        </h1>

        <p className="mt-2 text-ink-soft">
          Track your orders and view your purchase history.
        </p>
      </div>

      {/* Order filters */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              activeFilter === filter
                ? "bg-gradient-to-r from-grape to-sky text-white shadow-glow"
                : "border border-white/70 bg-white/50 text-ink-soft hover:bg-white/80 hover:text-ink"
            }`}
          >
            {filter === "all" ? "All orders" : filter}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredOrders.length === 0 ? (
        <div className="glass-strong rounded-glass-lg px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">
            {orders.length === 0
              ? "You haven't placed any orders yet"
              : "No orders found"}
          </h2>

          <p className="mt-3 text-ink-soft">
            {orders.length === 0
              ? "Your orders will appear here once you make a purchase."
              : "There are no orders with this status."}
          </p>

          <Link to="/products" className="btn-primary mt-7">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const totalItems = order.items.reduce(
              (total, item) => total + item.quantity,
              0
            );

            return (
              <article key={order._id} className="glass p-5 md:p-7">
                {/* Order header */}
                <div className="flex flex-col justify-between gap-4 border-b border-white/60 pb-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                      Order number
                    </p>

                    <h2 className="mt-1 font-display text-lg font-bold">
                      #{order._id.slice(-8).toUpperCase()}
                    </h2>

                    <p className="mt-1 text-sm text-ink-soft">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`chip ${
                        statusChip[order.status] || "chip-unpaid"
                      }`}
                    >
                      {order.status}
                    </span>

                    <span className={`chip ${getPaymentChip(order)}`}>
                      {getPaymentLabel(order)}
                    </span>
                  </div>
                </div>

                {/* Order items */}
                <div className="space-y-3 py-5">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.product}-${index}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>

                        <p className="mt-1 text-sm text-ink-soft">
                          {item.size ? `Size: ${item.size} · ` : ""}
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order footer */}
                <div className="flex flex-col justify-between gap-4 border-t border-white/60 pt-5 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-ink-soft">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </p>

                    <p className="text-lg font-bold">
                      Total: {formatPrice(order.totalAmount)}
                    </p>

                    <p className="text-xs capitalize text-ink-soft">
                      Payment method:{" "}
                      {order.paymentMethod.replaceAll("_", " ")}
                    </p>
                  </div>

                  <Link
                    to={`/my-orders/${order._id}`}
                    className="btn-glass"
                  >
                    View order
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
