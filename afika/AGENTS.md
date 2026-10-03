# app/afika agents

Expo 57 + expo-router app for Afika.

## Design

- Tokens live in `theme/colors.ts`, `theme/fonts.ts`, `theme/typography.ts`.
- Do not add raw hex in new screens. Import `colors` and `fonts`.
- Fonts: Outfit 400 / 500 / 600, loaded in `app/_layout.tsx`.
- Shared UI: `components/ui/` (`StockLogo`, `PriceChart`, `HeroHeader`, `Sheet`, `StatCard`, `HoldingRow`, `RangePills`, `PillButton`, `IconButton`).
- Visual reference: `/_/stocks`.

## Routes

Tabs in `app/(home)`: Portfolio (`index`), Explore, Activity, Learn, Account.

Stacks: `onboarding`, `sign-in`, `stock/[address]`, `trade/[address]`, `send/*`, `receive`, `swap`, `top-up`, `transaction/*`.

Stock identity is the Base contract address, not the ticker.

Wallet documents are created in Firestore by `upsertWallet` when the kernel address is ready. Create only `address`, `network`, and timestamps. Never overwrite an existing wallet. Do not register wallets through `auth-session`.

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
