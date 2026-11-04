import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api.js";

const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45"];
const CLOTHING_SIZES = ["S", "M", "L", "XL"];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    categories: "",
    sizes: [],
    image: "",
  });

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch categories and, if editing, the selected product.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const categoryResponse = await api.get("/api/category");

        const categoryData = categoryResponse.data;
        const categoryList = Array.isArray(categoryData)
          ? categoryData
          : categoryData.categories || [];

        setCategories(categoryList);

        if (isEditing) {
          const productResponse = await api.get(`/api/products/${id}`);

          const product = productResponse.data;

          setFormData({
            name: product.name || "",
            price: product.price ?? "",
            categories:
              product.categories?._id || product.categories || "",
            sizes: Array.isArray(product.sizes)
              ? product.sizes.map((entry) => ({
                  size: entry.size,
                  quantity: String(entry.quantity ?? 0),
                }))
              : [],
            image: product.image || "",
          });
        }
      } catch (error) {
        console.error("Fetch product form data error:", error);

        setError(
          error.response?.data?.message ||
            "Could not load product information."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing]);

  // Update form fields.
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSizeChange = (index, field, value) => {
    setFormData((prev) => {
      const sizes = prev.sizes.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );

      return { ...prev, sizes };
    });
  };

  const addSizeRow = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { size: "", quantity: "0" }],
    }));
  };

  const removeSizeRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const applySizePreset = (labels) => {
    setFormData((prev) => ({
      ...prev,
      sizes: labels.map((label) => {
        const existing = prev.sizes.find(
          (row) => row.size.trim().toLowerCase() === label.toLowerCase()
        );

        return {
          size: label,
          quantity: existing?.quantity ?? "0",
        };
      }),
    }));
  };

  // Submit product.
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const price = Number(formData.price);

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid product price.");
      return;
    }

    const sizes = [];
    const seenSizes = new Set();

    for (const row of formData.sizes) {
      const label = String(row.size).trim();

      if (!label) {
        setError("Every size row needs a size name, or remove the row.");
        return;
      }

      const key = label.toLowerCase();

      if (seenSizes.has(key)) {
        setError(`Duplicate size: ${label}`);
        return;
      }

      seenSizes.add(key);

      const quantity = Number(row.quantity);

      if (!Number.isInteger(quantity) || quantity < 0) {
        setError(
          `Quantity for size ${label} must be a non-negative whole number.`
        );
        return;
      }

      sizes.push({ size: label, quantity });
    }

    const productData = {
      name: formData.name.trim(),
      price,
      categories: formData.categories,
      sizes,
      image: formData.image.trim(),
    };

    try {
      setSubmitting(true);

      if (isEditing) {
        await api.patch(`/api/products/${id}`, productData);
      } else {
        await api.post("/api/products", productData);
      }

      navigate("/admin/products");
    } catch (error) {
      console.error("Save product error:", error);

      setError(
        error.response?.data?.message ||
          "Could not save the product. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading product information...
        </div>
      </div>
    );
  }

  const totalStock = formData.sizes.reduce(
    (total, row) => total + (Number(row.quantity) || 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <Link
          to="/admin/products"
          className="text-sm font-semibold text-ink-soft transition hover:text-grape"
        >
          ← Back to products
        </Link>

        <h1 className="mt-3 text-3xl font-bold">
          {isEditing ? "Edit product" : "Add new product"}
        </h1>

        <p className="mt-1 text-sm text-ink-soft">
          {isEditing
            ? "Update the product information."
            : "Enter the details of your new product."}
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass space-y-6 p-6 sm:p-8">
        {/* Product Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Product name
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. MLocal Ultraboost 5X"
            required
            className="field"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Price (EGP)
          </label>

          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="6500"
            min="0"
            step="0.01"
            required
            className="field"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-semibold">Category</label>

          <select
            name="categories"
            value={formData.categories}
            onChange={handleChange}
            required
            className="field"
          >
            <option value="">Select a category</option>

            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sizes and stock */}
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-semibold">
              Sizes &amp; stock
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applySizePreset(SHOE_SIZES)}
                className="btn-glass px-3 py-2 text-[10px]"
              >
                Add shoe sizes (38–45)
              </button>

              <button
                type="button"
                onClick={() => applySizePreset(CLOTHING_SIZES)}
                className="btn-glass px-3 py-2 text-[10px]"
              >
                Add clothing sizes (S–XL)
              </button>
            </div>
          </div>

          {formData.sizes.length === 0 ? (
            <p className="rounded-2xl bg-sun/15 px-4 py-3 text-sm text-amber-800">
              No sizes yet. Add rows manually or use a preset. A product
              without sizes can&apos;t be purchased.
            </p>
          ) : (
            <div className="space-y-3">
              {formData.sizes.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-2xl bg-white/40 p-3 sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    value={row.size}
                    onChange={(e) =>
                      handleSizeChange(index, "size", e.target.value)
                    }
                    placeholder="Size (e.g. 42 or M)"
                    className="field min-w-0 flex-1 py-2"
                  />

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.quantity}
                    onChange={(e) =>
                      handleSizeChange(index, "quantity", e.target.value)
                    }
                    placeholder="Qty"
                    className="field w-full py-2 sm:w-28"
                  />

                  <button
                    type="button"
                    onClick={() => removeSizeRow(index)}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addSizeRow}
            className="mt-3 text-sm font-semibold text-grape transition hover:text-sky"
          >
            + Add size
          </button>

          <p className="mt-3 text-sm font-semibold text-ink-soft">
            Total stock:{" "}
            <span className="text-ink">{totalStock}</span>
          </p>
        </div>

        {/* Image URL */}
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Product image URL
          </label>

          <input
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/product-image.jpg"
            className="field"
          />

          {/* Image Preview */}
          {formData.image && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-ink-soft">Image preview</p>

              <img
                src={formData.image}
                alt="Product preview"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                onLoad={(e) => {
                  e.currentTarget.style.display = "block";
                }}
                className="h-48 w-48 rounded-2xl border border-white/60 object-cover"
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/60 pt-5 sm:flex-row sm:justify-end">
          <Link to="/admin/products" className="btn-glass">
            Cancel
          </Link>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update product"
                : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}
