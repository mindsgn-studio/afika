# Afika app

The mobile product lives in `app/afika`.

It is a non-custodial Expo wallet on Base (Privy embedded EOA + ZeroDev Kernel) with a tokenized-stock market on top of USDC.

## Screens

- Onboarding / sign-in
- Portfolio, Explore, Activity, Learn, Account
- Stock detail and buy/sell
- Send, receive, swap, top-up

## Run

```bash
cd afika
yarn
yarn start
yarn test
```

Maestro flows: `afika/.maestro/`.

## API configuration

The app no longer uses Firestore. Wallet registration, balances, and
transactions come from the Afika REST API
(`backend/api`, deployed at `https://afika.phumzile.studio`).

Copy `afika/.env.example` to `afika/.env` and never commit `.env`. Expo only
loads env files from the Expo project directory (`app/afika`), not from the
parent `app/` folder.

```bash
cd afika
cp .env.example .env
```

```bash
EXPO_PUBLIC_API_URL=https://afika.phumzile.studio
EXPO_PUBLIC_API_TOKEN=<shared API token>
```

`EXPO_PUBLIC_API_URL` defaults to the production worker. `EXPO_PUBLIC_API_TOKEN`
must match the Worker `API_TOKEN` secret. Restart Expo after changing `.env`.
Without the token the client does not call the API and throws
`UNAUTHENTICATED`.

### What is device-local or disabled

The API exposes `/v1/wallet`, `/v1/balances`, `/v1/transactions`, and
`/v1/fx-rates` for current USD conversion rates.
Features that used Firestore directly are now device-local or disabled:

- Wallet settings, watchlist, eligibility attestation, pending orders and
  pending sends are stored on the device with `expo-sqlite/kv-store`.
- Market prices, price history, portfolio PnL, and push delivery have no REST
  endpoint yet, so they are stubbed or disabled.

## Tests

`yarn test` runs the unit suite plus `lib/api.e2e.test.ts`, which starts a local
HTTP server and exercises wallet upsert, balances, transactions, pagination, and
auth errors.

To hit the deployed API:

```bash
AFIKA_LIVE_API=1 EXPO_PUBLIC_API_TOKEN=<shared API token> yarn test lib/api.live.test.ts
```

See `afika/AGENTS.md` and the root `README.md`.
