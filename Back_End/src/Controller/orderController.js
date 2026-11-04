import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";
import User from "../models/User.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { shippingAddress, paymentMethod } = req.body;

    // 1. Validate shipping address
    const requiredAddressFields = [
      "fullName",
      "phone",
      "street",
      "city",
      "country",
    ];

    if (
      !shippingAddress ||
      typeof shippingAddress !== "object" ||
      requiredAddressFields.some(
        (field) =>
          typeof shippingAddress[field] !== "string" ||
          !shippingAddress[field].trim()
      )
    ) {
      return res.status(400).json({
        message: "Please provide a complete shipping address",
      });
    }

    // 2. Validate payment method
    if (!["cash_on_delivery", "card"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    let createdOrder;

    // All stock deductions and order creation succeed together,
    // or the transaction rolls everything back.
    await session.withTransaction(async () => {
      // 3. Find the user's cart
      const cart = await Cart.findOne({
        user: req.user.id,
      }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty");
        error.statusCode = 400;
        throw error;
      }

      const orderItems = [];
      let totalAmount = 0;

      // 4. Validate products and build order snapshots
      for (const item of cart.items) {
        if (
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
        ) {
          const error = new Error("Invalid cart item quantity");
          error.statusCode = 400;
          throw error;
        }

        const product = await Product.findById(item.product)
          .session(session);

        if (!product) {
          const error = new Error(
            "A product in your cart no longer exists"
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          !Number.isFinite(product.price) ||
          product.price < 0
        ) {
          const error = new Error(
            `Invalid price for ${product.name}`
          );
          error.statusCode = 400;
          throw error;
        }

        const size = typeof item.size === "string" ? item.size.trim() : "";

        if (!size) {
          const error = new Error(
            `Please select a size for ${product.name}`
          );
          error.statusCode = 400;
          throw error;
        }

        const sizeEntry = (product.sizes ?? []).find(
          (entry) => entry.size === size
        );

        if (!sizeEntry) {
          const error = new Error(
            `Size ${size} is no longer available for ${product.name}`
          );
          error.statusCode = 400;
          throw error;
        }

        if (sizeEntry.quantity < item.quantity) {
          const error = new Error(
            `Not enough stock for ${product.name} in size ${size}`
          );
          error.statusCode = 409;
          throw error;
        }

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          size,
        });

        totalAmount += product.price * item.quantity;
      }

      // 5. Deduct stock atomically for the selected size
      for (const item of orderItems) {
        const result = item.size
          ? await Product.updateOne(
              {
                _id: item.product,
                "sizes.size": item.size,
                "sizes.quantity": { $gte: item.quantity },
              },
              {
                $inc: {
                  "sizes.$[s].quantity": -item.quantity,
                  quantity: -item.quantity,
                },
              },
              {
                arrayFilters: [
                  {
                    "s.size": item.size,
                    "s.quantity": { $gte: item.quantity },
                  },
                ],
                session,
              }
            )
          : await Product.updateOne(
              {
                _id: item.product,
                quantity: { $gte: item.quantity },
              },
              {
                $inc: { quantity: -item.quantity },
              },
              { session }
            );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            `Not enough stock for ${item.name}${
              item.size ? ` in size ${item.size}` : ""
            }`
          );
          error.statusCode = 409;
          throw error;
        }
      }

      // 6. Create the order in the same transaction
      const orders = await Order.create(
        [
          {
            user: req.user.id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod,
            status: "pending",
            paymentStatus: "unpaid",
             stockDeducted: true,
             paymentExpiresAt:
    paymentMethod === "card"
      ? new Date(Date.now() + 60 * 1000)
      : null,
          },
        ],
        { session }
      );

      createdOrder = orders[0];

      if (paymentMethod === "cash_on_delivery") {
  console.log("COD: clearing cart for user:", req.user.id);

  const result = await Cart.updateOne(
    { user: req.user.id },
    { $set: { items: [] } },
    { session }
  );

  console.log("Cart update result:", result);
}
    });

    return res.status(201).json({
      message: "Order created and stock deducted successfully",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};


// Get all orders

export const getOrder = async (req, res)=>{

try{

  const orders = await Order.find({
    user: req.user.id,
  }).sort({ createdAt: -1 })
      .lean();

  return res.status(200).json({ message: "Orders retrieved successfully",
      count: orders.length,
      orders,})

}
catch(error){
 console.error("Create order error:", error);

    return res.status(500).json({
      message: "Cannot get order",
    })

}
}

// get order by ID


export const getOrderByID = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);

    return res.status(500).json({
      message: "Could not retrieve order",
    });
  }
};

// Cancel order


export const cancelOrder = async (req, res) => {
  let session;

  try {
    const { id } = req.params;

    // 1. Validate the order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      // 2. Find the order belonging to the authenticated user
      const order = await Order.findOne({
        _id: id,
        user: req.user.id,
      }).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      // 3. Only pending orders can be cancelled
      if (order.status !== "pending") {
        const error = new Error(
          "Only pending orders can be cancelled"
        );
        error.statusCode = 400;
        throw error;
      }

      // 4. Paid orders require a refund process
      if (order.paymentStatus === "paid") {
        const error = new Error(
          "This order requires a refund process"
        );
        error.statusCode = 400;
        throw error;
      }

      // 5. Restore stock for every order item
    //   for (const item of order.items) {
    //     const result = await Product.updateOne(
    //       { _id: item.product },
    //       {
    //         $inc: { quantity: item.quantity },
    //       },
    //       { session }
    //     );

    //     // If a product no longer exists, abort the transaction
    //     if (result.modifiedCount !== 1) {
    //       const error = new Error(
    //         `Could not restore stock for ${item.name}`
    //       );
    //       error.statusCode = 409;
    //       throw error;
    //     }
    //   }

    //   // 6. Mark the order as cancelled
    //   order.status = "cancelled";
    //   await order.save({ session });
    // });

    if (order.stockDeducted) {
  for (const item of order.items) {
    const result = item.size
      ? await Product.updateOne(
          { _id: item.product, "sizes.size": item.size },
          {
            $inc: {
              "sizes.$[s].quantity": item.quantity,
              quantity: item.quantity,
            },
          },
          {
            arrayFilters: [{ "s.size": item.size }],
            session,
          }
        )
      : await Product.updateOne(
          { _id: item.product },
          { $inc: { quantity: item.quantity } },
          { session }
        );

    if (result.matchedCount !== 1) {
      const error = new Error(
        `Could not restore stock for ${item.name}`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  order.stockDeducted = false;
}

order.status = "cancelled";
await order.save({ session });

    });

    return res.status(200).json({
      message: "Order cancelled and stock restored successfully",
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


// Update order status ----------------------------------

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // Allowed status transitions
    const allowedTransitions = {
      pending: ["processing"],
      processing: ["shipped"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    // Validate requested status
    const validStatuses = [
      "processing",
      "shipped",
      "delivered",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use processing, shipped, or delivered",
      });
    }

    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Validate the transition
    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot change order status from ${order.status} to ${status}`,
      });
    }

    // Update the order
    order.status = status;
    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Admin: Get all orders
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
    } = req.query;

    const currentPage = Number(page);
    const pageLimit = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 1 ||
      !Number.isInteger(pageLimit) ||
      pageLimit < 1 ||
      pageLimit > 100
    ) {
      return res.status(400).json({
        message: "Invalid pagination parameters",
      });
    }

    const filter = {};

    // Filter by order status
    if (status) {
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid order status",
        });
      }

      filter.status = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      const validPaymentStatuses = [
        "unpaid",
        "paid",
        "failed",
        "refunded",
      ];

      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          message: "Invalid payment status",
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    // Search by order ID or customer name/email
    if (search?.trim()) {
      const searchTerm = search.trim();
      const searchConditions = [];

      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        searchConditions.push({
          _id: searchTerm,
        });
      }

      const users = await User.find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ],
      }).select("_id");

      const userIds = users.map((user) => user._id);

      if (userIds.length > 0) {
        searchConditions.push({
          user: { $in: userIds },
        });
      }

      if (searchConditions.length === 0) {
        return res.status(200).json({
          orders: [],
          pagination: {
            totalOrders: 0,
            currentPage,
            totalPages: 0,
            pageLimit,
          },
        });
      }

      filter.$or = searchConditions;
    }

    const skip = (currentPage - 1) * pageLimit;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Orders retrieved successfully",
      orders,
      pagination: {
        totalOrders,
        currentPage,
        totalPages: Math.ceil(totalOrders / pageLimit),
        pageLimit,
      },
    });
  } catch (error) {
    console.error("Admin get all orders error:", error);

    return res.status(500).json({
      message: "Could not retrieve orders",
    });
  }
};

// Admin: Get order details
export const getOrderDetailsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id)
      .populate("user", "name email")
      .populate("items.product", "name image")
      .lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    console.error("Admin get order details error:", error);

    return res.status(500).json({
      message: "Could not retrieve order details",
    });
  }
};