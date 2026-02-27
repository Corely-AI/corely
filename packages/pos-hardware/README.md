# @corely/pos-hardware

Vendor-neutral hardware abstraction for Corely POS.

## What it provides

- `HardwareManager` interface with device discovery + capability checks
- `TseService` abstraction for fiscal transaction calls
- Runtime fallback to a mock provider for simulators/dev
- Android Expo module scaffold (`CorelyPosHardware`) for Kotlin USB integrations

## Runtime selection

- `EXPO_PUBLIC_POS_HARDWARE_PROVIDER=auto` (default)
  Uses native module if available; otherwise mock
- `EXPO_PUBLIC_POS_HARDWARE_PROVIDER=native`
  Requires native module
- `EXPO_PUBLIC_POS_HARDWARE_PROVIDER=mock`
  Forces mock

## Expo workflow

Native code requires a **custom dev client** / EAS build.

1. Add plugin to POS app config:
   - `"plugins": ["@corely/pos-hardware"]`
2. Build dev client for Android.
3. Integrate vendor USB/TSE logic in
   `android/src/main/java/com/corely/poshardware/CorelyPosHardwareModule.kt`.
