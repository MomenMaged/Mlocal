import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [message, setMessage] = useState("Verifying your payment...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function verifyPayment(attempt = 1) {
      if (!sessionId) {
        setMessage("The Stripe session ID is missing.");
        setFailed(true);
        return;
      }

      try {
        const response = await api.get(
          `/api/orders/payment/verify-session/${encodeURIComponent(sessionId)}`
        );

        const { orderId, paymentStatus } = response.data;

        if (paymentStatus === "paid" && orderId) {
          if (!cancelled) {
            navigate(`/order-confirmation/${orderId}`, {
              replace: true,
            });
          }
          return;
        }
      } catch (err) {
        // HTTP 202 means payment is still processing.
        const status = err.response?.status;

        if (status && status !== 202 && status < 500) {
          if (!cancelled) {
            setMessage(
              err.response?.data?.message ||
                "We couldn't verify this payment."
            );
            setFailed(true);
          }
          return;
        }
      }

      if (attempt < 10 && !cancelled) {
        setMessage("Your payment is processing. Checking again...");
        timer = setTimeout(() => verifyPayment(attempt + 1), 1500);
      } else if (!cancelled) {
        setMessage(
          "We haven't received payment confirmation yet. Please check your orders before trying to pay again."
        );
        setFailed(true);
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, navigate]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="glass-strong w-full max-w-2xl rounded-glass-lg p-8 text-center sm:p-12">
        <span className={`chip ${failed ? "chip-cancelled" : "chip-processing"}`}>
          {failed ? "Payment status" : "Confirming"}
        </span>

        <h1 className="mt-5 text-3xl font-bold">
          {failed ? "Payment status" : "Confirming your order"}
        </h1>

        <p className="mt-4 text-ink-soft">{message}</p>

        {!failed && (
          <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-white/60">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-grape to-aqua" />
          </div>
        )}

        {failed && (
          <Link to="/products" className="btn-primary mt-8">
            Continue shopping
          </Link>
        )}
      </div>
    </main>
  );
}
