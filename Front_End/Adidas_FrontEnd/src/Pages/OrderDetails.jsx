import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(price || 0);

const formatDate = (date) =>
  new Date(date).toLocaleString("en-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusChip = {
  pending: "chip-pending",
  processing: "chip-processing",
  shipped: "chip-shipped",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

export default function OrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/api/orders/${id}`);

      setOrder(response.data.order);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load order details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancelOrder = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setError("");

      await api.patch(`/api/orders/${id}/cancel`);

      await fetchOrder();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to cancel this order."
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading order details...
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold">Order not found</h2>
          <p className="mb-6 text-ink-soft">{error}</p>

          <Link to="/my-orders" className="btn-primary">
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const canCancel = order.status === "pending" && order.paymentStatus !== "paid";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-1 text-sm text-ink-soft">
        <Link to="/" className="hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <Link to="/my-orders" className="hover:text-ink">
          My orders
        </Link>
        <span>/</span>
        <span className="font-medium text-ink">Order details</span>
      </div>

      {/* Header */}
      <div className="glass-strong mb-6 flex flex-col justify-between gap-4 rounded-glass-lg p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h1 className="text-3xl font-bold">Order details</h1>

          <p className="mt-2 break-all text-sm text-ink-soft">
            Order #{order._id}
          </p>

          <p className="mt-1 text-sm text-ink-soft">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>

        <span className={`chip w-fit ${statusChip[order.status] || "chip-unpaid"}`}>
          {order.status}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-2xl bg-danger/10 p-4 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Ordered products */}
          <section className="glass p-6">
            <h2 className="mb-5 text-lg font-bold">Ordered products</h2>

            <div className="divide-y divide-white/60">
              {order.items?.map((item, index) => (
                <div
                  key={item._id || index}
                  className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>

                    <p className="mt-1 text-sm text-ink-soft">
                      {item.size ? `Size: ${item.size} · ` : ""}
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>

                  <p className="whitespace-nowrap font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping address */}
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-bold">Shipping address</h2>

            <div className="space-y-1.5 text-sm text-ink-soft">
              <p className="font-semibold text-ink">
                {order.shippingAddress?.fullName}
              </p>

              <p>{order.shippingAddress?.phone}</p>
              <p>{order.shippingAddress?.street}</p>

              <p>
                {order.shippingAddress?.city}
                {order.shippingAddress?.country
                  ? `, ${order.shippingAddress.country}`
                  : ""}
              </p>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Payment information */}
          <section className="glass p-6">
            <h2 className="mb-5 text-lg font-bold">Payment</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Method</span>

                <span className="text-right font-medium capitalize">
                  {order.paymentMethod?.replaceAll("_", " ")}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">Status</span>

                <span className={`chip ${order.paymentStatus === "paid" ? "chip-paid" : "chip-pending"}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </section>

          {/* Order summary */}
          <section className="glass-strong p-6">
            <h2 className="mb-5 text-lg font-bold">Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">
                  Items ({order.items?.length || 0})
                </span>

                <span>
                  {formatPrice(
                    order.items?.reduce(
                      (total, item) => total + item.price * item.quantity,
                      0
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-white/60 pt-4 text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </section>

          {/* Cancel order */}
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full rounded-full border border-danger/50 bg-danger/10 py-3 text-sm font-bold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel order"}
            </button>
          )}

          <Link to="/my-orders" className="btn-glass w-full">
            Back to my orders
          </Link>
        </div>
      </div>
    </main>
  );
}
