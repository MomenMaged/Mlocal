
import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import api from "../services/api";
import { useAuth } from "./useAuth.jsx";

export const CartContext = createContext(null);

function getCartFromResponse(data) {
  // Support common API response formats.
  return data?.cart ?? data?.data?.cart ?? data?.data ?? data;
}

function getItems(cart) {
  if (Array.isArray(cart)) return cart;
  return cart?.items ?? cart?.products ?? [];
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/cart", getAuthConfig());
      setCart(getCartFromResponse(response.data));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load your cart."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId, size, quantity = 1) => {
    if (!user) {
      throw new Error("Please log in before adding items to your cart.");
    }

    if (!size) {
      throw new Error("Please select a size.");
    }

    await api.post(
      "/api/cart",
      { productId, size, quantity },
      getAuthConfig()
    );

    await refreshCart();
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    await api.patch(
      `/api/cart/items/${itemId}`,
      { quantity },
      getAuthConfig()
    );

    await refreshCart();
  };

  const removeFromCart = async (itemId) => {
    await api.delete(
      `/api/cart/items/${itemId}`,
      getAuthConfig()
    );

    await refreshCart();
  };

  const clearCart = async () => {
    await api.delete("/api/cart", getAuthConfig());
    await refreshCart();
  };

  const items = getItems(cart);

  // Calculate count and subtotal from the returned cart items.
  const itemCount = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const subtotal = items.reduce((total, item) => {
    const product = item.productId ?? item.product ?? item;
    return total + Number(product.price ?? item.price ?? 0)
      * Number(item.quantity || 0);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        itemCount,
        subtotal,
        loading,
        error,
        refreshCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// export function useCart() {
//   const context = useContext(CartContext);

//   if (!context) {
//     throw new Error("useCart must be used inside CartProvider");
//   }

//   return context;
// }
