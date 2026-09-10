# KudiFlow Known Limitations & Scope Boundaries

> **Honest Engineering Appraisal for the 72-Hour Technical Challenge**

This document provides a transparent accounting of what is fully implemented, what operates as a simulated prototype rail, what is partially implemented, and what would be addressed in a production deployment.

---

## 1. Feature Status Breakdown

### Implemented & Fully Verified (Production-Grade Architecture)
* **Atomic Transfer Engine**: Pessimistic row locking (`SELECT FOR UPDATE`), integer pesewas arithmetic, `NUMERIC(15,2)` precision, double-entry ledger bookkeeping.
* **Cryptographic Idempotency**: Unique per-user idempotency keys, request payload hashing, duplicate detection, and 409 conflict protection.
* **Mandatory PIN Authorization**: Separate bcrypt PIN hashing and verification required before any balance deduction.
* **Real-time Balance Authority**: Server is the sole authority; zero frontend balance calculation or mock transactions on Home/Ledger screens.
* **Automated Acceptance Suite**: 38 out of 38 automated tests passing across 5 test suites.
* **Audit Trail**: Append-only audit logs for financial events with PII redaction.
* **Reversal Handling**: Single-use atomic reversal of completed transactions.

### Simulated Prototype Rails (Clearly Labelled Sandbox)
* **External Settlement & Inflow Rail (Add Money)**:
  * In a production deployment, funding occurs through GhIPSS Instant Pay (GIP), MTN Mobile Money Partner APIs, or a licensed bank aggregator.
  * In this challenge prototype, funding is simulated via an internal System Settlement Reserve Account (`1000000000` with GH₵ 10,000,000 baseline liquidity). When a user adds money, funds are atomically debited from the reserve and credited to the user wallet.
* **Utility Biller Integrations (Pay Bills)**:
  * In production, bill payment connects to ECG prepayment APIs, GWCL billing gateways, and telecom aggregators.
  * In this prototype, payments settle directly into dedicated biller accounts (`3000000001` - `3000000004`) in the database, verifying meter/account formats and debiting the user wallet plus convenience fee atomically.
* **SMS OTP Delivery**:
  * In production, OTP codes are delivered via Twilio or Hubtel SMS gateways.
  * In development mode, OTP codes are printed to server stdout/console to facilitate instant reviewer testing.

### Partially Implemented / Out of Scope for 72 Hours
* **Smart Pot Savings**: The high-yield savings drawer (14.5% p.a.) features an interactive lock duration and return calculator. Interest accrual background workers (cron jobs) are not implemented.
* **Real-Time Push Notifications**: The `notifications` table records all events and serves them via REST API to the mobile app; Apple APNs and Google FCM push notification services are not configured.
* **Biometric Hardware Prompt**: The UI contains a biometric fallback trigger that invokes the secure PIN modal; native FaceID / TouchID biometric enrollment via `expo-local-authentication` is designed as a drop-in enhancement.

---

## 2. Infrastructure & Environment Limitations

1. **Local Development Host Routing**:
   * Expo Go on physical mobile devices requires connecting to the development machine's LAN IP address rather than `http://localhost:3000`. This is handled dynamically via `Constants.expoConfig?.hostUri` in `mobile/constants/api.ts`.
2. **PostgreSQL Network Latency**:
   * The database is hosted on Neon Serverless (AWS `eu-west-2`). Local roundtrips from external regions can experience 100-300ms network latency. The pool connection timeout was increased to 30,000ms to maintain stability during test runs.

---

## 3. What Would Be Done With Another 72 Hours

If awarded an additional 72 hours, the following production-hardening steps would be prioritized:
1. **Live Aggregator Integration**: Connect to sandbox APIs for Hubtel or Paystack Ghana to test real-world MoMo STK push prompts and GhIPSS bank rails.
2. **Redis Distributed Caching**: Place Redis in front of read-heavy account and notification queries, while keeping PostgreSQL as the write-authoritative ledger.
3. **Automated End-to-End Detox Testing**: Implement Detox E2E tests running on headless Android and iOS simulators to exercise gesture animations and modal flows.
4. **Structured Prometheus Metrics**: Instrument the Express API with Prometheus metrics (`http_request_duration_seconds`, `ledger_transaction_total`) and Grafana dashboards.
