# app/afika agents

Expo 57 + expo-router app for Afika.

## Design

- Tokens live in `theme/colors.ts`, `theme/fonts.ts`, `theme/typography.ts`.
- Do not add raw hex, `black`, or `white`. Import `colors` and `fonts` from `@/theme`.
- Fonts: Outfit 400 / 500 / 600, loaded in `app/_layout.tsx`.
- Before creating a component, look through `components/shared/` and `components/ui/`. Those folders are the reusable pieces. Use or extend an existing component when it already fits.
- Shared: `components/shared/` (`Screen`, `Card`, `Title`, `Body`, `BodyText`, `Balance`, `Button`, `SubButton`, `HapticPressable`).
- Shared UI: `components/ui/` (`StockLogo`, `PriceChart`, `HeroHeader`, `Sheet`, `StatCard`, `HoldingRow`, `RangePills`, `PillButton`, `IconButton`).
- Colors in `components/shared/` and `components/ui/` come from `theme/colors.ts` only.
- Visual reference: `/_/stocks`.

## Routes

Tabs in `app/(home)`: Portfolio (`index`), Explore, Activity, Learn, Account.

Stacks: `onboarding`, `sign-in`, `stock/[address]`, `trade/[address]`, `send/*`, `receive`, `swap`, `top-up`, `transaction/*`.

Stock identity is the Base contract address, not the ticker.

Wallets are registered with `PUT /v1/wallet` by `upsertWallet` in `lib/wallet-service.ts` once the kernel address is ready. The address is the wallet key, so re-registering updates it in place. Do not register wallets through `auth-session`. The app no longer uses Firestore: balances and transactions are read from the REST API, and device-local data uses `lib/local-store.ts`.

## Trade invariants

- Eligibility: country set, not `US`, residency + terms attested.
- Preflight: `tradable` and not `paused`. Warn on `navStale`.
- Buy = USDC -> stock. Sell = stock -> USDC. One Kernel userOp with exact approve + swap.
- Create order `pending`, update `submitted` + `userOperationHash`, or `failed`. Never write `confirmed`.
- Multiplier math is in `lib/trade.ts` (`uiToRaw` / `rawToUi`).

## Tests

```bash
yarn test
```

Unit tests cover `lib/trade.ts` and `lib/eligibility.ts`.

Maestro:

```bash
maestro test .maestro/onboarding.yaml
maestro test .maestro/explore-search.yaml
maestro test .maestro/stock-detail.yaml
maestro test .maestro/buy-review.yaml
maestro test .maestro/sell-review.yaml
maestro test .maestro/watchlist.yaml
maestro test .maestro/account.yaml
```

Every interactive screen should have a `testID`. Use `testID="trade-review"` for the review card. Do not submit a live trade in Maestro unless `E2E_LIVE=1`.
