import stripe from "../config/stripe.js";
import mongoose from "mongoose";
import Order from "../models/Order.js";

export const createCheckoutSession = async (req, res) => {
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
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "card") {
      return res.status(400).json({
        message: "This order is not a card payment",
      });
    }

    if (
      order.paymentStatus === "paid" ||
      order.status !== "pending"
    ) {
      return res.status(400).json({
        message: "This order is not eligible for checkout",
      });
    }

    if (
      !Number.isFinite(order.totalAmount) ||
      order.totalAmount <= 0
    ) {
      return res.status(400).json({
        message: "Invalid order amount",
      });
    }

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "payment",
        

        line_items: order.items.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.size
                ? `${item.name} — Size ${item.size}`
                : item.name,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        
        metadata: {
          orderId: order._id.toString(),
          userId: req.user.id.toString(),
        },

        client_reference_id: order._id.toString(),


        success_url:
          `${process.env.CLIENT_URL}/payment-success` +
          "?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${process.env.CLIENT_URL}/payment-cancelled`,
      });

    //   console.log("Created Checkout Session:", checkoutSession.id);

    // return res.status(201).json({
    //   message: "Checkout session created",
    //   checkoutUrl: checkoutSession.url,
    //   sessionId: checkoutSession.id,
    // });

    // Set the deadline to one minute from now.
const paymentExpiresAt = new Date(Date.now() + 60 * 1000);

// Save the Stripe session ID and deadline to the order.
const updatedOrder = await Order.findOneAndUpdate(
  {
    _id: order._id,
    user: req.user.id,
    status: "pending",
    paymentStatus: "unpaid",
  },
  {
    $set: {
      checkoutSessionId: checkoutSession.id,
      paymentExpiresAt,
    },
  },
  { new: true }
);

if (!updatedOrder) {
  // The order may have been cancelled while the session was created.
  try {
    await stripe.checkout.sessions.expire(checkoutSession.id);
  } catch (error) {
    console.error("Could not expire orphaned Stripe session:", error.message);
  }

  return res.status(409).json({
    message: "Order is no longer eligible for checkout",
  });
}

console.log("Created Checkout Session:", checkoutSession.id);
console.log("Payment deadline:", paymentExpiresAt);

return res.status(201).json({
  message: "Checkout session created",
  checkoutUrl: checkoutSession.url,
  sessionId: checkoutSession.id,
  paymentExpiresAt,
});
  } catch (error) {
    console.error("Create checkout session error:", error);

    return res.status(500).json({
      message: "Could not create checkout session",
    });
  }
};


export const verifyCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return res.status(400).json({
        message: "Invalid Checkout Session ID",
      });
    }

    // Retrieve the real session directly from Stripe.
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const orderId = session.metadata?.orderId;

    if (!orderId || session.metadata?.userId !== req.user.id.toString()) {
      return res.status(403).json({
        message: "This Checkout Session does not belong to you",
      });
    }

    // Find the order belonging to the authenticated user.
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Ensure this is the exact session saved for this order.
    if (order.checkoutSessionId !== session.id) {
      return res.status(400).json({
        message: "Checkout Session does not match this order",
      });
    }

    const expectedAmount = Math.round(order.totalAmount * 100);

    if (
      session.currency !== "usd" ||
      session.amount_total !== expectedAmount
    ) {
      return res.status(400).json({
        message: "Payment amount or currency mismatch",
      });
    }

    // Stripe has not confirmed payment yet. The frontend can retry.
    if (
      session.payment_status !== "paid" ||
      session.status !== "complete"
    ) {
      return res.status(202).json({
        paymentStatus: order.paymentStatus,
        message: "Payment is still being processed",
      });
    }

    // Do not silently confirm an order that has already been cancelled.
    if (order.status === "cancelled") {
      return res.status(409).json({
        message:
          "Payment succeeded, but this order was cancelled. Please contact support.",
      });
    }

    if (order.paymentMethod !== "card") {
      return res.status(400).json({
        message: "This order is not a card payment",
      });
    }

    // The webhook normally updates this. This also handles the case
    // where the customer returns before the webhook has finished.
    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      await order.save();
    }

    return res.status(200).json({
      orderId: order._id.toString(),
      paymentStatus: order.paymentStatus,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Verify Checkout Session error:", error);

    return res.status(500).json({
      message: "Could not verify payment",
    });
  }
};
