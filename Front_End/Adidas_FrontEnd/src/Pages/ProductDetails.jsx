import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useCart } from "../context/useCart.js";
import { useAuth } from "../context/useAuth.jsx";

function ProductDetails() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  async function handleAddToCart() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedSize) {
      setCartError("Please select a size.");
      return;
    }

    try {
      setAdding(true);
      setCartMessage("");
      setCartError("");

      await addToCart(product._id, selectedSize, 1);

      setCartMessage("Product added to your bag!");
    } catch (err) {
      setCartError(err.message || "Unable to add this product.");
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/api/products/${id}`);

        setProduct(response.data.product ?? response.data);
        setSelectedSize("");
        setSelectedImage("");
      } catch (err) {
        console.error("Failed to load product:", err);

        setError(
          err.response?.status === 404
            ? "Product not found."
            : "Unable to load this product. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading product...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <h1 className="text-2xl font-bold">{error}</h1>

          <Link to="/products" className="btn-primary mt-6">
            Back to products
          </Link>
        </div>
      </main>
    );
  }

  if (!product) {
    return null;
  }

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const productImages = [
    ...new Set([product.image, ...(product.images ?? [])].filter(Boolean)),
  ];
  const activeImage = selectedImage || productImages[0];
  const activeImageIndex = Math.max(productImages.indexOf(activeImage), 0);
  const hasStock = sizes.some((entry) => entry.quantity > 0);
  const selectedEntry = sizes.find((entry) => entry.size === selectedSize);

  function showImage(offset) {
    if (productImages.length < 2) return;

    const nextIndex =
      (activeImageIndex + offset + productImages.length) %
      productImages.length;

    setSelectedImage(productImages[nextIndex]);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        to="/products"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink-soft transition hover:text-grape"
      >
        ← Back to products
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* Product images */}
        <div>
          <div className="glass relative overflow-hidden">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-white/40 text-ink-soft">
                No image available
              </div>
            )}

            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous product image"
                  onClick={() => showImage(-1)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white transition hover:bg-black/65"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next product image"
                  onClick={() => showImage(1)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white transition hover:bg-black/65"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {productImages.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {productImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`shrink-0 overflow-hidden rounded-xl border-2 ${
                    activeImage === image
                      ? "border-grape"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} thumbnail`}
                    className="h-20 w-16 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product information */}
        <div className="glass-strong flex flex-col justify-center p-6 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
            {product.categories?.name ||
              product.category?.name ||
              "Sportswear"}
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
            {product.name}
          </h1>

          <p className="mt-5 text-2xl font-bold">
            EGP {Number(product.price).toLocaleString("en-US")}
          </p>

          {/* Size selector */}
          <div className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
                Select size
              </p>

              {selectedEntry && (
                <span className="text-xs font-semibold text-ink-soft">
                  {selectedEntry.quantity} left
                </span>
              )}
            </div>

            {sizes.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                Sizes are not available for this product yet.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((entry) => {
                  const outOfStock = entry.quantity <= 0;
                  const isSelected = selectedSize === entry.size;

                  return (
                    <button
                      key={entry.size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(entry.size);
                        setCartError("");
                      }}
                      disabled={outOfStock}
                      title={
                        outOfStock
                          ? "Out of stock"
                          : `${entry.quantity} in stock`
                      }
                      className={`min-w-14 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? "border-transparent bg-gradient-to-r from-grape to-sky text-white shadow-glow"
                          : "border-white/80 bg-white/60 text-ink hover:bg-white"
                      } ${
                        outOfStock
                          ? "cursor-not-allowed opacity-40 line-through"
                          : ""
                      }`}
                    >
                      {entry.size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || sizes.length === 0 || !selectedSize}
            className="btn-primary mt-6 w-full"
          >
            {adding
              ? "Adding..."
              : sizes.length === 0
                ? "Sizes unavailable"
                : !selectedSize
                  ? "Select a size"
                  : "Add to bag"}
          </button>

          {cartMessage && (
            <p className="mt-3 rounded-2xl bg-mint/15 px-4 py-3 text-sm font-medium text-mint">
              {cartMessage}
            </p>
          )}

          {cartError && (
            <p className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {cartError}
            </p>
          )}

          <p className="mt-6 leading-7 text-ink-soft">
            Explore this product from our sportswear collection. Built for
            movement, made to last.
          </p>

          <div className="mt-6">
            {sizes.length === 0 ? (
              <span className="chip chip-cancelled">Sizes not available yet</span>
            ) : hasStock ? (
              <span className="chip chip-delivered">In stock</span>
            ) : (
              <span className="chip chip-cancelled">Out of stock</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProductDetails;
