# Product Requirement Document — Simple E-commerce Web App

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-07-16 |
| **Platform** | Web (Angular v22 SPA + Node/Express mock backend) |

## 1. Overview

A small but production-shaped e-commerce web application. Visitors can browse a product catalog, manage a shopping cart, and check out as a guest or as a registered user. Registered users get a dashboard with order history and editable profile/delivery data. Authentication is JWT-based, emulated by a standalone mock backend with no real database.

The app doubles as a reference implementation of modern Angular architecture and security best practices (signals, Signal Forms, standalone components, lazy routes, in-memory access tokens with httpOnly refresh cookies).

## 2. Goals

- Provide a complete purchase flow: browse → cart → checkout → order visible in dashboard.
- Demonstrate secure, modern JWT session handling without a real backend.
- Maximize code reuse (shared delivery-address sub-form and validation schema used on both checkout and dashboard).
- Meet WCAG AA accessibility minimums; pass AXE checks.

### Non-goals

- Real payments, inventory management, or persistence beyond process memory / browser storage.
- Multi-language/multi-currency support.
- Admin tooling.

## 3. Users

- **Guest shopper** — browses, fills a cart, checks out with contact + VAT + address details; may opt in to account creation during checkout.
- **Registered customer** — everything a guest can do, plus: prefilled checkout, order history with statuses, editable personal info and delivery address.

## 4. Functional Requirements

### 4.1 Home page (product catalog) — route `/`

- **FR-1.1** Display a grid of products (~12 seeded items) with name, description, and price. Product imagery may be CSS/SVG placeholders.
- **FR-1.2** Free-text search filters products by name/description (server-side via `?q=`, debounced input).
- **FR-1.3** Sorting by price ascending, price descending, and name (server-side via `?sort=`).
- **FR-1.4** Each product has an "Add to cart" action; the header cart badge updates immediately.

### 4.2 Cart page — route `/cart`

- **FR-2.1** List all cart items with name, unit price, quantity, and line total.
- **FR-2.2** Quantity is editable via stepper buttons and direct numeric input (minimum 1).
- **FR-2.3** Items can be removed; adding an existing product from Home increments its quantity.
- **FR-2.4** Show subtotal/total; provide a "Proceed to checkout" CTA.
- **FR-2.5** Cart contents persist across page reloads (localStorage). Show an empty state with a link back to Home.

### 4.3 Checkout page — route `/checkout`

- **FR-3.1** Checkout form fields: full name, email, VAT ID, and delivery address (street, city, ZIP, country).
- **FR-3.2** VAT ID must match the generic EU shape: two uppercase letters followed by 2–12 alphanumeric characters (`^[A-Z]{2}[0-9A-Z]{2,12}$`). Invalid input blocks submission with an inline error.
- **FR-3.3** Email must be a valid email; all fields are required.
- **FR-3.4** The delivery-address section is a reusable sub-form component shared with the dashboard (same fields, same validation schema).
- **FR-3.5** Guests see a "Create an account from this data" option; when checked, a password field (min 8 chars, required) appears and submission registers the account before placing the order.
- **FR-3.6** If the user is logged in, the form is prefilled from their profile and the account-creation option is hidden.
- **FR-3.7** On successful submit: the order is created, the cart is cleared, and the user is taken to the dashboard (authenticated) or shown an inline confirmation (guest).

### 4.4 Login page — route `/login`

- **FR-4.1** Form with email and password; both required.
- **FR-4.2** Failed login shows a generic "invalid credentials" message (no account enumeration).
- **FR-4.3** After login, redirect to the originally requested URL (`returnUrl`) or the dashboard.
- **FR-4.4** Already-authenticated users visiting `/login` are redirected to the dashboard.
- **FR-4.5** A demo account exists: `demo@example.com` / `Demo1234!`, seeded with 3 orders in mixed statuses.

### 4.5 User dashboard — route `/dashboard` (authenticated only)

- **FR-5.1** Accessible only to authenticated users; unauthenticated access redirects to `/login?returnUrl=/dashboard`.
- **FR-5.2** Show the user's orders: order id/date, line items, total, and status (`processing`, `shipped`, `delivered`). Status is conveyed by text, not color alone.
- **FR-5.3** Profile form for personal information (full name, email, VAT ID) and delivery address (reused address sub-form). Saving persists via the API and updates the in-app session immediately.

### 4.6 Authentication & session

- **FR-6.1** JWT-based auth emulated by the mock backend: HS256 access token with ~15-minute expiry.
- **FR-6.2** Access token is held in memory only (never localStorage/sessionStorage).
- **FR-6.3** A rotating opaque refresh token is issued in an httpOnly, SameSite=Strict cookie; `/api/auth/refresh` rotates it and returns a fresh access token.
- **FR-6.4** On app startup the session is silently restored via the refresh endpoint (no-op for guests).
- **FR-6.5** API requests carry the access token as a `Bearer` header; a 401 triggers one silent refresh-and-retry, then logout on failure.
- **FR-6.6** Logout invalidates the refresh token server-side and clears client state.

## 5. Mock Backend Requirements

- **BE-1** Standalone Node/Express server (TypeScript, in-repo under `server/`), no database — all data in process memory, reset on restart.
- **BE-2** Types shared with the frontend from a single `shared/models.ts` module (DRY).
- **BE-3** Simulated network latency (~150–400 ms) on all endpoints.
- **BE-4** Passwords hashed with `crypto.scrypt`; plaintext never stored.
- **BE-5** Served same-origin in development via the Angular dev-server proxy (`/api/*` → `localhost:3000`) so cookies work without CORS.
- **BE-6** Endpoints:

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/products?q=&sort=` | — | Search + sort catalog |
| `POST /api/auth/register` | — | Create account; returns access token + user, sets refresh cookie |
| `POST /api/auth/login` | — | Authenticate; returns access token + user, sets refresh cookie |
| `POST /api/auth/refresh` | cookie | Rotate refresh token; new access token + user |
| `POST /api/auth/logout` | cookie | Invalidate refresh token, clear cookie |
| `GET /api/me` / `PUT /api/me` | Bearer | Read / update profile & delivery address |
| `GET /api/orders` | Bearer | User's orders with statuses |
| `POST /api/orders` | optional | Place order (guest or authenticated; attached to user when token present) |

## 6. Non-functional Requirements

### 6.1 Security

- No tokens or credentials in web storage; access token in memory, refresh token httpOnly.
- Generic error messages for auth failures; no user enumeration.
- Rely on Angular's built-in template sanitization; no `innerHTML` of untrusted data.

### 6.2 Accessibility (WCAG AA)

- Passes AXE checks on all five pages.
- Every form control has a programmatic label; validation errors are linked via `aria-describedby` and flagged with `aria-invalid`, revealed on touch.
- Visible focus indicators; AA color contrast throughout; route changes update the document title.

### 6.3 Architecture & code quality

- Angular v22, standalone components only, lazy-loaded feature routes.
- Signals for all state; `computed()` for derived state; no signal mutation (use `update`/`set`).
- Signal Forms (`@angular/forms/signals`) for all forms, with schema-based validation.
- Singleton services via `@Service`; `inject()` over constructor injection; native control flow in templates.
- DRY: one address sub-form component + one address validation schema reused across checkout and dashboard; shared API types across client and server.
- Hand-written SCSS with a small design-token layer; no CSS framework or component library.

### 6.4 Developer experience

- `npm run dev` starts backend and frontend together (concurrently).
- `ng build` completes without errors; vitest suite (`npm test`) stays green, including targeted tests for the VAT validator and cart store.

## 7. Acceptance Criteria (end-to-end)

1. Searching and sorting on Home changes the visible product set; adding items updates the cart badge.
2. Cart edits (quantity, removal) recompute totals correctly and survive a page reload.
3. Guest checkout rejects VAT `123`, accepts `DE123456789`, and places an order; with "create account" checked, the user lands authenticated on the dashboard and sees the new order.
4. Logging in as the demo user shows 3 seeded orders; checkout arrives prefilled; editing the delivery address on the dashboard persists and is visible after a full page refresh (session restore).
5. Visiting `/dashboard` logged out redirects to login and returns to the dashboard after signing in; access-token expiry is transparent to the user (silent refresh); logout ends the session.
