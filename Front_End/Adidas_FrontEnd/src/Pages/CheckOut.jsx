import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/useCart.js";
import api from "../services/api";

const initialAddress = {
  fullName: "",
  phone: "",
  street: "",
  city: "",
  country: "",
};

export default function Checkout() {
  const { items, subtotal, loading, refreshCart } = useCart();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState(initialAddress);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleAddressChange(e) {
    const { name, value } = e.target;

    setShippingAddress((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Create the order from the server-side cart.
      const orderResponse = await api.post("/api/orders", {
        shippingAddress,
        paymentMethod,
      });

      const order = orderResponse.data.order;

      if (!order?._id) {
        throw new Error("The server did not return an order ID.");
      }

      // Step 2: Card payments continue to Stripe Checkout.
      if (paymentMethod === "card") {
        const checkoutResponse = await api.post(
          `/api/orders/${order._id}/checkout`
        );

        const checkoutUrl = checkoutResponse.data.checkoutUrl;

        if (!checkoutUrl) {
          throw new Error("The server did not return a Stripe checkout URL.");
        }

        window.location.assign(checkoutUrl);
        return;
      }

      // Step 3: Cash on delivery doesn't need a Stripe session.
      await refreshCart();

      navigate(`/order-confirmation/${order._id}`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading checkout...
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass-strong max-w-lg rounded-glass-lg p-10 text-center">
          <h1 className="text-3xl font-bold">Your bag is empty</h1>

          <Link to="/products" className="btn-primary mt-6">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Checkout</h1>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass p-6">
            <h2 className="mb-5 text-xl font-bold">Shipping address</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { name: "fullName", label: "Full name" },
                { name: "phone", label: "Phone number" },
                { name: "street", label: "Street address" },
                { name: "city", label: "City" },
                { name: "country", label: "Country" },
              ].map((field) => (
                <label
                  key={field.name}
                  className="flex flex-col gap-2 text-sm font-medium text-ink-soft"
                >
                  {field.label}

                  <input
                    name={field.name}
                    value={shippingAddress[field.name]}
                    onChange={handleAddressChange}
                    required
                    autoComplete={
                      field.name === "fullName"
                        ? "name"
                        : field.name === "phone"
                          ? "tel"
                          : "shipping"
                    }
                    className="field"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="glass p-6">
            <h2 className="mb-5 text-xl font-bold">Payment method</h2>

            <div className="space-y-3">
              <label className="glass-subtle flex cursor-pointer items-center gap-3 p-4 transition has-[:checked]:border-grape/60 has-[:checked]:bg-white/80">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-grape"
                />
                <span className="text-sm font-semibold">
                  Credit or debit card — Stripe Checkout
                </span>
              </label>

              <label className="glass-subtle flex cursor-pointer items-center gap-3 p-4 transition has-[:checked]:border-grape/60 has-[:checked]:bg-white/80">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash_on_delivery"
                  checked={paymentMethod === "cash_on_delivery"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-grape"
                />
                <span className="text-sm font-semibold">Cash on delivery</span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting || loading || !items.length}
            className="btn-primary w-full"
          >
            {submitting
              ? "Processing..."
              : paymentMethod === "card"
                ? "Continue to payment"
                : "Place order"}
          </button>
        </form>

        <aside className="glass-strong h-fit p-6">
          <h2 className="text-xl font-bold">Order summary</h2>

          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const product = item.productId ?? item.product ?? item;
              const id =
                product?._id ??
                item.productId?._id ??
                item.productId ??
                item._id;

              return (
                <div
                  key={String(id)}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-ink-soft">
                    {product?.name ?? "Product"}
                    {item.size ? ` — Size ${item.size}` : ""} × {item.quantity}
                  </span>

                  <span className="font-semibold">
                    EGP{" "}
                    {(
                      Number(product?.price ?? item.price ?? 0) *
                      Number(item.quantity ?? 0)
                    ).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-between border-t border-white/60 pt-5 text-lg font-bold">
            <span>Subtotal</span>
            <span>EGP {subtotal.toLocaleString()}</span>
          </div>

          <p className="mt-3 text-xs text-ink-soft">
            Final order totals are calculated by the backend.
          </p>
        </aside>
      </div>
    </main>
  );
}
