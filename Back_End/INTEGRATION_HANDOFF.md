# Adidas Store — Frontend Integration Handoff

**For:** the frontend team
**API:** `http://localhost:3000` (Node/Express + MongoDB)
**Last updated:** 2026-10-21
**Companion file:** `API_REFERENCE.md` — the deep endpoint/model reference and backend issue list.
This document is the one to build against.

---

## 0. Read this first — 3 things that will block you today

| # | Problem | What you do about it |
| --- | --- | --- |
| 1 | **The API has no CORS headers.** Calling it from `localhost:5173` or any other origin fails on preflight. | Run the dev server with a **proxy** (config in §1.2). Do not try to "fix" it on the client. |
| 2 | **Rate limit is 5 requests per 60 seconds, shared by EVERYONE** (one global key, not per user/IP). | Load pages with the smallest possible number of calls, cache categories, debounce search inputs, and poll payment status no faster than every 15s. Ask backend to fix this before QA. |
| 3 | **Products have no description, colours, or brand.** They now have `image` and `sizes` (`[{ size, quantity }]`), but products created before that change have `sizes: []` until an admin fills them in. | Build the PDP around `image` and per-size stock. Treat a product with no sizes as not purchasable and let the admin add sizes first. |

If those three are unresolved, end-to-end browser testing will be painful. Everything else in
this doc assumes you work around them.

---

## 1. Project setup

### 1.1 Environment

```bash
# .env.local
VITE_API_URL=http://localhost:3000
```

```ts
// src/lib/config.ts
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
```

If you use the proxy below, set `VITE_API_URL=""` and call paths as `/api/...`.

### 1.2 Dev proxy (required while CORS is missing)

**Vite**

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
```

**Next.js**

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://localhost:3000/api/:path*" }];
  },
};
```

Browser calls then go to your own origin (`/api/...`), and the dev server forwards them. No CORS
involved. In production this needs a real reverse proxy or a CORS fix on the API.

---

## 2. API client

Every response is JSON. Errors are `{ "message": "..." }` with no error code, so branch on
**HTTP status**, not message text.

### 2.1 Drop-in client

```ts
// src/lib/api.ts
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "adidas_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  // The API is inconsistent: sometimes `[]`, sometimes `{ data: [] }`.
  // Some failures return non-JSON, so parse defensively.
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event("auth:expired")); // your router listens and redirects
    }
    throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
  }

  return body as T;
}
```

> **Do not attach the token to the login request.** If a still-valid token is sent to
> `POST /api/user/login`, the API replies `400 "You are already logged in."` and the user cannot
> switch accounts. Use a bare `fetch` for login.

### 2.2 Token facts

- JWT, expires in **30 minutes**, no refresh endpoint.
- Logout truly invalidates the token server-side.
- On any `401`: clear the token, redirect to `/login`, preserve the intended destination.
- The login response does **not** include `role`. Decode it:

```ts
export function decodeJwt(token: string) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(payload)) as {
    UserId: string;
    role: "user" | "admin";
    iat: number;
    exp: number;
  };
}
```

- Store the user id from the login response (`id`) — you need it for the "my orders" workaround
  (§7.3).

### 2.3 Response-shape cheatsheet

There is no consistent envelope. Normalize at the edge of your data layer:

```ts
export const listOf = <T, K extends string>(body: any, key: K): T[] =>
  Array.isArray(body) ? body : (body?.[key] ?? []);
```

| Call | Actual shape |
| --- | --- |
| `GET /api/products` | `Product[]` |
| `GET /api/products/:id` | `Product` |
| `GET /api/category` | `{ count, categories: Category[] }` |
| `GET /api/cart` | `{ message, cart: Cart }` |
| `POST/PATCH/DELETE /api/cart*` | `{ message, cart: Cart }` |
| `POST /api/orders` | `{ message, order: Order }` |
| `GET /api/orders` | `{ order: Order[] }` |
| `GET /api/orders/:id` | `{ order: Order }` |
| `POST /api/orders/:id/checkout` | `{ message, checkoutUrl, sessionId }` |
| `POST /api/user/login` | `{ message, token, id, name, email }` |
| `POST /api/user` | `{ savedUser: User }` |
| `GET /api/user/:id` | `User` (bare) |

### 2.4 Status → UI meaning

| Status | Meaning | Typical UI |
| --- | --- | --- |
| `400` | validation / business rule | inline field error or toast with `message` |
| `401` | missing, expired, or logged-out token | clear token → `/login` |
| `403` | not an admin | hide admin UI; never rely on client-side hiding alone |
| `404` | not found (also: **empty cart**) | empty state |
| `409` | email taken, or stock ran out at order time | field error / "item sold out" |
| `429` | rate limited | "Too many requests", back off 60s |
| `500` | server error (also: malformed ObjectId!) | generic error card |

Validate ObjectId strings client-side (`/^[a-f\d]{24}$/i`) before hitting the API — a malformed id
becomes a `500`, not a `400`.

---

## 3. Types

```ts
export interface Category {
  _id: string;
  name: string;
}

export interface ProductSize {
  size: string;           // free text: "40", "M", "One Size"
  quantity: number;       // stock for this size
}

export interface Product {
  _id: string;
  name: string;
  price: number;          // USD, decimals — NOT cents
  categories: Category | string; // populated object on list/detail
  image?: string;
  sizes: ProductSize[];   // empty until an admin adds sizes
  quantity: number;       // derived total: sum of sizes[].quantity
  // no description, colour, brand, rating, createdAt
}

export interface CartItem {
  _id: string;            // use this id for PATCH/DELETE
  product: Product;       // fully populated after every cart call
  size: string;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode?: string;
  country: string;
}

export interface OrderItem {
  product: string;        // id only, not populated
  name: string;
  price: number;
  quantity: number;
  size?: string;          // absent on orders created before sizes existed
}

export type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cash_on_delivery" | "card";

export interface Order {
  _id: string;
  user: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  token: string;
}
```

`totalAmount` is the **sum of item prices only**. There is no shipping, tax, or discount field.

---

## 4. Pages → API map

| Route | Auth | Calls |
| --- | --- | --- |
| `/register` | public | `POST /api/user` |
| `/login` | public | `POST /api/user/login` |
| `/forgot-password` | public | `POST /api/user/forgot-password` |
| `/reset-password?token=` | public | `POST /api/user/reset-password` |
| `/` | public | `GET /api/category`, `GET /api/products?limit=8&sortPrice=asc` |
| `/products` | public | `GET /api/category`, `GET /api/products?...` |
| `/products/:id` | public | `GET /api/products/:id` |
| `/cart` | user | `GET /api/cart`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart` |
| `/checkout` | user | `GET /api/cart`, `POST /api/orders`, then `POST /api/orders/:id/checkout` (card only) |
| `/payment-success?session_id=` | user | `GET /api/orders/:id` (poll) |
| `/payment-cancelled` | user | none |
| `/account/orders` | user | `GET /api/orders` (filter client-side) |
| `/account/orders/:id` | user | `GET /api/orders/:id`, `PATCH /api/orders/:id/cancel` |
| `/admin/orders` | admin | `GET /api/orders`, `PATCH /api/orders/status/:id` |
| `/admin/products` | admin | `GET /api/products`, `POST`/`PUT`/`DELETE /api/products/:id` |
| `/admin/categories` | admin | `GET`, `POST /api/category`, `DELETE /api/category/:id` |

> Every page that renders a header with a cart badge adds 1–2 calls. With a 5 req/min budget,
> cache the cart and categories in a store and only refetch after mutations.

---

## 5. Screen-by-screen notes

### 5.1 Register — `POST /api/user`

```json
{ "name": "Mo'men", "email": "momen@example.com", "password": "Secret123" }
```

- `201` → `{ savedUser }`. It includes a bcrypt `password` field — **ignore it and never display or
  persist it**.
- `409` → email already registered.
- Required fields missing → `500`, not `400`. Validate on the client first.
- **Do not send `role`.** The backend accepts it, meaning anyone could register as `admin`. Send
  only `name`, `email`, `password`.
- After success, either log in automatically (preferred) or route to `/login`.
- No email verification exists.

**Validate:** name non-empty, email non-empty + format, password ≥ 8 (matches the reset rule).

### 5.2 Login — `POST /api/user/login`

```json
{ "email": "momen@example.com", "password": "Secret123" }
```

`200` → `{ message, token, id, name, email }`.

- Wrong credentials → `401 "Invalid email or password"` (identical for both cases).
- If you have a token in storage, **don't send it** on this call.
- Store `token` + `id` + `name` + `email`; derive `role` from the JWT.
- No "remember me" behaviour beyond token lifetime.

**Expired session UX:** on `401`, show "Your session expired, please sign in again", keep the cart
(it's server-side), and return the user to the page they wanted.

### 5.3 Forgot / reset password

`POST /api/user/forgot-password { email }`

- `200` → generic success message.
- `404` → email unknown. The UI can show this, but it enables account enumeration; ask backend to
  always return `200`.
- **No real email is sent.** A throwaway Ethereal inbox is created at server boot; the preview link
  is printed in the **server console**. To test the flow, copy `token` from that preview or from
  the printed reset URL.
- The emailed link is hard-coded to `http://localhost:3000/reset-password?token=...` — the **API**
  host, which serves no page. Backend must point `CLIENT_URL` at your app. Until then, construct
  the URL yourself when testing: `http://localhost:5173/reset-password?token=<token>`.

`POST /api/user/reset-password { token, newPassword }`

- `200` → password changed. Log in again (existing sessions are **not** revoked).
- `400` → missing fields, password < 8 chars, or expired/invalid token (10 minute lifetime).
- Read `token` from the query string, don't expose it in the UI.

### 5.4 Product listing — `GET /api/products`

```
GET /api/products?search=ultra&page=1&limit=12&sortName=asc&sortPrice=desc
```

| Param | Notes |
| --- | --- |
| `search` | case-insensitive match on **name only** |
| `page` | starts at **1** |
| `limit` | 1–100, default 10 |
| `sortName` | `asc` or `desc` only |
| `sortPrice` | `asc` or `desc` only |
| `filters` | see caveat below |

Returns a **bare array**, already populated with `categories`.

Pagination: **no total count**. Use "Load more" or next/prev where "next" is disabled when
`results.length < limit`.

`sortPrice=asc` is the safe default for a "sort by price" control. Sending anything other than
`asc`/`desc` returns `400`.

**Filters are not usable yet:**

- `filters=Category:<id>` compares an ObjectId to a number → **never matches**.
- `filters=price:189.99` is exact equality, not a range.
- Values containing `-` break parsing.

Until backend fixes this, filter categories/prices **client-side on the fetched page**, or hide
the filter panel behind a feature flag.

Search is applied per request, so debounce the input (400–500ms) — you cannot afford one call per
keystroke at 5 req/min.

### 5.5 Product detail — `GET /api/products/:id`

Returns a bare `Product` (category populated). `404` → not found.

There is no `description`, colour, or brand. Render `image`, name, price, category, and the
`sizes` array. Each size carries its own stock.

PDP rules:

- Render one selectable chip per `sizes[]` entry.
- A size with `quantity === 0` is disabled (strikethrough or greyed out).
- Show "Out of stock" only when **every** size is 0.
- `sizes: []` means the admin has not configured sizes yet → disable add-to-cart and say so.
- The add-to-cart call must include the selected `size` (see §5.6).
- Don't over-promise — the server re-checks stock per size at order time and can return `409`.

### 5.6 Cart

| Action | Call |
| --- | --- |
| Read | `GET /api/cart` |
| Add | `POST /api/cart { productId, size, quantity? }` |
| Set quantity | `PATCH /api/cart/items/:itemId { quantity }` |
| Remove item | `DELETE /api/cart/items/:itemId` |
| Clear | `DELETE /api/cart` |

- **`GET` returns `404` for a user who has never added anything.** Treat `404` as
  `{ items: [] }`, not as an error toast.
- `size` is **required** on add. Same product in two sizes creates two separate lines.
- `PATCH`/`DELETE` target the **cart item `_id`** (`item._id`), not the product id, because a
  product can appear once per size.
- `POST` **increments** the quantity for that product+size. For a stepper, always use `PATCH`
  with the absolute value.
- `PATCH` must be `>= 1`; to reach zero use `DELETE`.
- Stock is checked against the selected size:
  `400 { availableQuantity, quantityAlreadyInCart }` — surface "Only N available".
- The response's `cart.items[].product` is the full product, so you can render the cart from the
  mutation response without a follow-up `GET`, and you can cap the stepper at
  `item.product.sizes.find(s => s.size === item.size).quantity`.
- Subtotal must be computed client-side:
  `items.reduce((s, i) => s + i.product.price * i.quantity, 0)`.
- Adding the same product+size twice is intentional (same `_id` line, higher quantity).
- Validate `productId` format before calling, otherwise you get `500`.

**Cart badge:** keep a global store; update it from the mutation response's `cart.items.length`
(or total quantity) instead of refetching.

### 5.7 Checkout — `POST /api/orders`

```json
{
  "shippingAddress": {
    "fullName": "Mo'men",
    "phone": "+201234567890",
    "street": "12 Nile St",
    "city": "Cairo",
    "postalCode": "11511",
    "country": "EG"
  },
  "paymentMethod": "cash_on_delivery"
}
```

Rules enforced by the server:

- All of `fullName`, `phone`, `street`, `city`, `country` must be **non-empty strings**.
  `postalCode` optional.
- `paymentMethod` ∈ `cash_on_delivery` | `card`.
- Cart must contain at least one item → otherwise `400 "Your cart is empty"`.
- Stock is re-checked and deducted atomically. Failure → `409 "Not enough stock for <name>"`.
- Prices are snapshotted into the order.

`201` → `{ message, order }`.

**Order of operations for card payment:**

```ts
const { order } = await api<{ order: Order }>("/api/orders", {
  method: "POST",
  body: JSON.stringify({ shippingAddress, paymentMethod: "card" }),
});

// The cart is NOT cleared by the backend. Clear it yourself.
await api("/api/cart", { method: "DELETE" });

// Then create the Stripe session and redirect.
const { checkoutUrl } = await api<{ checkoutUrl: string }>(
  `/api/orders/${order._id}/checkout`,
  { method: "POST" },
);
window.location.assign(checkoutUrl);
```

Save `order._id` (e.g. `sessionStorage`) before redirecting so `/payment-success` can poll it.

For `cash_on_delivery`, skip checkout entirely and go straight to the confirmation page.

UI must handle:

- `400 "Please provide a complete shipping address"` → highlight missing fields.
- `400 "Your cart is empty"` → send back to cart.
- `409` → show which item is unavailable; refresh the cart.
- `500` if MongoDB isn't a replica set (server misconfiguration — report, don't retry).

### 5.8 Stripe redirect pages

**`/payment-success?session_id=cs_test_...`**

The API does **not** confirm payment on this page. A Stripe webhook flips the order to
`paymentStatus: "paid"` in the background. So:

```ts
const orderId = sessionStorage.getItem("pending_order_id");

// poll until paid or timeout (~60s). Do NOT poll faster than every 10–15s:
// the rate limit is shared and 5/minute.
```

Show "Confirming your payment…" with a spinner, then the order confirmation. If it times out,
show "Payment received, confirmation pending" with a link to the order — never claim failure,
because the webhook may still land.

**`/payment-cancelled`** — no API call required. The order remains `pending` + `unpaid`. Offer
"Try payment again" (re-call `/checkout` on the same order) and "Cancel order".

Stripe's success/cancel URLs are built from the API's `CLIENT_URL`, which currently points at the
API port. Until backend changes it, these redirects won't reach your app. Confirm the URL with
backend before QA.

### 5.9 My orders — `GET /api/orders`

Returns `{ order: Order[] }` containing **every order by every user**, not just the caller's.
There is also no `GET /me/orders`.

Workaround until backend scopes it:

```ts
const { order } = await api<{ order: Order[] }>("/api/orders");
const mine = order.filter((o) => o.user === session.user.id);
```

Filter client-side, and **do not display anything before filtering**. Also note there's no
pagination, sorting, or `populate`, so items are id-only — use the snapshotted `name` and `price`
in `order.items` (they're sufficient for a list/detail view).

`GET /api/orders/:id` returns one order with no ownership check. Use it for the detail page, but
validate the id format first.

**Cancel:** `PATCH /api/orders/:id/cancel` — only show the button when
`status === "pending" && paymentStatus !== "paid"`. Server responses:

- `400 "Only pending orders can be cancelled"`
- `400 "This order requires a refund process"` (paid)
- `404` (not yours)

After cancelling, the order shows `status: "cancelled"`; stock is restored server-side.

### 5.10 Admin

**Orders:** `PATCH /api/orders/status/:id { status }`. Only forward transitions are legal:

```
pending → processing → shipped → delivered
```

Show only the next valid status per current value. `cancelled` and `delivered` are terminal.
Do not render `confirmed` — nothing produces it. Any other jump → `400`.

**Products:**

```http
POST /api/products   { name, price, categories, image?, sizes? }
PUT  /api/products/:id { name, price, categories, image?, sizes? }
DELETE /api/products/:id
```

`sizes` is an array of `{ size, quantity }`; `quantity` is derived as their sum and cannot be set
directly when `sizes` is present.

```json
{
  "name": "Ultraboost Light",
  "price": 189.99,
  "categories": "665f20...",
  "image": "https://...",
  "sizes": [
    { "size": "40", "quantity": 3 },
    { "size": "41", "quantity": 5 }
  ]
}
```

Validation: size labels must be non-empty and unique, quantities integers `>= 0`. A product with
`sizes: []` is creatable but not purchasable.

`categories` is a **single** category ObjectId, not an array. `PUT` cannot move a product to
another category — request that from backend if the UI needs it.

**Categories:** `POST /api/category { name }`, `DELETE /api/category/:id`. Deleting a category does
not detach products that reference it, so a product can end up with a dangling category. Guard the
delete in the UI (warn if products use it) or avoid it.

> Admin guards are enforced server-side only on `DELETE /api/products/:id`,
> `DELETE /api/category/:id`, and `PATCH /api/orders/status/:id`. Everything else is open. Hide
> admin routes by role, but understand that this is UI hygiene, not security.

---

## 6. Authentication & session rules

1. Login → store `token`, `id`, `name`, `email`; decode `role` from the JWT.
2. Attach `Authorization: Bearer <token>` to everything except register/login/forgot/reset and
   public catalog reads.
3. Token lives 30 minutes. There is no refresh; on `401` the user must log in again.
4. Logout → `POST /api/user/logout`, then clear local storage even if the call fails.
5. Password reset does **not** invalidate existing sessions. Log in again after resetting.
6. Never call `GET /api/user`, `PUT /api/user/:id`, or `DELETE /api/user/:id` from the client —
   they're unauthenticated and expose all accounts, including password hashes.
7. There is no `GET /me` endpoint and no profile image or saved addresses. Render the profile from
   the login response; ship address entry per order.

---

## 7. Workarounds you'll need (and when they can be removed)

| # | Problem | Frontend behaviour today | Remove when |
| --- | --- | --- | --- |
| 1 | No CORS | dev proxy (§1.2) | backend adds `cors({ origin: CLIENT_URL })` |
| 2 | 5 req/min global | cache categories/cart, debounce search, batch, poll ≥15s | limiter is per-user and higher |
| 3 | No product images/details | placeholders, name/price/stock only | Product model gains media + description |
| 4 | Category filter broken | filter loaded page client-side | `filters=Category:` matches |
| 5 | No product total | "Load more" / next disabled on short page | API returns `total` |
| 6 | Empty cart = `404` | map to `items: []` | API returns an empty cart |
| 7 | No "my orders" | fetch all + filter by `order.user` | endpoint scoped to caller |
| 8 | Cart not cleared after order | `DELETE /api/cart` after `POST /api/orders` | backend clears in the transaction |
| 9 | Login has no `role` | decode JWT | `role` returned |
| 10 | No order totals breakdown | show items subtotal; label shipping/tax "calculated at delivery" | API adds totals |
| 11 | Malformed ids → `500` | validate 24-hex before requests | API maps CastError to `400` |
| 12 | No profile/password-change endpoint that hashes safely | use forgot/reset flow | backend adds authenticated profile update |
| 13 | Reset email is Ethereal | get token from server console during testing | real SMTP configured |
| 14 | Reset link points at API port | open `/reset-password?token=` yourself | `CLIENT_URL` points at frontend |

---

## 8. UX requirements checklist

### Global

- [ ] Loading skeleton per section, not one spinner for the whole page
- [ ] `401` → clear session, redirect to login, remember destination
- [ ] `403` → "You don't have permission", not a generic error
- [ ] `404` → empty state where applicable (cart, orders, product)
- [ ] `429` → "Too many requests, try again in a minute" + disable retry for 60s
- [ ] `500` → generic error card with a retry button; log the request path
- [ ] Never show a raw API `message` for `500`s

### Catalog

- [ ] Debounced search (400–500 ms)
- [ ] Sort by name/price maps to `sortName` / `sortPrice` (`asc`/`desc` only)
- [ ] Pagination uses `page` + `limit` (max 100, default 10)
- [ ] Out-of-stock products disabled, not hidden

### Cart

- [ ] Empty state for `404`
- [ ] Stepper uses `PATCH` with the absolute quantity of the **cart item `_id`**, min 1
- [ ] Cart line shows the selected size
- [ ] Stepper is capped at that size's remaining stock
- [ ] Optimistic update rolled back on `400/404`
- [ ] Stock error shows `availableQuantity` and `quantityAlreadyInCart`
- [ ] Subtotal computed client-side; no shipping/tax lines implied

### Checkout

- [ ] Client-side validation mirrors §5.7 exactly
- [ ] Disable submit while the order is being created (prevents duplicate orders — the backend
      does not clear the cart and does not dedupe)
- [ ] Card → create order → clear cart → create session → redirect
- [ ] COD → create order → clear cart → confirmation
- [ ] Store `orderId` before leaving the SPA

### Payment success

- [ ] Poll `GET /api/orders/:id` no faster than every 15s
- [ ] Success only on `paymentStatus === "paid"`
- [ ] Timeout state says "pending", offers order link, never "failed"
- [ ] Clear the stored `orderId` when done

### Admin

- [ ] Status control offers only the next legal transition
- [ ] Product form enforces `name`, numeric `price >= 0`, `categories` id
- [ ] Product form has a size/quantity editor; every size row needs a unique label and integer `quantity >= 0`
- [ ] Products with no sizes are flagged in the admin list
- [ ] Warn before deleting a category that products reference
- [ ] Confirm dialogs on all deletes

---

## 9. QA smoke script

Run with a valid token and a **replica-set** MongoDB (otherwise orders return `500`).

1. Register → `201`; duplicate email → `409`
2. Login → token; decode it and confirm `role`
3. Load home: categories + products (2 calls)
4. Sort by price ascending, search a product name, load page 2
5. Product detail; verify stock label
6. Add to cart; badge increments; add again → quantity 2
7. Refresh → cart persists; set quantity 1; remove; add again
8. Checkout COD → order confirmation; cart should be cleared by your app
9. Cancel that order → status `cancelled`; stock restored on the PDP
10. Checkout card → Stripe test page → pay with `4242 4242 4242 4242`
11. `/payment-success` polls to `paid`
12. My orders lists only your orders (client filter)
13. Logout → any protected call returns `401` and you land on login
14. As admin, advance `pending → processing → shipped → delivered`; illegal jumps are rejected
15. Empty cart page shows empty state (API `404` handled)
16. Unknown product id `/products/does-not-exist` → not-found page, no crash

---

## 10. Open questions for backend

Send these before sprint planning; each one is currently blocking or degrading a screen.

1. **CORS:** when will `CLIENT_URL` be allowed so we can drop the dev proxy?
2. **Images/description/sizes/colour/brand** on `Product` — which fields, which shape, which upload
   endpoint?
3. **`GET /api/orders` scoped to the caller** — we're currently filtering every order client-side.
4. **Clear the cart inside the order transaction** — prevents duplicate orders on double submit /
   refresh.
5. **Category + price filters** — ObjectId comparison and range filtering are broken.
6. **Pagination metadata** (`total`, `pageCount`) on the product list.
7. **`role` in the login response**, or a `GET /api/user/me` endpoint.
8. **Order totals breakdown** (subtotal / shipping / tax) — currently items only.
9. **Reset + Stripe URLs:** point `CLIENT_URL` at the frontend app, not port 3000.
10. **Rate limit** — per-user key and a realistic budget; 5/min globally is unusable.
11. **Profile update endpoint** that hashes passwords, plus saved addresses.
12. **Real email delivery** for password reset (Ethereal only reaches the server console).

---

## 11. Do-not-call list

These endpoints exist but are unsafe or irrelevant for the client:

| Endpoint | Reason |
| --- | --- |
| `GET /api/user` | unauthenticated; returns every user incl. password hashes |
| `GET /api/user/:id` | unauthenticated account data |
| `PUT /api/user/:id` | unauthenticated; can change anyone's email/password; doesn't hash |
| `DELETE /api/user/:id` | unauthenticated account deletion |
| `POST /api/user` with `role` | privilege escalation |
| `POST /api/payments/webhook` | Stripe server-to-server only |
