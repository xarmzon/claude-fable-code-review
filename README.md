# Fable Shop

A small, production-shaped e-commerce demo: Angular v22 SPA plus a standalone Node/Express mock
backend. See [docs/product-requirement.md](docs/product-requirement.md) for the full spec.

- Product catalog with server-side search (`?q=`) and sorting (`?sort=`)
- Cart with editable quantities, persisted in `localStorage`
- Checkout with Signal Forms, a shared delivery-address sub-form, and EU VAT validation
- Guest checkout with optional account creation
- JWT auth: in-memory access token + rotating httpOnly refresh cookie, silent session restore
- Dashboard with order history and an editable profile

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts the mock API (`http://localhost:3000`) and the Angular dev server
(`http://localhost:4200`) together; `/api/*` is proxied same-origin so auth cookies work without
CORS.

Demo account: `demo@example.com` / `Demo1234!` (seeded with 3 orders).

All backend data lives in process memory and resets on restart.

## Scripts

| Script           | Purpose                                     |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | API + frontend together (concurrently)      |
| `npm start`      | Angular dev server only                     |
| `npm run server` | Mock API only (tsx watch)                   |
| `npm run build`  | Production build                            |
| `npm test`       | Vitest suite (VAT validator, cart store, …) |

## Layout

```
server/          Express mock backend (in-memory data, scrypt passwords, HS256 JWTs)
shared/          Types shared between client and server (single source of truth)
src/app/core/    Auth service + interceptor + guards, cart store, orders API
src/app/shared/  Address sub-form, validation schemas, VAT validator
src/app/features/ Lazy-loaded pages: home, cart, checkout, login, dashboard
```
