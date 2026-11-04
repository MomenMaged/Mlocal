
import mongoose from "mongoose";
import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

async function expireOrder(orderId) {
  let session;

  try {
    // Re-read before contacting Stripe.
    const order = await Order.findById(orderId);

    if (
      !order ||
      order.paymentMethod !== "card" ||
      order.status !== "pending" ||
      order.paymentStatus !== "unpaid" ||
      !order.paymentExpiresAt ||
      order.paymentExpiresAt > new Date()
    ) {
      return;
    }

    // If a Checkout Session exists, ask Stripe to expire it.
    if (order.checkoutSessionId) {
      try {
        const checkoutSession =
          await stripe.checkout.sessions.retrieve(
            order.checkoutSessionId
          );

        if (
          checkoutSession.payment_status === "paid" ||
          checkoutSession.status === "complete"
        ) {
          // A completed session must be reconciled with the
          // webhook, not blindly cancelled.
         
          return;
        }

        if (checkoutSession.status === "open") {
          await stripe.checkout.sessions.expire(
            order.checkoutSessionId
          );
        }
      } catch (error) {
        console.error(
          "Could not expire Stripe session:",
          order.checkoutSessionId,
          error.message
        );

        // Do not restore stock if Stripe's session state
        // could not be verified.
        return;
      }
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const currentOrder = await Order.findOne({
        _id: orderId,
        paymentMethod: "card",
        status: "pending",
        paymentStatus: "unpaid",
        paymentExpiresAt: { $lte: new Date() },
      }).session(session);

      // Another request or the webhook may have handled it.
      if (!currentOrder) return;

      if (currentOrder.stockDeducted) {
        for (const item of currentOrder.items) {
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
            throw new Error(
              `Could not restore stock for ${item.name}`
            );
          }
        }

        currentOrder.stockDeducted = false;
      }

      currentOrder.status = "cancelled";
      await currentOrder.save({ session });

      console.log("Expired unpaid order:", orderId);
    });
  } catch (error) {
    console.error(
      "Order expiration failed:",
      orderId,
      error.message
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export function startOrderExpirationJob() {
  const checkExpiredOrders = async () => {
    try {
      const expiredOrders = await Order.find({
        paymentMethod: "card",
        status: "pending",
        paymentStatus: "unpaid",
        paymentExpiresAt: { $lte: new Date() },
      })
        .select("_id")
        .limit(100)
        .lean();

      for (const order of expiredOrders) {
        await expireOrder(order._id);
      }
    } catch (error) {
      console.error(
        "Expired-order scan failed:",
        error.message
      );
    }
  };

  // Run once at startup so overdue orders are handled after restart.
  void checkExpiredOrders();

  // Then check periodically.
  return setInterval(() => {
    void checkExpiredOrders();
  }, 10_000);
}
