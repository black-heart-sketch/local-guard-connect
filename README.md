# CrimeX Cameroon

CrimeX is a bilingual, mobile-first community safety platform for Cameroon. Citizens can submit anonymous or identified incident reports, attach private evidence, follow a case, receive local alerts, and initiate an emergency recording. Verified dispatchers and partner agencies can triage, assign and acknowledge cases.

## Stack

- React 19, TypeScript, Vite and Tailwind CSS
- Express 5 REST API
- MongoDB with Mongoose schemas and versioned migrations
- DigiPay SDK for optional MTN/Orange Mobile Money contributions and organization subscriptions
- JWT authentication in HTTP-only cookies with bearer-token support
- Private filesystem evidence storage (replace with an encrypted object store in multi-instance production)

Sequelize is intentionally not used: it is an ORM for SQL databases and has no supported MongoDB dialect. Mongoose provides MongoDB validation and indexes, while `server/migrations` supplies repeatable database changes.

## Local setup

Requirements: Node.js 22+ and MongoDB 7+.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The web app runs on `http://localhost:3000`; Vite proxies `/api` to the Express API on `http://localhost:4000`.

## Commands

```bash
npm run dev          # web and API
npm run dev:web      # web only
npm run server:dev   # API only
npm run db:migrate   # apply pending MongoDB migrations
npm run db:seed      # idempotent Cameroon demo users, agencies and cases
npm run build        # production web build
npm run test:api     # API tests
npm run data:retention # purge expired records not under legal hold
```

The login page includes quick-access buttons for the seeded citizen, dispatcher, police and administrator accounts. Their default password is `Cameroon@2026`. Change `SEED_PASSWORD` when creating a custom demo dataset; hide the quick-access panel with `VITE_ENABLE_QUICK_LOGIN=false`. Seeding is blocked in production unless `ALLOW_PRODUCTION_SEED=true` is deliberately configured.

## Backend organization

Each persisted domain has a dedicated model, controller, and route module. For example, payments live in `server/models/Payment.js`, `server/controllers/paymentController.js`, and `server/routes/paymentRoutes.js`. `server/app.js` only composes middleware and domain routers, which keeps debugging paths short.

## Cameroon capabilities

- French/English interface, +237 phone OTP, and official emergency-number directory
- Anonymous reporting with a one-time recovery code and public case tracking
- Region/division/subdivision/council location fields, GPS, and privacy-preserving public map points
- Offline report queue, low-data image compression, SMS report fallback, and PWA shell
- Optional standards-based browser push notifications using VAPID
- Protected GBV/child-safety reports, trusted emergency contacts, and a single continuous emergency recording stream
- Verified agencies, jurisdiction workflows, community moderation, audit logs, and data-subject requests
- Optional DigiPay Mobile Money support; incident and emergency reporting never requires payment

Set `DIGIPAY_API_KEY=dpk_...` and `DIGIPAY_ENVIRONMENT=production` for live payments. Without a key, non-production environments return an explicit simulation response. DigiPay balance and payout endpoints are admin-only.

To enable browser alerts, generate VAPID keys and set `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`. Push subscriptions are stored per authenticated user and expired browser endpoints are removed automatically.

## Security model

- Evidence and emergency recordings are private and require authorization.
- Anonymous reports receive a one-time recovery code; only its SHA-256 digest is stored.
- Public map locations are approximated and exclude sensitive reports.
- Police, gendarmerie, fire, medical, NGO, council, dispatcher and admin roles are explicitly separated.
- Sensitive reads and case-status changes are written to the audit log.
- The panic flow never claims an authority was contacted until a responder acknowledges it.

For production, configure `MONGODB_URI`, a strong `JWT_SECRET`, `CLIENT_ORIGIN`, durable encrypted storage and backups. Establish operational agreements with emergency-service and protection partners before advertising live dispatch.
