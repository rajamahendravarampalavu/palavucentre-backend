# RajaMahendravaram PalavuCentre Backend

Production-ready Express backend for the RajaMahendravaram PalavuCentre restaurant frontend. This backend uses Neon Postgres with Prisma, guest checkout only, JWT cookie-based admin auth, protected admin content management, and Razorpay-ready payment verification.

## Proposed Backend Architecture

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      prisma.js
      logger.js
      cors.js
      razorpay.js
      cloudinary.js
    controllers/
      *.controller.js
    middleware/
      auth.middleware.js
      validate.middleware.js
      rate-limit.middleware.js
      error.middleware.js
      not-found.middleware.js
    routes/
      index.js
      public/
      admin/
    services/
      *.service.js
    validators/
      *.validator.js
    utils/
      ApiError.js
      asyncHandler.js
      amounts.js
      cookies.js
      order-number.js
      serializers.js
      slug.js
  prisma/
    schema.prisma
    seed.js
    migrations/
  docs/
    api-examples.md
    frontend-integration.md
```

### Design Notes

- `routes` only define HTTP surface and middleware.
- `controllers` stay thin and translate HTTP to service calls.
- `services` own business logic, DB access, order pricing, and Razorpay verification.
- `validators` keep request contracts explicit with Zod.
- `utils/serializers.js` keeps API responses stable for the existing frontend shapes.
- Public and admin routes are split, but compatibility endpoints like `POST /api/gallery` and `PATCH /api/reviews/:id` are still available and admin-protected.

## Database Schema

Implemented Prisma models mapped to the required Postgres tables:

- `admins`
- `menu_categories`
- `menu_items`
- `orders`
- `order_items`
- `payments`
- `reviews`
- `gallery`
- `offers`
- `contact_inquiries`
- `franchise_inquiries`
- `catering_inquiries`
- `site_settings`
- `social_links`
- `otp_requests`

### Enums

- `order_status`: `pending`, `accepted`, `preparing`, `ready`, `delivered`, `cancelled`
- `payment_status`: `unpaid`, `pending`, `paid`, `failed`, `refunded`
- `payment_method`: `cod`, `online`
- `inquiry_status`: `new`, `contacted`, `closed`
- `media_type`: `image`, `video`
- `review_source`: `manual`, `google`, `internal`
- `offer_status`: `draft`, `scheduled`, `active`, `expired`

The full schema lives in [prisma/schema.prisma](/c:/Users/varun/Downloads/rest/palavu-centre/backend/prisma/schema.prisma).

## What Is Implemented

### Public APIs

- `GET /api/health`
- `GET /api/menu`
- `POST /api/orders` (requires user login)
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/contact`
- `POST /api/franchise`
- `POST /api/catering`
- `GET /api/reviews?visible=true`
- `GET /api/gallery`
- `GET /api/offers`
- `GET /api/site-settings/public`
- `POST /api/payments/razorpay/order` (requires user login)
- `POST /api/payments/razorpay/verify` (requires user login)

Public order tracking by guessed id, order number, or phone is intentionally not exposed. Customers track their orders from the authenticated account profile.

### Admin APIs

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/dashboard`
- `GET|POST|PATCH|DELETE /api/admin/menu/categories`
- `GET|POST|PATCH|DELETE /api/admin/menu/items`
- `GET|POST|PATCH|DELETE /api/admin/gallery`
- `GET|POST|PATCH|DELETE /api/admin/reviews`
- `GET|POST|PATCH|DELETE /api/admin/offers`
- `GET|PATCH /api/admin/orders`
- `GET|PATCH /api/admin/settings`
- `GET|PATCH /api/admin/inquiries`
- `POST /api/admin/media/signature`

### Compatibility Endpoints From Frontend Handoff

- `GET /api/gallery`
- `POST /api/gallery` requires admin cookie
- `PATCH /api/gallery/:id` requires admin cookie
- `DELETE /api/gallery/:id` requires admin cookie
- `GET /api/reviews?visible=true`
- `PATCH /api/reviews/:id` requires admin cookie
- `DELETE /api/reviews/:id` requires admin cookie

## Setup

### 1. Install

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy [`.env.example`](/c:/Users/varun/Downloads/rest/palavu-centre/backend/.env.example) to `.env` and fill in values.

Your current repo already has `backend/.env` with `DATABASE_URL`, so the Neon connection is ready.

### 3. Apply Schema

```bash
npx prisma migrate dev --name init
```

This repo already includes the initial migration at [migration.sql](/c:/Users/varun/Downloads/rest/palavu-centre/backend/prisma/migrations/20260327124134_init/migration.sql).

### 4. Seed Menu, Settings, Reviews, Gallery, Admin

```bash
npm run seed
```

### 5. Start Server

```bash
npm run dev
```

Server defaults to `http://localhost:4000`.

## Admin Seed Bootstrap

Admin credentials are database-backed. To bootstrap the first admin, set `ADMIN_EMAIL`
and `ADMIN_PASSWORD` in `.env` and run:

```bash
npm run seed
```

After the admin row is created in DB, login always validates against the stored
`admins` table record.

## Razorpay Flow

### COD

1. Frontend submits `POST /api/orders` with `paymentMethod: "cod"`.
2. Backend recalculates totals from DB prices.
3. Order is created with `payment_status = unpaid` and `order_status = pending`.

### Online

1. Frontend submits `POST /api/orders` with `paymentMethod: "online"`.
2. Backend creates pending order and payment record.
3. Backend creates Razorpay order and returns `razorpay.orderId`, `keyId`, amount, currency.
4. Frontend opens Razorpay checkout.
5. Frontend posts Razorpay response to `POST /api/payments/razorpay/verify`.
6. Backend verifies HMAC signature before marking payment as paid.
7. Razorpay also posts signed payment events to `POST /api/payments/razorpay/webhook`.
8. Backend verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET` and updates the existing payment/order from `payment.captured` or `payment.failed`.

If Razorpay env vars are missing, online payment endpoints return `503`.
If `RAZORPAY_WEBHOOK_SECRET` is missing, the webhook endpoint returns `503`.

## Media Upload Flow

Cloudinary is implemented as an upload-signature helper:

1. Admin calls `POST /api/admin/media/signature`
2. Backend returns signed upload params
3. Frontend uploads directly to Cloudinary
4. Frontend stores returned `url` and `public_id` through menu/gallery/offer APIs

If Cloudinary env vars are missing, signature endpoint returns `503`.

## Security

- Helmet secure headers
- CORS with credential support
- Rate limiting for auth, OTP, orders, and public forms
- Zod input validation
- Centralized error handling
- Admin JWT auth in `httpOnly` cookie
- Backend-side order repricing
- Backend-side Razorpay signature verification

## Environment Variables

See [`.env.example`](/c:/Users/varun/Downloads/rest/palavu-centre/backend/.env.example) for the full list. Core variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Example Responses

Examples are documented in [docs/api-examples.md](/c:/Users/varun/Downloads/rest/palavu-centre/backend/docs/api-examples.md).

## Frontend Integration Notes

Frontend wiring notes are documented in [docs/frontend-integration.md](/c:/Users/varun/Downloads/rest/palavu-centre/backend/docs/frontend-integration.md).

## Smoke-Tested

The current implementation was live-tested against the running Express app and Neon database for:

- `GET /api/health`
- `GET /api/menu`
- `GET /api/site-settings/public`
- `GET /api/reviews`
- `GET /api/gallery`
- `GET /api/offers`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `POST /api/contact`
- `POST /api/orders` with COD
- `GET /api/admin/dashboard`
