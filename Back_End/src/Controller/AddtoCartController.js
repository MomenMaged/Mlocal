import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

function findSizeEntry(product, size) {
  if (!Array.isArray(product.sizes)) {
    return null;
  }

  return product.sizes.find((entry) => entry.size === size) ?? null;
}

export const addToCart = async (req, res) => {
  try {
    const { productId, size, quantity = 1 } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (typeof size !== "string" || !size.trim()) {
      return res.status(400).json({
        message: "Size is required",
      });
    }

    const normalizedSize = size.trim();

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const sizeEntry = findSizeEntry(product, normalizedSize);

    if (!sizeEntry) {
      return res.status(400).json({
        message: "Selected size is not available for this product",
        availableSizes: (product.sizes ?? []).map((entry) => entry.size),
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId && item.size === normalizedSize
    );

    const requestedTotal = (existingItem?.quantity ?? 0) + quantity;

    // Check available stock for the selected size.
    if (requestedTotal > sizeEntry.quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
        availableQuantity: sizeEntry.quantity,
        quantityAlreadyInCart: existingItem?.quantity ?? 0,
      });
    }

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        size: normalizedSize,
        quantity,
      });
    }

    await cart.save();

    await cart.populate("items.product");

    return res.status(200).json({
      message: "Product added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// 1. Update the quantity of a cart line
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    const product = await Product.findById(item.product);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const sizeEntry = findSizeEntry(product, item.size);

    if (!sizeEntry) {
      return res.status(400).json({
        message: "Selected size is no longer available for this product",
      });
    }

    if (quantity > sizeEntry.quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
        availableQuantity: sizeEntry.quantity,
      });
    }

    item.quantity = quantity;
    await cart.save();

    await cart.populate("items.product");

    return res.status(200).json({
      message: "Cart item quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// 2. Remove one cart line
export const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    cart.items.pull(itemId);

    await cart.save();
    await cart.populate("items.product");

    return res.status(200).json({
      message: "Product removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// 3. Clear the entire cart
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// get cart

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart) {
      return res.status(404).json({ message: "No cart for this user" });
    }

    return res.status(200).json({
      message: "Cart retrieved successfully",
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({
      message: "Cannot get the cart",
    });
  }
};
