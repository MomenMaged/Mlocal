# AGENTS.md

## Repository layout
- No root manifest or workspace. `Back_End/` and `Front_End/Adidas_FrontEnd/` are independent npm projects; install and run each in its own directory.
- `Back_End` — Express 5 + Mongoose API, native ESM (`"type": "module"`); prepared for Vercel serverless (`src/server.js` exports `app`).
- `Front_End/Adidas_FrontEnd` — React 19 + Vite 8 + Tailwind v4 SPA, deployed with the SPA rewrite in `vercel.json`.
- `backup/AdidasDB/` is a `mongodump` snapshot (BSON + metadata), not source code. Don't edit or delete it.

## Commands
Backend, from `Back_End/`:
- `npm install`
- `npm run dev` — nodemon on `src/server.js`; `npm start` — plain node.
- There are no test, lint, or typecheck scripts. Don't invent them.

Frontend, from `Front_End/Adidas_FrontEnd/`:
- `npm install`
- `npm run dev` — Vite (port 5173 by default)
- `npm run build`, `npm run preview`
- `npm run lint` — ESLint flat config; the only automated check in the repo. No test runner or single-test command exists.

## Environment
- Backend requires a local `.env` (ignored): `MONGO_URI`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_RESET_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLIENT_URL`, `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, `EMAIL_USER`.
- Frontend `.env` only needs `VITE_API_URL`, as an origin such as `http://localhost:3000`. Calls already include `/api/...`, so do not add `/api` to the base URL.
- Password-reset mail is sent for real through Brevo. In development the reset link is hard-coded to `http://localhost:5173`; in production it uses `CLIENT_URL`.

## Backend gotchas
- `src/server.js` ordering is intentional: the Stripe webhook is mounted with `express.raw` **before** `express.json()` and the rate limiter. Moving it breaks signature verification.
- `app.listen` runs only when `NODE_ENV !== "production"`; Vercel uses the default export. Do not add an unconditional listen.
- `dns.setServers(["8.8.8.8", "1.1.1.1"])` runs before the MongoDB connection to make Atlas SRV lookups work. Leave it in place.
- Order create/cancel and card-order expiry use `session.withTransaction(...)`. A standalone MongoDB fails these with 500; use a replica set or Atlas.
- Rate limiting is an Upstash sliding window of 100 requests / 60 s, but it is keyed by the constant `"my-limit-key"` in `middleware/rateLimiter.js`. The budget is global across all users, and unreachable Upstash credentials make requests fail with 500 `"limit server error"`.
- Card orders get a 60-second `paymentExpiresAt`; a job runs every 10 s (`Jobs/expirePendingCardOrders.js`) and cancels expired unpaid card orders, restoring stock. Don't assume a card order stays pending.
- The cart is cleared server-side only for `cash_on_delivery`. Card checkout leaves the cart populated; `PaymentSuccess` only refreshes it.
- In `Router/OrderRouter.js`, static routes (`/admin`, `/payment/verify-session/:sessionId`) must stay above `/:id`, or they get captured as order IDs.
- Product `quantity` is derived from `sizes[].quantity` whenever `sizes` is sent. `sizes: []` means the product is viewable but not purchasable.
- Authorization is inconsistent: product writes, category delete, order status, admin orders/dashboard, and user admin routes require an admin token, but `POST /api/category` is unauthenticated. Check the router before assuming a rule.
- Errors are JSON `{ message }` (except the Stripe webhook). Branch on status: `409` for duplicate email or stock conflicts, `429` for limits. Cart is `404` when the user has never added an item.

## API response shapes
There is no uniform envelope. Verified shapes:
- `GET /api/products` → `{ products, pagination }`; `GET /api/products/:id` → bare product.
- `GET /api/category` → `{ count, categories }`; `POST /api/category` → `{ savedCategories }`.
- Cart reads and mutations → `{ message, cart }`; item routes use the cart item `_id`, and adding needs `size`. `POST /api/cart` increments quantity.
- `GET /api/orders` → `{ message, count, orders }`, already scoped to the caller. Admin list is `GET /api/orders/admin` → `{ orders, pagination }`.
- `POST /api/orders` → `{ message, order }`; `GET /api/orders/:id` → `{ order }`.
- `POST /api/user/login` → `{ token, id, name, email, role }`; `GET /api/user/profile` → `{ message, user }`.
- Product filters accept `filters=Category:<id>`; `price` is exact match, and the `-`/`:` delimiters make values containing them unusable.
- Order status moves only `pending → processing → shipped → delivered`. `confirmed` exists in the schema but no code sets it.

## Frontend gotchas
- Routing lives in `src/main.jsx` (there is no `App.jsx`). `AuthProvider` and `CartProvider` wrap the route tree.
- Session state is in `localStorage` keys `token` and `user` (`{ id, name, email, role }`). The role comes from the login response.
- The axios instance in `src/services/api.js` attaches the Bearer token to every request and emits `auth:token-expired` on 401. The backend rejects login when a valid token is attached (`400 "You are already logged in."`), so logging in while a session exists needs the token cleared first.
- `PaymentSuccess` confirms via `GET /api/orders/payment/verify-session/:sessionId`; it does not poll the order endpoint.
- Tailwind v4 is CSS-first: theme tokens and shared classes (`glass`, `glass-strong`, `btn-primary`, `field`, `text-ink-soft`) are defined in `src/index.css`. There is no `tailwind.config.js`.
- `dist/` is generated build output; don't edit it by hand.

## Documentation caveat
`Back_End/API_REFERENCE.md` and `Back_End/INTEGRATION_HANDOFF.md` are useful background but stale. They claim CORS is missing, the limit is 5 requests/min, login omits `role`, `GET /api/products` returns a bare array, and orders are unscoped — all no longer true. Trust the current code, and update these docs when touching the endpoints they describe.
