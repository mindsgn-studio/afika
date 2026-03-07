#!/usr/bin/env bash
set -euo pipefail

PROVIDER_FILE="ios/Pods/Target Support Files/Pods-PocketMoney/ExpoModulesProvider.swift"

if [[ ! -f "$PROVIDER_FILE" ]]; then
  echo "[PocketCore check] Missing $PROVIDER_FILE"
  echo "Run: npx expo prebuild --clean --platform ios && (cd ios && pod install)"
  exit 1
fi

if grep -Eq "PocketCore|PocketModule" "$PROVIDER_FILE"; then
  echo "[PocketCore check] OK: Pocket module registration found in ExpoModulesProvider.swift"
  exit 0
fi

echo "[PocketCore check] FAIL: PocketCore not registered in ExpoModulesProvider.swift"
exit 1
