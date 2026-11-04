# Adidas Store API — Integration Handoff

**Audience:** frontend / mobile / QA engineers integrating against this service
**Source of truth:** `M:\projects\Adidas\src` (working tree as of 2026-10-21)
**Base URL (local):** `http://localhost:3000`
**Content type:** `application/json` for everything except the Stripe webhook

---

## 1. What this service is

A Node.js + Express 5 + MongoDB e-commerce backend covering:

- user registration, login/logout (JWT + token blacklist), password reset
- products and categories
- per-user cart
- order creation with atomic stock deduction
- Stripe Checkout for card payments + Stripe webhook for payment confirmation

There is **no frontend in this repo**. All pages below are endpoints you call.

---

## 2. Before you start

### 2.1 Run it

```bash
npm install
npm run dev     # nodemon src/server.js
```

Required `.env` keys (already present locally):

| Key | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `PORT` | HTTP port, defaults to `3000` |
| `JWT_SECRET` | signs access tokens |
| `JWT_EXPIRES_IN` | access token lifetime, currently `30m` |
| `JWT_RESET_SECRET` | signs password-reset tokens (10 min) |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Stripe signature verification |
| `CLIENT_URL` | base for the reset-password link and Stripe redirect URLs |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | rate limiter backing store |

### 2.2 Deployment requirement: MongoDB replica set

`POST /api/orders` and `PATCH /api/orders/:id/cancel` run inside
`session.withTransaction(...)`. A **standalone mongod will fail these calls**
(`Transaction numbers are only allowed on a replica set member or mongos`).
Use a replica set locally (or Atlas) before testing orders.

### 2.3 CORS is not configured

`src/server.js` never enables CORS and `cors` is not a dependency. A browser app on
`http://localhost:5173` (or any other origin) will be blocked on the
`Authorization` preflight. Until this is added, integrate from:

- server-side / Postman / curl, or
- a dev proxy in your frontend dev server, or
- ask backend to add `app.use(cors({ origin: CLIENT_URL }))`.

This is a **hard blocker for any browser client**.

---

## 3. Cross-cutting conventions

### 3.1 Auth

Send the JWT on every protected call:

```
Authorization: Bearer <token>
```

- Tokens are signed with `{ UserId, role }` and expire after `JWT_EXPIRES_IN` (30 min).
- **Logout is real**: the token hash is written to a `TokenBlacklist` collection and
  rejected until its natural expiry. Reuse of a logged-out token returns `401`.
- There is no refresh token endpoint. On `401` the client must send the user back to login.
- `login` returns `token`, `id`, `name`, `email` — but **not `role`**. If the UI needs to
  show admin controls you must decode the JWT payload (base64) or ask backend to return it.

### 3.2 Rate limiting

A global Upstash sliding-window limiter runs on **every** request:
**5 requests per 60 seconds**.

Two consequences worth planning around:

1. The limiter key is a single constant (`"my-limit-key"`), so the budget is shared by
   **all clients combined**, not per IP or per user. Parallel page loads will hit `429`
   almost immediately.
2. When limited, the body is `{ "message": "Too many requests, please try again later." }`.

For local development this is the single most disruptive behaviour. Ask backend to key on
IP/user id before doing end-to-end testing, or run with the limiter short-circuited.

### 3.3 Response envelopes are inconsistent

Do not write a generic unwrapper. Actual shapes:

| Endpoint group | Shape |
| --- | --- |
| `GET /api/products` | bare array `[ ... ]` |
| `GET /api/products/:id` | bare object |
| `GET /api/category` | `{ count, categories: [] }` |
| `POST /api/category` | `{ savedCategories: {...} }` |
| `POST /api/products` | `{ savedProducts: {...} }` |
| `GET /api/user` | bare array `[ ... ]` |
| `GET /api/user/:id` | bare object |
| Cart endpoints | `{ message, cart }` |
| `GET /api/orders`, `GET /api/orders/:id` | `{ order }` (array or object) |
| `POST /api/orders` | `{ message, order }` |

### 3.4 Error shape

Errors are `{ "message": "<text>" }` (the Stripe webhook is the exception and returns
plain text). There is no error `code` field — branch on HTTP status, not on message text.

| Status | Meaning in this API |
| --- | --- |
| `400` | validation failed (bad body, bad enum, bad id, stock/state rule) |
| `401` | missing/invalid/expired token, or blacklisted token |
| `403` | authenticated but wrong role (`admin` only routes) |
| `404` | resource not found (order, product, cart, user) |
| `409` | email already registered, or stock ran out during order creation |
| `429` | rate limited |
| `500` | unhandled server error |

### 3.5 Identifiers, money, dates

- IDs are MongoDB ObjectId strings (24 hex chars).
- `price`, `totalAmount` are **Numbers in USD**, not cents. Convert with
  `Math.round(value * 100)` when displaying/charging.
- `createdAt` / `updatedAt` are ISO-8601 strings on User, Cart, and Order.

---

## 4. Endpoint reference

Legend: 🔓 public · 🔑 any authenticated user · 🛡️ `admin` role required

### 4.1 Authentication & users — `/api/user`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/user` | 🔓 | Register |
| `POST` | `/api/user/login` | 🔓 | Log in |
| `POST` | `/api/user/logout` | 🔑 | Invalidate the current token |
| `POST` | `/api/user/forgot-password` | 🔓 | Email a reset link |
| `POST` | `/api/user/reset-password` | 🔓 | Set a new password with a reset token |
| `GET` | `/api/user` | 🔓 | List all users |
| `GET` | `/api/user/:id` | 🔓 | Get one user |
| `PUT` | `/api/user/:id` | 🔓 | Update a user |
| `DELETE` | `/api/user/:id` | 🔓 | Delete a user |

> ⚠️ `GET /api/user`, `GET /api/user/:id`, `PUT /api/user/:id` and `DELETE /api/user/:id`
> have **no authentication**. `GET /api/user` returns every user document **including the
> bcrypt password hash**. Do not call these from a client; see §7.

#### Register

```http
POST /api/user
Content-Type: application/json

{
  "name": "Mo'men",
  "email": "momen@example.com",
  "password": "Secret123",
  "role": "user"
}
```

`201` → `{ "savedUser": { "_id", "name", "email", "password": "<bcrypt hash>", "role", "createdAt", "updatedAt" } }`

Notes:

- `role` is accepted from the body and is **not** restricted, i.e. a caller can self-register
  as `admin`.
- The response echoes the password hash. Ignore that field.
- Password strength is not validated here (only `required`). The reset flow enforces 8 characters.
- Missing `name`, `email` or `password` is **not** mapped to `400`: the hashing/save throws and the
  client receives `500 { "message": "Internal server error" }`. Validate required fields before
  calling.
- Duplicate email → `409 { "message": "Email already exists" }`.

#### Login

```http
POST /api/user/login
Content-Type: application/json

{ "email": "momen@example.com", "password": "Secret123" }
```

`200` →

```json
{
  "message": "Login successfully",
  "token": "eyJhbGciOi...",
  "id": "665f1c...",
  "name": "Mo'men",
  "email": "momen@example.com"
}
```

- Wrong email or password → `401 { "message": "Invalid email or password" }` (same message for both,
  so don't try to distinguish them in the UI).
- If you send a **still-valid** `Authorization: Bearer` header, login returns
  `400 { "message": "You are already logged in." }`. Do not attach the interceptor's token to
  the login request itself.
- No `role` in the response (see §3.1).

#### Logout

```http
POST /api/user/logout
Authorization: Bearer <token>
```

`200 { "message": "Logout successful" }`. The token is dead immediately; discard it client-side.

#### Forgot password

```http
POST /api/user/forgot-password
Content-Type: application/json

{ "email": "momen@example.com" }
```

- `200 { "message": "If the email exists, a reset link will be sent." }`
- `404 { "message": "No user found with this email" }` — the handler comments say it should
  not reveal existence, but it does. Treat `404` as "unknown email" in the UI or ask backend to
  make it always `200`.
- The email is sent through an **Ethereal test account** created at boot. Nothing reaches a real
  inbox; the preview URL is printed to the server console (`Ethereal email preview: ...`).
- The link is hard-coded to `http://localhost:3000/reset-password?token=...`, i.e. it points at
  **this API**, which serves no HTML. Your reset page must read the `token` query param and call
  `POST /api/user/reset-password` itself.

#### Reset password

```http
POST /api/user/reset-password
Content-Type: application/json

{ "token": "<token from the email link>", "newPassword": "NewSecret123" }
```

- `200 { "message": "Password reset successfully" }`
- `400` for missing fields, password shorter than 8 chars, or invalid/expired token.
- Existing sessions are **not** revoked by a password reset — old JWTs stay valid until expiry.

### 4.2 Categories — `/api/category`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/category` | 🔓 | List categories |
| `POST` | `/api/category` | 🔓 | Create category |
| `DELETE` | `/api/category/:id` | 🛡️ | Delete category |

```http
GET /api/category
```

```json
{
  "count": 2,
  "categories": [
    { "_id": "665f20...", "name": "Running" },
    { "_id": "665f21...", "name": "Lifestyle" }
  ]
}
```

`POST` body `{ "name": "Running" }` → `201 { "savedCategories": { "_id", "name" } }`.

`DELETE` → `200 { "message": "Deleted" }` or `404`.

> ⚠️ Creating a category is public. Deleting a category does **not** detach or block products
> that reference it, so products can end up pointing at a missing category.

### 4.3 Products — `/api/products`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/products` | 🔓 | List / search / sort / paginate |
| `GET` | `/api/products/:id` | 🔓 | Product detail |
| `POST` | `/api/products` | 🔓 | Create |
| `PUT` | `/api/products/:id` | 🔓 | Update |
| `DELETE` | `/api/products/:id` | 🛡️ | Delete |

#### List

```
GET /api/products?search=ultra&filters=Category:<categoryId>-price:<exactPrice>&page=1&limit=10&sortName=asc&sortPrice=desc
```

| Query param | Rules | Default |
| --- | --- | --- |
| `search` | case-insensitive regex on `name` | `""` (no filter) |
| `filters` | `key:value` pairs joined by `-`; supported keys `Category`, `price` | none |
| `page` | positive integer | `1` |
| `limit` | integer 1–100 | `10` |
| `sortName` | `asc` \| `desc` | none |
| `sortPrice` | `asc` \| `desc` | none |

Responses:

- `200` → bare array of products (see §5.2), `categories` populated as a Category object.
- `400` for a non-integer/out-of-range `page`, `limit`, or an invalid `sort*` value,
  or a `skip` beyond 100000.
- There is **no `total`/`pageCount` in the response**. Pagination is "keep requesting until you
  get fewer than `limit` items".

Two filter caveats:

- `Category:` compares the ObjectId field against `Number(value)`. Because `categories` is an
  ObjectId, **the category filter never matches**. Filter by category on the client after
  fetching, or ask backend to fix it.
- `price:` is an **exact equality** match, not a range. Range filtering is not implemented.
- `filters` splits on `-`, so any value containing `-` breaks parsing.

#### Create

```http
POST /api/products
Content-Type: application/json

{
  "name": "Ultraboost Light",
  "price": 189.99,
  "categories": "665f20...",
  "image": "https://example.com/ultraboost.jpg",
  "sizes": [
    { "size": "40", "quantity": 3 },
    { "size": "41", "quantity": 5 }
  ]
}
```

`201 { "savedProducts": { "_id", "name", "price", "categories", "image", "sizes": [...], "quantity" } }`
→ `400 { "message": "Can't create" }` on validation failure (message is generic).

- `sizes` is optional and defaults to `[]`.
- Size labels are free text (`"40"`, `"M"`, `"One Size"`), must be unique per product.
- Each `quantity` must be a non-negative integer.
- `quantity` (total stock) is **derived** from `sizes`; do not send it when sending `sizes`.

#### Update / delete

`PUT`/`PATCH` body `{ name, price, categories, image, sizes }` — omitted fields are left unchanged.
When `sizes` is present, total `quantity` is recalculated from it. If `sizes` is omitted, a plain
`quantity` value is still accepted for legacy callers. `200 { "updatedProduct": {...} }`.

`DELETE` (admin) → `200 { "message": "Deleted" }`.

> ⚠️ `POST` and `PUT` on products are public. Only `DELETE` is admin-guarded.

### 4.4 Cart — `/api/cart` (all 🔑)

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/cart` | — | Read cart |
| `POST` | `/api/cart` | `{ productId, size, quantity? }` | Add / increment |
| `PATCH` | `/api/cart/items/:itemId` | `{ quantity }` | Set absolute quantity |
| `DELETE` | `/api/cart/items/:itemId` | — | Remove one line |
| `DELETE` | `/api/cart` | — | Empty cart |

One cart per user (`user` is unique). A cart document is created lazily on first add.
A cart line is identified by **product + size**; the same product in two sizes is two lines.

Success shape (all mutating calls):

```json
{
  "message": "Product added to cart successfully",
  "cart": {
    "_id": "665f30...",
    "user": "665f1c...",
    "items": [
      {
        "_id": "665f31...",
        "product": { "_id": "665f22...", "name": "Ultraboost Light", "price": 189.99, "categories": {...}, "sizes": [...], "quantity": 8 },
        "size": "40",
        "quantity": 2
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

`items[].product` is the **fully populated product document** (not just an id). After
`DELETE /api/cart` (clear) the same envelope returns `cart.items: []`.

Rules and statuses:

- `POST` requires `size` (string). Missing/blank → `400 { "message": "Size is required" }`.
- A size that the product doesn't offer → `400` with `availableSizes`.
- `POST` with `quantity` omitted defaults to `1`. Non-integer or `< 1` → `400`.
- `quantity` is **incremented** for that product+size, not set. Adding 2 twice yields 4.
- Stock is checked against the selected size's remaining stock:
  `400 { "message": "Not enough stock available", "availableQuantity": 3, "quantityAlreadyInCart": 1 }`
- `PATCH`/`DELETE` use the **cart item `_id`** from `items[]._id`, not `productId`.
- Unknown product → `404`. Non-existent `productId` format also surfaces as `500`
  (`CastError` is not mapped), so validate the id client-side.
- `GET /api/cart` before any add → `404 { "message": "No cart for this user" }`.
  A brand-new user therefore 404s; treat that as an empty cart.
- `PATCH` sets the quantity outright (must be ≥ 1; cannot remove via `PATCH` — use `DELETE`).
- The cart is **not cleared for card orders** until payment expires/succeeds (see §7), so remove
  items yourself after a successful card checkout if the UI expects an empty cart. COD orders
  clear the cart inside the order transaction.

### 4.5 Orders — `/api/orders` (all 🔑 unless noted)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | 🔑 | Create order from cart |
| `GET` | `/api/orders` | 🔑 | List orders |
| `GET` | `/api/orders/:id` | 🔑 | Get order |
| `PATCH` | `/api/orders/:id/cancel` | 🔑 | Cancel + restock |
| `POST` | `/api/orders/:id/checkout` | 🔑 | Stripe Checkout session |
| `PATCH` | `/api/orders/status/:id` | 🛡️ | Advance fulfilment status |

#### Create

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "Mo'men",
    "phone": "+201234567890",
    "street": "12 Nile St",
    "city": "Cairo",
    "postalCode": "11511",
    "country": "EG"
  },
  "paymentMethod": "card"
}
```

Required address strings: `fullName`, `phone`, `street`, `city`, `country`.
`postalCode` is optional. `paymentMethod` must be `cash_on_delivery` or `card`.

`201` →

```json
{
  "message": "Order created and stock deducted successfully",
  "order": {
    "_id": "665f40...",
    "user": "665f1c...",
    "items": [
      { "product": "665f22...", "name": "Ultraboost Light", "price": 189.99, "quantity": 2, "size": "40" }
    ],
    "totalAmount": 379.98,
    "shippingAddress": { "...": "..." },
    "status": "pending",
    "paymentStatus": "unpaid",
    "paymentMethod": "card",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Behaviour to plan for:

- Prices, names, quantities and **sizes** are snapshotted into the order. Later product edits
  don't change historical orders.
- Stock is deducted atomically **per size** inside a transaction; if any item fails, the whole
  order rolls back → `409 { "message": "Not enough stock for <name> in size <size>" }`.
- A cart line whose size is no longer offered → `400`.
- Empty/missing cart → `400 { "message": "Your cart is empty" }`.
- `card` orders are still created **`unpaid`**. Creating an order does not charge anything;
  call the checkout endpoint next.
- `cash_on_delivery` orders skip payment entirely and stay `unpaid`.

#### List / get

`GET /api/orders` → `200 { "order": [ ...all orders in the database... ] }`

> ⚠️ This is **not scoped to the caller**. Every authenticated user sees every order.
> The response also lacks `populate`, so `user`/product refs are raw ids. Do not build an
> "my orders" page on this; see §7.

`GET /api/orders/:id` → `200 { "order": {...} }`. This one *is* a lookup by id with no ownership
check, so any authenticated user can read any order if they know the id. Invalid id → `500`.

#### Cancel

```http
PATCH /api/orders/:id/cancel
Authorization: Bearer <token>
```

`200 { "message": "Order cancelled and stock restored successfully" }`

Allowed only when the order belongs to the caller, `status === "pending"`, and
`paymentStatus !== "paid"`. Otherwise:

- `404 Order not found` (not yours / doesn't exist)
- `400 Only pending orders can be cancelled`
- `400 This order requires a refund process` (paid card orders)
- `400 Invalid order ID`

Restock is transactional with the status change and is restored to the **original size**.

#### Status transitions (admin)

```http
PATCH /api/orders/status/:id
Authorization: Bearer <admin token>
Content-Type: application/json

{ "status": "processing" }
```

Only forward moves are accepted:

```
pending → processing → shipped → delivered
```

`400` for anything else (`Cannot change order status from <current> to <target>`).
`cancelled` and `delivered` are terminal. `400` is also returned for values other than
`processing | shipped | delivered`.

### 4.6 Payments — Stripe

#### Create a Checkout Session

```http
POST /api/orders/:id/checkout
Authorization: Bearer <token>
```

`201` →

```json
{
  "message": "Checkout session created",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

Redirect the browser to `checkoutUrl`.

Preconditions (each returns `400` unless noted):

- order must belong to the caller (`404` otherwise)
- `paymentMethod` must be `card` (`"This order is not a card payment"`)
- `paymentStatus` must not be `paid` and `status` must be `pending`
- `totalAmount` must be > 0

Stripe config baked into the session:

- currency **USD**; line items are one per order item at `round(price * 100)`
- `success_url` → `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`
- `cancel_url` → `${CLIENT_URL}/payment-cancelled`
- metadata `{ orderId, userId }` and `client_reference_id = orderId`

#### Redirect handling

Your frontend owns `/payment-success` and `/payment-cancelled` on `CLIENT_URL`.
On success, Stripe appends `session_id`. **That page must not mark anything paid** — the order
becomes `paid` only via the webhook. Recommended pattern:

1. land on `/payment-success?session_id=...`
2. poll `GET /api/orders/:id` (the id you stored before redirecting) until
   `paymentStatus === "paid"`, with a timeout
3. show confirmation

`CLIENT_URL` currently equals `http://localhost:3000`, the same port as this API, so redirects
land on the API server until it is changed to the frontend's origin.

#### Webhook (server-to-server, not for clients)

```http
POST /api/payments/webhook
stripe-signature: <from Stripe>
Content-Type: application/json   (raw body)
```

- Verified against `STRIPE_WEBHOOK_SECRET`; invalid signature → `400 Invalid webhook signature`.
- Handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Only flips `paymentStatus` to `paid` when `payment_status === "paid"`, the order exists, its
  method is `card`, and Stripe's `currency`/`amount_total` match the order.
- Idempotent: an already-paid order is skipped.
- Returns `200 { "received": true }`; non-2xx makes Stripe retry.

Local testing:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

---

## 5. Data models

### 5.1 User

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "bcrypt hash",
  "role": "user | admin",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### 5.2 Product

```json
{
  "_id": "ObjectId",
  "name": "string",
  "price": 189.99,
  "image": "string?",
  "categories": "ObjectId → Category",
  "sizes": [ { "size": "40", "quantity": 3 } ],
  "quantity": 3
}
```

`quantity` is the **derived total** (`sum of sizes[].quantity`). `sizes` may be `[]` for products
created before per-size stock existed; those are not purchasable until an admin adds sizes.
No timestamps on this model.

### 5.3 Category

```json
{ "_id": "ObjectId", "name": "string" }
```

### 5.4 Cart

```json
{
  "_id": "ObjectId",
  "user": "ObjectId (unique)",
  "items": [ { "product": "ObjectId | populated Product", "size": "40", "quantity": 2, "_id": "ObjectId" } ],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### 5.5 Order

```json
{
  "_id": "ObjectId",
  "user": "ObjectId",
  "items": [ { "product": "ObjectId", "name": "string", "price": 0, "quantity": 1, "size": "40" } ],
  "totalAmount": 0,
  "shippingAddress": {
    "fullName": "string",
    "phone": "string",
    "street": "string",
    "city": "string",
    "postalCode": "string?",
    "country": "string"
  },
  "status": "pending | confirmed | processing | shipped | delivered | cancelled",
  "paymentStatus": "unpaid | paid | failed | refunded",
  "paymentMethod": "cash_on_delivery | card",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

`confirmed` exists in the schema enum but no endpoint produces it; treat it as unused.
`failed` / `refunded` are also never set by the current code.

---

## 6. End-to-end flows

### 6.1 Register → browse → cart → order

```
POST /api/user                  → 201, keep _id
POST /api/user/login            → 200, keep token
GET  /api/category              → build category nav
GET  /api/products?page=1&limit=10
GET  /api/products/:id          → detail page
POST /api/cart {productId, size, quantity}
GET  /api/cart                  → cart badge / cart page
PATCH /api/cart/items/:itemId {quantity}   (qty stepper)
DELETE /api/cart/items/:itemId             (remove)
POST /api/orders {shippingAddress, paymentMethod}
```

### 6.2 Cash on delivery

```
POST /api/orders {..., "paymentMethod": "cash_on_delivery"}
→ 201, status "pending", paymentStatus "unpaid"  (done — no payment step)
```

### 6.3 Card payment

```
POST /api/orders {..., "paymentMethod": "card"}
→ 201, keep order._id
POST /api/orders/<orderId>/checkout
→ 201 { checkoutUrl }
window.location = checkoutUrl
Stripe → CLIENT_URL/payment-success?session_id=...
   (webhook flips paymentStatus → "paid" in the background)
GET /api/orders/<orderId> → poll until paymentStatus === "paid"
```

### 6.4 Admin fulfilment

```
POST /api/user/login (admin)                        → 403-free token
PATCH /api/orders/status/:id {status:"processing"}
PATCH /api/orders/status/:id {status:"shipped"}
PATCH /api/orders/status/:id {status:"delivered"}
```

### 6.5 Password reset

```
POST /api/user/forgot-password {email}
→ read the token from the Ethereal preview link in the server console
POST /api/user/reset-password {token, newPassword}
→ log the user in again (old sessions are not revoked)
```

---

## 7. Known gaps — read before building

These are behaviours in the current code that will surprise an integrator. File references are
for the backend owner.

| # | Severity | Issue | Impact | Where |
| --- | --- | --- | --- | --- |
| 1 | **Blocker** | CORS not enabled | Any separate-origin browser client fails preflight | `src/server.js` |
| 2 | **Blocker** | Rate limiter uses one global key, 5 req/60 s | All clients share the budget; normal browsing 429s | `src/middleware/rateLimiter.js`, `src/config/upstash.js` |
| 3 | **Critical** | `GET /api/user` is public and returns password hashes | Credential exposure; never call it | `src/Controller/UserController.js` |
| 4 | **Critical** | `PUT /api/user/:id` and `DELETE /api/user/:id` are public | Anyone can change any account's email/password or delete it | `src/Router/UserRouter.js` |
| 5 | **Critical** | `GET /api/orders` returns every order in the DB | No tenant isolation; "my orders" is not implementable as-is | `src/Controller/orderController.js` |
| 6 | **High** | `GET /api/orders/:id` has no ownership check | Any user can read any order by id | `src/Controller/orderController.js` |
| 7 | **High** | Product `POST`/`PUT` and category `POST` are unauthenticated | Catalog can be modified by anyone | `src/Router/ProductRouter.js`, `CategoryRouter.js` |
| 8 | **High** | `POST /api/user` accepts `role` | Privilege escalation to `admin` at signup | `src/Controller/UserController.js` |
| 9 | **High** | Cart is not cleared after order creation | Re-submitting creates a duplicate order for the same items | `src/Controller/orderController.js` |
| 10 | Medium | `PUT /api/user/:id` stores `password` without hashing | Breaks login after a profile update that includes a password | `src/Controller/UserController.js` |
| 11 | Medium | Category filter compares ObjectId to Number | `filters=Category:<id>` always returns nothing | `src/Controller/ProductController.js` |
| 12 | Medium | No pagination metadata; `price` filter is exact-match | Client must paginate blind; no range filtering | `src/Controller/ProductController.js` |
| 13 | Medium | `GET /api/user/:id`, `GET /api/orders/:id`, unparseable cart ids return `200/500` before the not-found check | Null bodies, misleading 500s | `UserController.js`, `orderController.js` |
| 14 | Medium | Rate limiter calls `next()` after already sending `500` | Double-response / header errors when Redis is down | `src/middleware/rateLimiter.js` |
| 15 | Low | `forgot-password` returns `404` for unknown emails | Account enumeration; contradicts its own comment | `src/Controller/forgotPassword.js` |
| 16 | Low | Password reset does not revoke existing tokens | A stolen token survives a password change | `src/Controller/resetPassword.js` |
| 17 | Low | Email is Ethereal only; reset link hard-coded to `localhost:3000` | No real delivery; link points at the API, not a UI | `src/config/email.js`, `forgotPassword.js` |
| 18 | Low | `CLIENT_URL` equals the API port | Stripe success/cancel URLs hit the API | `.env` |
| 19 | Low | Login response has no `role` | UI must decode the JWT | `src/Controller/UserController.js` |
| 20 | Low | No `cors`, `helmet`, request-id, or structured logging | Harder to operate and debug | `src/server.js` |

### Workarounds for the frontend, today

- **"My orders"**: fetch `GET /api/orders` and filter client-side on `order.user === myId`.
  Works only because the endpoint leaks everything; replace once #5 is fixed.
- **Cart badge on fresh account**: treat `404` from `GET /api/cart` as `items: []`.
- **Post-checkout cart**: call `DELETE /api/cart` yourself after `POST /api/orders` succeeds.
- **Category filtering**: filter client-side; the server filter is broken (#11).
- **Pagination total**: request `limit=100` and page locally, or accept "stop when short page".

---

## 8. Smoke test checklist

Run in order against a replica-set MongoDB (expect 429s if the limiter is live — see §3.2):

1. `POST /api/user` → `201`
2. `POST /api/user/login` → `200` + token
3. `GET /api/category` → `200`
4. `POST /api/products` with `sizes: [{ "size": "40", "quantity": 5 }]` → `201` (note its `_id`)
5. `GET /api/products?page=1&limit=10&sortPrice=asc` → `200`, products + pagination
6. `POST /api/cart {productId, size:"40"}` → `200`, `cart.items[0].quantity === 1`
7. `POST /api/cart {productId, size:"40"}` → quantity `2` on the same line
8. `POST /api/cart {productId, size:"41"}` → a **second** line (size 41)
9. `PATCH /api/cart/items/<itemId> {quantity:1}` → quantity `1`
10. `DELETE /api/cart/items/<itemId>` → line removed
11. `POST /api/orders` (COD) → `201`, `status: pending`, only the purchased size decremented
12. `PATCH /api/orders/:id/cancel` → `200`, that size restored
11. `POST /api/orders` (card) → `201`
12. `POST /api/orders/:id/checkout` → `201` + `checkoutUrl`
13. Pay with test card `4242 4242 4242 4242`; confirm `GET /api/orders/:id` shows `paymentStatus: "paid"`
14. `POST /api/user/logout` → `200`; reuse the token → `401`

---

## 9. Asking backend for changes

If any item in §7 blocks your work, send this list rather than working around it:

1. Enable CORS for `CLIENT_URL`.
2. Key the rate limiter per IP/user and raise the budget.
3. Put `authMiddleware` (and `authorizeRoles("admin")` where relevant) on all user, product-write,
   and category-write routes; strip `password` from every user response.
4. Scope `GET /api/orders` and `GET /api/orders/:id` to `req.user.id`; add
   `GET /api/orders?status=` filtering and pagination.
5. Clear the cart inside the order transaction.
6. Reject `role` in registration (or force `"user"`).
7. Fix the category filter, add `total`/`pageCount` to product listing, and support price ranges.
8. Return `role` on login and a `code` field on errors.
9. Hash passwords in `PUT /api/user/:id`, and revoke tokens on password reset.
10. Point `CLIENT_URL` at the frontend and send reset mail through a real provider.
