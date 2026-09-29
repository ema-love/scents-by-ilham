# Scents by Ilham

**Scents that feel like you.** Beautiful fragrance, thoughtful presentation, accessible pricing.

The official storefront and order-management system for Scents by Ilham. Customers browse on their phones, order without an account, pay by bank transfer, upload their receipt and track their order. Ilham runs the whole store from her phone: stock, prices, photos, payment checks and order updates.

## Stack

This uses the same stack as MÚRÀ: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix / shadcn conventions · Lucide · React Hook Form + Zod · TanStack Query · Vitest · Playwright. It's hosted on **Netlify**, with **Netlify Blobs** as the database.

## Run it

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD (12+ chars) and SESSION_SECRET (32+ chars)
npm run dev                  # http://localhost:3000 — dashboard at /admin
npm test                     # unit tests (order rules, payments, storage)
npm run typecheck
npm run e2e                  # full customer → owner → customer loop on a phone-sized browser
```

The first request writes the seven launch products to the database. After that the database is the only source of truth: nothing about products, prices or stock is hard-coded in pages.

## Deploy (Netlify)

1. Netlify → Add new site → Import from GitHub → `ema-love/scents-by-ilham`. Build settings come from `netlify.toml`.
2. Site configuration → Environment variables:
   - `ADMIN_PASSWORD`: Ilham's dashboard password, 12+ characters. Mark it as secret.
   - `SESSION_SECRET`: 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`). Mark it as secret.
   - `ADMIN_NAME`: optional, defaults to `Ilham`.
3. Deploy. The storage (Netlify Blobs) is created automatically, so there's nothing to provision.
4. Open `/admin`, sign in, and go to **Store** to fill in the account name, pickup details and delivery details.

Changing `ADMIN_PASSWORD` signs out every device.

## How it works

### Ordering (customer)
Browse → **Order now** / **Add to order** → name, phone, pickup or delivery → **Review** → **Place order** → the order page shows the exact amount and the OPay account → transfer → **upload receipt** → "Order received 🌸, payment under review" → track any time at `/track` with the order number and phone number.

- **No accounts and no email.** The cart lives on the phone (localStorage). When the order is placed, the browser gets a signed cookie that lets it open that order. On any other device, the order number **and** phone number are both required, and attempts are rate-limited.
- **The server re-checks everything** when an order is placed. Each product must still exist, be visible and be available. Prices come from the database and are **copied onto the order**, so later price changes never alter existing orders.
- Order numbers look like `SC-1001`. They're unique (claimed atomically) and separate from internal IDs.

### Payment verification (Ilham)
An uploaded receipt is **never** proof of payment. Payment statuses are separate from order statuses:

| Payment | Meaning |
|---|---|
| Awaiting payment | No receipt yet |
| Receipt submitted | Customer uploaded a receipt |
| Payment under review | Ilham opened the order/receipt |
| Payment confirmed | Ilham checked her account and confirmed. Records who and when |
| Payment rejected | Ilham couldn't confirm it. The customer sees her neutral message and can upload again |

Order statuses: Order received → Payment confirmed → Processing → Ready for pickup / Out for delivery → Delivered → Completed (or Cancelled). The rules live in `lib/domain/orders.ts` and are unit-tested:

- Nothing moves past "Order received" until the payment is confirmed.
- Pickup orders can't go "Out for delivery".
- Skipping a step, going back or cancelling asks for confirmation.
- Every change is recorded in the order's history.

### Dashboard (`/admin`)
- **Home:** greeting, live store numbers, "payments to check", quick actions, latest orders, recent activity.
- **Orders:** filters (To check · Awaiting payment · To prepare · Completed · Cancelled · All) and search. Each order has the receipt, **Confirm Payment** / **Reject Payment**, the next-step button, a customer update message, call/WhatsApp buttons and the full history.
- **Products:** one-tap **Available / Out of stock** and **Visible / Hidden** switches. Add/edit (name, price, category, descriptions, photos, featured, position). Archive and restore. Permanent delete only for archived products, after typing DELETE.
- **Store:** phone, WhatsApp, bank details, payment instructions, pickup/delivery info and optional delivery fee, About text, social links.
- **Activity:** who changed what (product stock/price/visibility, settings, sign-ins).

Phones get cards and a bottom tab bar. Wider screens get tables and a sidebar.

## Architecture

```
app/
  (store)/            Storefront: home, shop, products/[slug], about, contact, help, track,
                      checkout, orders/[number] (payment + tracking)
  admin/              login, (panel)/ home, orders, orders/[id], products, products/new,
                      products/[id], settings, activity
  api/orders          Place an order          api/track            Number + phone → access
  api/orders/[n]/receipt   Receipt upload     api/admin/*          Owner actions (session-checked)
  media/[...key]      Public product photos (immutable cache)
proxy.ts              Guards /admin pages (each page and API route checks the session again)
lib/
  domain/             Products, orders (status rules, timeline), settings: types + Zod schemas
  payments/           Payment-method registry (bank_transfer today)
  server/db.ts        Document store: Netlify Blobs / local files / memory, compare-and-swap writes
  server/files.ts     Buckets: "media" (public photos) and "receipts" (private)
  server/repo/        products, orders, settings, audit
  auth/token.ts       Signed tokens (Web Crypto): admin session + customer order access
```

### Data
All data goes through one small interface (`DocStore`). The implementation is Netlify Blobs in production, `.data/` files locally, and memory in tests. Writes that depend on a read use `mutate()`, which does an ETag compare-and-swap with retry, so concurrent orders never overwrite each other. The documents are:

- `catalog`: all products
- `order/<id>`: each order
- `order-number/<SC-…>`: number → id
- `counter/orders`: next order number
- `orders-index`: dashboard list
- `settings`: store settings
- `audit`: store activity

Moving to SQL later means writing another `DocStore`, or replacing the repos, without touching pages.

### Security
- Admin: 12+ character password (checked in constant time, rate-limited), plus an HMAC-signed, httpOnly, SameSite cookie that lasts 30 days and is invalidated when the password changes. Every admin route checks the session and same-origin.
- Receipts live in a private bucket and are streamed only to a signed-in admin (`no-store`, `noindex`). Product photos are public.
- Uploads are identified by their bytes, not their name. Receipts can be JPG, PNG, WebP or PDF; photos can be JPG, PNG or WebP. The limit is 4.5 MB because Netlify Functions accept bodies up to 6 MB. Photos are resized on the phone before upload.
- All input is validated server-side with Zod. Client validation is only for friendly messages.

### Performance (ordinary mobile data)
- Server-rendered pages with little client JavaScript: only the cart, forms and menus are interactive.
- Product photos go through `next/image` with phone-first widths, AVIF/WebP and fixed aspect ratios (no layout shift).
- There are no third-party scripts. Fonts are self-hosted by `next/font`.

## Future payments (Paystack)
Not built, on purpose. `lib/payments` has a method registry. A provider would be added as a new method with `verification: "provider"`. Its checkout creates the same `Order`, and its verified webhook calls the same `confirmPayment()` that Ilham's button uses. The order system, tracking and dashboard stay as they are.
