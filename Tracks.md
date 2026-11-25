# Development Tracks

### **Track 1: Live Interactive Loop (WebSockets & Mobile-to-API Wiring)**

> **Recommended Next Step** — Bridges the client app, nurse app, and operations console into a live, interactive multi-device system.

1. **NestJS WebSocket Gateway (`apps/api/src/modules/gateway`)**:
   - Install `@nestjs/websockets` & `socket.io`.
   - Implement real-time rooms:
     - `nurse:{nurseId}`: receives live `dispatch.offer.created` alerts and `dispatch.offer.closed` events.
     - `booking:{bookingId}`: streams `booking.status.changed` (Assigned, Arrived, In Progress, Completed).
2. **Connect Mobile Apps to Live API**:
   - Replace local UI state in `client-mobile` with live `fetch` calls to `POST /v1/care-requests/quote` and `POST /v1/care-requests`.
   - When a booking is submitted in `client-mobile`, the live API immediately evaluates candidate proximity and pushes the 45-second offer to `nurse-mobile` over WebSockets.
   - When the nurse taps "Accept", `client-mobile` receives the assigned nurse profile and 4-digit Visit PIN in real time, while `ops-web` reflects the update immediately on the Live Dispatch board.

---

### **Track 2: The Background Job Worker (`apps/worker`)**

> Implements automated marketplace timers and async processors without blocking HTTP threads.

1. **Scaffold `apps/worker` with BullMQ + Redis**:
   - Listed in the system design as the dedicated background queue processor.
2. **Marketplace Queue Jobs**:
   - **45-Second Offer Expiry Job**: If no nurse accepts within 45s, closes round 1, expands search radius (5 km → 12 km → 15 km), and fans out round 2.
   - **Stale Presence Heartbeat Reaper**: Automatically toggles online nurses to `OFFLINE` if no GPS ping has been received in >5 minutes.
   - **Delayed Arrival Watchdog**: Fires an alert to `ops-web` if an assigned nurse has not started navigation 25 minutes prior to scheduled start.

---

### **Track 3: Persistent Database Layer (PostgreSQL + PostGIS + Docker)**

> Transitions the backend from the development in-memory store to an ACID-compliant, production-grade geospatial database.

1. **Local Infrastructure via `docker-compose.yml`**:
   - Managed container configuration for PostgreSQL 16 with the PostGIS extension enabled, plus Redis 7.
2. **Data Modeling & Migrations (Prisma or Drizzle ORM)**:
   - Relational schemas for `users`, `nurse_profiles`, `care_requests`, `bookings`, `dispatch_rounds`, `offers`, and `outbox_events`.
   - PostGIS spatial indexing (`ST_DWithin` / GiST index) for Accra geographic queries.
   - Database-level row locking (`SELECT FOR UPDATE`) on offer acceptance to enforce the atomic winner arbitration invariant.

---

### **Track 4: Live Ghana Payment Gateway (Paystack / Hubtel Sandbox)**

> Replaces simulated minor-unit transactions with real Ghana Mobile Money prompts.

1. **Paystack / Hubtel Provider Client**:
   - Direct integration with Paystack's Mobile Money Charge API (MTN MoMo, Telecel Cash, AT Money).
   - Pre-authorization on booking creation; capture and split payout (85% nurse wallet, 15% platform) on visit check-out.
2. **Cryptographic Webhook Ingestion**:
   - Webhook endpoint with HMAC SHA-512 signature validation and idempotent retry protection.
