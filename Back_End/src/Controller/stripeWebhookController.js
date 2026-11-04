import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  // Verify that the request genuinely came from Stripe.
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error.message);

    return res.status(400).send("Invalid webhook signature");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        console.log("Checkout Session ID:", session.id);
        console.log("Checkout Session metadata:", session.metadata);
        console.log("Client reference ID:", session.client_reference_id);

        // Only mark the order as paid when Stripe confirms payment.
        if (session.payment_status !== "paid") {
          break;
        }

        const orderId = session.metadata?.orderId;

        if (!orderId) {
          console.warn(
            "Ignoring Checkout Session without orderId metadata:",
            session.id,
          );

          return res.status(200).json({
            received: true,
            message: "No associated order",
          });
        }

        // Match the order to the original Stripe Checkout Session.
        const order = await Order.findById(orderId);

        if (!order) {
          console.error("Order not found:", orderId);
          return res.status(404).json({
            message: "Order not found",
          });
        }

        if (order.paymentMethod !== "card") {
          console.error("Order is not a card payment:", orderId);
          return res.status(400).json({
            message: "Order payment method mismatch",
          });
        }

        // Prevent an unrelated Checkout Session from paying this order.
        if (order.paymentStatus === "paid") {
          break;
        }

        // Verify that Stripe charged the expected amount.
        const expectedAmount = Math.round(order.totalAmount * 100);

        if (
          session.currency !== "usd" ||
          session.amount_total !== expectedAmount
        ) {
          console.error("Stripe amount/currency mismatch:", orderId);
          return res.status(400).json({
            message: "Payment amount or currency mismatch",
          });
        }

        // Update only the payment status.
        // await Order.updateOne(
        //   {
        //     _id: order._id,
        //     paymentStatus: { $ne: "paid" },
        //   },
        //   {
        //     $set: {
        //       paymentStatus: "paid",
        //     },
        //   },
        // );

        // Update the order only if it has not already been paid.
const updatedOrder = await Order.findOneAndUpdate(
  {
    _id: order._id,
    paymentStatus: "unpaid",
    status: { $ne: "cancelled" },
  },
  {
    $set: {
      paymentStatus: "paid",
    },
  },
  { new: true },
);

if (updatedOrder) {
  // Clear the cart only after payment is confirmed.
  await Cart.findOneAndUpdate(
    { user: updatedOrder.user },
    { $set: { items: [] } },
  );

  console.log("Order paid and cart cleared:", orderId);
}

        console.log("Order payment confirmed:", orderId);
        break;
      }

      default:
        console.log("Unhandled Stripe event:", event.type);
    }

    // Acknowledge successful webhook processing.
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    // Stripe can retry when your server returns a 5xx response.
    return res.status(500).json({
      message: "Webhook processing failed",
    });
  }
};
