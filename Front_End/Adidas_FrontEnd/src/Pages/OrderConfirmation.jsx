import { Link, useParams } from "react-router-dom";

export default function OrderConfirmation() {
  const { id } = useParams();

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="glass-strong w-full max-w-2xl rounded-glass-lg p-8 text-center sm:p-12">
        <span className="chip chip-delivered">Order placed</span>

        <h1 className="mt-5 text-3xl font-bold">Thank you for your order</h1>

        <p className="mt-4 text-ink-soft">
          Your cash-on-delivery order has been created successfully.
        </p>

        <p className="mt-5 rounded-2xl bg-white/60 px-4 py-3 text-sm">
          Order ID:{" "}
          <span className="break-all font-display font-bold">{id}</span>
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/my-orders/${id}`} className="btn-primary">
            View order
          </Link>

          <Link to="/products" className="btn-glass">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
