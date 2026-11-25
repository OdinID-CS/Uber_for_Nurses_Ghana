# Uber for Nurses Ghana

Local development workspace for a home-care booking marketplace. See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for product scope and architecture, and [dispatch API contracts](docs/api/dispatch-contracts.md) for initial API behavior.

## Planned apps

- `apps/client-mobile`: family booking app (Expo / React Native)
- `apps/nurse-mobile`: nurse availability and dispatch app (Expo / React Native)
- `apps/api`: NestJS API and realtime gateway
- `apps/ops-web`: internal operations console
- `apps/worker`: background jobs and notifications

## Prerequisites

- Node.js LTS
- Corepack enabled and pnpm
- Android Studio for local Android emulation (optional for initial web-based Expo preview)

## Workspace status

The workspace setup is fully complete and verified runnable:
- **`apps/api`**: Fully implemented NestJS API matching [dispatch-contracts.md](docs/api/dispatch-contracts.md) (nurses availability, location presence, care quotes, care requests, WebSocket gateway, and atomic first-committed-winner simultaneous offer arbitration).
- **`apps/worker`**: Dedicated background worker service processing 45s offer expirations, cohort radius widening, stale GPS heartbeat reaping, and arrival watchdog alerts.
- **`apps/ops-web`**: Next.js 15 operations console for real-time dispatch monitoring, N&MC credential review workbench, and mobile money financial ledger.
- **`apps/client-mobile`**: Expo Router family booking app with live quote calculations, matching radar, and 4-digit Visit PIN verification.
- **`apps/nurse-mobile`**: Expo Router nurse partner app with live WebSocket offer alerts, 45s countdown timer, client PIN check-in, and clinical checklist check-out.

## Running the apps

Install all dependencies across the monorepo:
```bash
pnpm install
```

### 1. Run the NestJS API
```bash
pnpm dev:api
# Or run built server:
pnpm --filter @nurses/api start
```
Default URL: `http://localhost:3000` (Health endpoints at `/health` and `/v1/health`).

### 2. Run the Client Family Mobile App
```bash
pnpm dev:client
```
Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code using Expo Go.

### 3. Run the Nurse Partner Mobile App
```bash
pnpm dev:nurse
```
Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code using Expo Go.

### 4. Run the Operations Web Console
```bash
pnpm dev:ops
```
Access at `http://localhost:3001`.

### 5. Run the Background Job Worker
```bash
pnpm dev:worker
```

### 6. Verification and quality checks
```bash
# Run all automated tests
pnpm test

# Typecheck all packages
pnpm typecheck

# Build all packages
pnpm build
```
