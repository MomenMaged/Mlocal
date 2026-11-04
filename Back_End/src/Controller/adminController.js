import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

export async function getAdminDashboard(req, res) {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueResult,
      recentOrders,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),

      Product.countDocuments(),

      Order.countDocuments(),

      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),

      Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(5)
        .select("user items totalAmount status paymentStatus paymentMethod createdAt"),

      User.find()
        .select("name email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return res.status(200).json({
      statistics: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
      },
      recentOrders,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      message: "Could not load dashboard data",
    });
  }
}
