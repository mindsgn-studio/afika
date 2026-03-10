# pocket-module

Local Expo module that exposes the `PocketCore` native API to JavaScript.

## Required files

- `expo-module.config.json`: declares iOS module class (`PocketModule`).
- `package.json`: module identity used by Expo autolinking.
- `pocket-module.podspec`: CocoaPods spec and `PocketCore.xcframework` reference.
- `ios/PocketModule.swift`: Expo Modules wrapper with `Name("PocketCore")`.
- `ios/PocketCore.xcframework`: vendored Go mobile framework.

If any of these are missing, `requireNativeModule('PocketCore')` will fail at runtime.

## Build profile env configuration

Pocket runtime config values for Expo builds are defined in `app/eas.json`.
Keep all current `EXPO_PUBLIC_POCKET_*` keys populated for every profile (`development`, `preview`, `production`) so the native bridge and Go core see consistent config at app startup.

Backend sponsorship direction:

- use backend endpoints for readiness and sponsored operations
- keep direct send fallback in mobile core/module path
- do not keep paymaster signer keys in app-visible env

## Regenerate and validate iOS registration

```bash
cd app
npx expo prebuild --clean --platform ios --non-interactive
cd ios && pod install && cd ..
./scripts/check-pocketcore-module.sh
```

The registration source of truth is:
`ios/Pods/Target Support Files/Pods-PocketMoney/ExpoModulesProvider.swift`
