import { useEffect, useState } from "react";
import api from "../../services/api";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusChip = {
  pending: "chip-pending",
  confirmed: "chip-processing",
  processing: "chip-processing",
  shipped: "chip-shipped",
  delivered: "chip-delivered",
  cancelled: "chip-cancelled",
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/admin/dashboard");

        setDashboard(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="glass px-8 py-6 text-sm font-bold uppercase tracking-widest">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="glass-strong max-w-md rounded-glass-lg p-8 text-center">
          <p className="text-danger">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { statistics, recentOrders, recentUsers } = dashboard;

  const stats = [
    {
      title: "Total Users",
      value: statistics.totalUsers,
      icon: "👥",
      description: "Registered customers",
    },
    {
      title: "Total Products",
      value: statistics.totalProducts,
      icon: "📦",
      description: "Products in store",
    },
    {
      title: "Total Orders",
      value: statistics.totalOrders,
      icon: "🛒",
      description: "All order records",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(statistics.totalRevenue),
      icon: "💰",
      description: "From paid orders",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-glass-lg px-6 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-grape">
              MLocal store
            </p>

            <h1 className="mt-2 text-3xl font-bold">Admin dashboard</h1>

            <p className="mt-2 text-sm text-ink-soft">
              Overview of your store's performance.
            </p>
          </div>

          <span className="chip chip-shipped w-fit text-xs">
            Administrator
          </span>
        </div>
      </header>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="glass p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-soft">
                {stat.title}
              </p>

              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-grape/15 to-aqua/15 text-2xl">
                {stat.icon}
              </span>
            </div>

            <h2 className="mt-4 break-words font-display text-2xl font-bold">
              {stat.value}
            </h2>

            <p className="mt-2 text-xs text-ink-soft">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <section className="glass overflow-hidden">
        <div className="border-b border-white/60 px-6 py-5">
          <h2 className="text-lg font-bold">Recent orders</h2>

          <p className="mt-1 text-sm text-ink-soft">
            The latest five orders placed in your store.
          </p>
        </div>

        {recentOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No orders found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white/40 text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/50">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="transition hover:bg-white/50">
                    <td className="px-6 py-4 font-medium">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {order.user?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {order.user?.email || "No email"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-ink-soft">
                      {formatDate(order.createdAt)}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>

                    <td className="px-6 py-4 capitalize text-ink-soft">
                      {order.paymentStatus}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`chip ${
                          statusChip[order.status] || "chip-unpaid"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Users */}
      <section className="glass overflow-hidden">
        <div className="border-b border-white/60 px-6 py-5">
          <h2 className="text-lg font-bold">Recent users</h2>

          <p className="mt-1 text-sm text-ink-soft">
            The latest five registered users.
          </p>
        </div>

        {recentUsers.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No users found.
          </p>
        ) : (
          <div className="divide-y divide-white/50">
            {recentUsers.map((user) => (
              <div
                key={user._id}
                className="flex flex-col justify-between gap-3 px-6 py-4 transition hover:bg-white/50 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-grape/20 to-aqua/20 font-semibold">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>

                  <div>
                    <p className="font-medium">{user.name}</p>

                    <p className="text-sm text-ink-soft">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <span className="chip chip-unpaid capitalize">
                    {user.role}
                  </span>

                  <span className="text-xs text-ink-soft">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
