import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/useCart.js";

export default function Cart() {
  const {
    items,
    itemCount,
    subtotal,
    loading,
    error,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [actionError, setActionError] = useState("");
  const [busyItemId, setBusyItemId] = useState(null);

  function getProduct(item) {
    const product = item.productId ?? item.product ?? item;

    return typeof product === "object" && product !== null
      ? product
      : item;
  }

  function getProductId(item) {
    const product = getProduct(item);

    return (
      product._id ??
      item.productId?._id ??
      item.productId ??
      item.product?._id ??
      item._id
    );
  }

  async function handleQuantityChange(itemId, quantity) {
    try {
      setActionError("");
      setBusyItemId(itemId);
      await updateQuantity(itemId, quantity);
    } catch (err) {
      setActionError(err.message || "Could not update quantity.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(itemId) {
    try {
      setActionError("");
      setBusyItemId(itemId);
      await removeFromCart(itemId);
    } catch (err) {
      setActionError(err.message || "Could not remove this item.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleClearCart() {
    try {
      setActionError("");
      await clearCart();
    } catch (err) {
      setActionError(err.message || "Could not clear the cart.");
    }
  }

  if (loading && !items.length) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading your cart...
        </div>
      </main>
    );
  }

  if (error && !items.length) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <p className="text-danger">{error}</p>
          <p className="mt-2 text-sm text-ink-soft">
            If you are logged out, please log in to view your cart.
          </p>
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <div className="glass-strong max-w-lg rounded-glass-lg p-10 text-center">
          <h1 className="text-3xl font-bold">Your bag is empty</h1>

          <p className="mt-3 text-ink-soft">
            Looks like you haven't added anything yet.
          </p>

          <Link to="/products" className="btn-primary mt-6">
            Shop now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">
        Your bag{" "}
        <span className="text-gradient">({itemCount})</span>
      </h1>

      {actionError && (
        <p className="mb-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          {items.map((item) => {
            const product = getProduct(item);
            const productId = getProductId(item);
            const itemId = item._id;
            const quantity = Number(item.quantity || 1);
            const image = product.images?.[0] ?? product.image ?? item.image;

            const sizeStock =
              product.sizes?.find((entry) => entry.size === item.size)
                ?.quantity ?? product.quantity ?? 10;
            const maxQuantity = Math.max(1, Math.min(sizeStock, 10));

            return (
              <article
                key={itemId || String(productId)}
                className="glass flex flex-col gap-4 p-4 sm:flex-row"
              >
                {image ? (
                  <img
                    src={image}
                    alt={product.name || "Product"}
                    className="h-36 w-full rounded-2xl bg-white/40 object-cover sm:w-32"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-white/40 text-sm text-ink-soft sm:w-32">
                    No image
                  </div>
                )}

                <div className="flex flex-1 flex-col items-start">
                  <h2 className="font-display text-lg font-bold">
                    {product.name || "Product"}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="chip chip-shipped">
                      Size {item.size || "—"}
                    </span>

                    <span className="text-sm font-semibold">
                      EGP{" "}
                      {Number(
                        product.price ?? item.price ?? 0
                      ).toLocaleString()}
                    </span>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm font-medium text-ink-soft">
                    Quantity

                    <select
                      value={quantity}
                      disabled={busyItemId === itemId}
                      onChange={(e) =>
                        handleQuantityChange(itemId, Number(e.target.value))
                      }
                      className="field w-20 py-1.5"
                    >
                      {Array.from(
                        { length: maxQuantity },
                        (_, index) => index + 1
                      ).map((number) => (
                        <option key={number} value={number}>
                          {number}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={busyItemId === itemId}
                    onClick={() => handleRemove(itemId)}
                    className="mt-3 text-sm font-semibold text-danger underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {busyItemId === itemId ? "Updating..." : "Remove"}
                  </button>
                </div>

                <p className="font-display text-lg font-bold">
                  EGP{" "}
                  {(
                    Number(product.price ?? item.price ?? 0) * quantity
                  ).toLocaleString()}
                </p>
              </article>
            );
          })}
        </section>

        <aside className="glass-strong h-fit p-6">
          <h2 className="text-xl font-bold">Order summary</h2>

          <div className="mt-6 flex justify-between text-sm">
            <span>Items ({itemCount})</span>
            <span>EGP {subtotal.toLocaleString()}</span>
          </div>

          <p className="mt-3 text-sm text-ink-soft">
            Shipping and any applicable taxes are calculated at checkout.
          </p>

          <div className="mt-5 flex justify-between border-t border-white/60 pt-5 text-lg font-bold">
            <span>Subtotal</span>
            <span>EGP {subtotal.toLocaleString()}</span>
          </div>

          <Link to="/checkout" className="btn-primary mt-6 w-full">
            Proceed to checkout
          </Link>

          <button
            type="button"
            onClick={handleClearCart}
            className="btn-glass mt-3 w-full"
          >
            Clear cart
          </button>

          <Link
            to="/products"
            className="mt-4 block text-center text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
