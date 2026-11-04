import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";

const allowedTransitions = {
  pending: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  confirmed: [],
  delivered: [],
  cancelled: [],
};

const statusChip = {
  pending: "chip-pending",
  confirmed: "chip-processing",
  processing: "chip-processing",
  shipped: "chip-shipped",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

export default function AdminOrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/api/orders/admin/${id}`);

        setOrder(response.data.order);
        setNewStatus("");
      } catch (err) {
        setError(err.response?.data?.message || "Could not retrieve order.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id]);

  async function handleUpdateStatus() {
    if (!newStatus) return;

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await api.patch(`/api/orders/status/${id}`, {
        status: newStatus,
      });

      setOrder(response.data.order);
      setNewStatus("");
      setSuccess("Order status updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update order status.");
    } finally {
      setUpdating(false);
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2,
    }).format(price);
  }

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <p className="text-danger">{error}</p>

          <Link to="/admin/orders" className="btn-primary mt-6">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const transitions = allowedTransitions[order.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-strong flex flex-wrap items-center justify-between gap-4 rounded-glass-lg px-6 py-8 sm:px-8">
        <div>
          <Link
            to="/admin/orders"
            className="text-sm font-semibold text-ink-soft transition hover:text-grape"
          >
            ← Back to orders
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Order #{order._id.slice(-8).toUpperCase()}
          </h1>

          <p className="mt-1 text-sm text-ink-soft">
            Created on {new Date(order.createdAt).toLocaleString("en-GB")}
          </p>
        </div>

        <span
          className={`chip text-xs ${
            statusChip[order.status] || "chip-unpaid"
          }`}
        >
          {order.status}
        </span>
      </header>

      {/* Messages */}
      {error && (
        <div className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-mint/15 p-4 text-sm text-mint">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Products */}
          <section className="glass p-6">
            <h2 className="mb-5 text-lg font-bold">Ordered products</h2>

            <div className="divide-y divide-white/50">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>

                    <p className="mt-1 text-sm text-ink-soft">
                      {item.size ? `Size: ${item.size} · ` : ""}
                      Quantity: {item.quantity}
                    </p>

                    <p className="text-sm text-ink-soft">
                      Unit price: {formatPrice(item.price)}
                    </p>
                  </div>

                  <p className="whitespace-nowrap font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-between border-t border-white/60 pt-5">
              <span className="font-semibold">Total</span>
              <span className="font-display text-lg font-bold">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </section>

          {/* Shipping address */}
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-bold">Shipping address</h2>

            <div className="space-y-2 text-sm text-ink-soft">
              <p>
                <span className="font-medium text-ink">Full name:</span>{" "}
                {order.shippingAddress?.fullName}
              </p>

              <p>
                <span className="font-medium text-ink">Phone:</span>{" "}
                {order.shippingAddress?.phone}
              </p>

              <p>
                <span className="font-medium text-ink">Street:</span>{" "}
                {order.shippingAddress?.street}
              </p>

              <p>
                <span className="font-medium text-ink">City:</span>{" "}
                {order.shippingAddress?.city}
              </p>

              <p>
                <span className="font-medium text-ink">Country:</span>{" "}
                {order.shippingAddress?.country}
              </p>

              {order.shippingAddress?.postalCode && (
                <p>
                  <span className="font-medium text-ink">Postal code:</span>{" "}
                  {order.shippingAddress.postalCode}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-bold">Customer</h2>

            <p className="font-medium">{order.user?.name || "Deleted user"}</p>

            <p className="mt-1 break-all text-sm text-ink-soft">
              {order.user?.email || "N/A"}
            </p>
          </section>

          {/* Payment */}
          <section className="glass p-6">
            <h2 className="mb-4 text-lg font-bold">Payment information</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Method</span>
                <span className="font-medium capitalize">
                  {order.paymentMethod?.replaceAll("_", " ")}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Payment status</span>
                <span className="font-medium capitalize">
                  {order.paymentStatus}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Total</span>
                <span className="font-semibold">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Update order status */}
          <section className="glass-strong p-6">
            <h2 className="mb-4 text-lg font-bold">Update order status</h2>

            {transitions.length > 0 ? (
              <>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="field"
                >
                  <option value="">Select new status</option>

                  {transitions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || updating}
                  className="btn-primary mt-4 w-full"
                >
                  {updating ? "Updating..." : "Update status"}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                No further status transitions are available for this order.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
