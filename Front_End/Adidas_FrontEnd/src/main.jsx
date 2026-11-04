import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./Pages/Home.jsx";
import Products from "./Pages/Products.jsx";
import ProductDetails from "./Pages/ProductDetails.jsx";
import Login from "./Pages/Login.jsx";
import SignUp from "./Pages/SignUp.jsx";
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";
import Cart from "./Pages/Cart.jsx";
import Checkout from "./Pages/CheckOut.jsx";
import PaymentSuccess from "./Pages/PaymentSuccess";
import MyOrders from "./Pages/MyOrders";
import OrderDetails from "./Pages/OrderDetails";
import OrderConfirmation from "./Pages/OrderConfirmation.jsx";
import Profile from "./Pages/Profile";
import SecuritySettings from "./Pages/SecuritySettings";

import AdminDashboard from "./Pages/admin/AdminDashboard";
import AdminOrders from "./Pages/admin/AdminOrders.jsx";
import AdminOrderDetails from "./Pages/admin/AdminOrderDetails.jsx";
import AdminProducts from "./Pages/admin/AdminProducts";
import ProductForm from "./Pages/admin/ProductForm";
import AdminUsers from "./Pages/admin/AdminUsers";

import StoreLayout from "./Components/StoreLayout";
import AdminLayout from "./Components/Admin/AdminLayout";
import ProtectedRoute from "./Components/ProtectedRoute";
import AuroraBackground from "./Components/AuroraBackground";

import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <>
    <AuroraBackground />

    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Customer storefront */}
            <Route element={<StoreLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />

              <Route
                path="/my-account"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-account/security"
                element={
                  <ProtectedRoute>
                    <SecuritySettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-orders"
                element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/order-confirmation/:id"
                element={<OrderConfirmation />}
              />

              <Route path="/payment-success" element={<PaymentSuccess />} />
            </Route>

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin panel */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetails />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id/edit" element={<ProductForm />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </>,
);
