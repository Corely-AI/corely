# Currency Selector Implementation Summary

## Files Changed/Added

### New Files Created

1. **apps/web/src/shared/lib/currency.ts** - Currency utilities
   - Default currency codes (top 10 + VND)
   - Normalization, validation, sorting functions
   - Symbol derivation using Intl API

2. **apps/web/src/shared/components/CurrencySelect.tsx** - Shared component
   - Alphabetically sorted currency options
   - Custom currency addition with validation
   - LocalStorage persistence support
   - Symbol display (derived, not stored)

3. **apps/web/src/shared/components/index.ts** - Component exports
   - Centralized export location for shared components

4. **apps/web/src/shared/lib/currency.spec.ts** - Unit tests
   - 16 tests covering all utility functions
   - All tests passing

5. **apps/web/src/shared/components/CurrencySelect.spec.tsx** - Component tests
   - Tests for sorting, custom addition, validation
   - Tests for duplicate prevention and edge cases

### Modified Files

6. **apps/web/src/modules/rentals/screens/RentalPropertyEditorPage.tsx**
   - Replaced hardcoded Select with CurrencySelect
   - Removed unused Select imports
   - Added persistCustomKey for localStorage

## Implementation Details

### 1. Alphabetical Sorting

The component uses `sortCurrencyCodes()` which:

- Normalizes all codes to uppercase
- Removes duplicates using Set
- Sorts alphabetically using native Array.sort()
- Applied to merged list of: base currencies + custom currencies + current value

### 2. Custom Currency Addition

**User Flow:**

1. User clicks currency dropdown
2. Input field appears at top of dropdown with "Add (e.g., SGD)" placeholder
3. User types currency code (e.g., "sgd")
4. User clicks Plus button or presses Enter
5. Code is normalized to uppercase: "SGD"
6. Validation: Must match `/^[A-Z]{3}$/`
7. If valid:
   - Added to options list
   - Immediately selected
   - Persisted to localStorage (if persistCustomKey provided)
   - onCustomAdded callback fired
8. If invalid: Inline error "Must be 3 letters (e.g., SGD)"
9. If duplicate: Just selects existing option (no error)

**Validation Logic:**

```typescript
normalizeCurrencyCode(input) → trim + uppercase
isValidCurrencyCode(normalized) → test /^[A-Z]{3}$/
```

### 3. Persistence

**LocalStorage Strategy:**

- Key format: `corely.currency.custom.{persistCustomKey}`
- For rentals: `corely.currency.custom.rentals.currencies`
- Stored as JSON array: `["SGD", "THB", "MYR"]`
- Loaded on component mount
- Validated on load (filters invalid codes)
- Persisted on customCodes state change
- Graceful error handling (ignores parse/storage errors)

### 4. Symbol Display

- Derived at render time using `getCurrencySymbol(code, locale)`
- Uses `Intl.NumberFormat().formatToParts()` with `currencyDisplay: "narrowSymbol"`
- Fallback to currency code if Intl fails
- Display format: `"USD ($)"` or just `"USD"` (controllable via `showSymbol` prop)
- **Never persisted** - only the 3-letter code is stored/emitted

## RentalPropertyEditorPage Integration

### Before:

```tsx
<Select value={currency} onValueChange={setCurrency}>
  <SelectTrigger className="w-[100px]">
    <SelectValue placeholder="Currency" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="USD">USD</SelectItem>
    <SelectItem value="EUR">EUR</SelectItem>
    <SelectItem value="GBP">GBP</SelectItem>
    <SelectItem value="CAD">CAD</SelectItem>
    <SelectItem value="AUD">AUD</SelectItem>
  </SelectContent>
</Select>
```

### After:

```tsx
<CurrencySelect
  value={currency}
  onValueChange={setCurrency}
  persistCustomKey="rentals.currencies"
  showSymbol={false}
/>
```

**Benefits:**

- 11 default currencies (instead of 5)
- Alphabetically sorted
- Custom currency support
- Consistent with shared schema validation
- Persisted custom currencies across sessions

## Testing

### Unit Tests (currency.spec.ts) - ✅ 16/16 passing

- `normalizeCurrencyCode`: trim + uppercase
- `isValidCurrencyCode`: 3-letter validation
- `sortCurrencyCodes`: alpha sort + deduplication
- `getCurrencySymbol`: Intl derivation
- `DEFAULT_CURRENCY_CODES`: list validation

### Component Tests (CurrencySelect.spec.tsx)

- Alphabetical display verification
- Custom currency addition flow
- Validation error handling
- Duplicate prevention
- Custom currency list override
- Current value inclusion (even if not in list)

## Component Props Reference

```typescript
interface CurrencySelectProps {
  value?: string; // Current ISO code
  onValueChange: (code: string) => void; // Emits normalized uppercase code
  currencies?: readonly string[]; // Override default list (e.g., from tenant)
  disabled?: boolean; // Disable entire component
  placeholder?: string; // Trigger placeholder
  showSymbol?: boolean; // Display "USD ($)" vs "USD" (default: true)
  locale?: string; // For symbol derivation (default: navigator.language)
  allowCustom?: boolean; // Show custom input (default: true)
  onCustomAdded?: (code: string) => void; // Callback when custom added
  persistCustomKey?: string; // LocalStorage key suffix for persistence
}
```

## TODOs / Future Improvements

1. **Tenant Preferences Integration**
   - Replace localStorage with tenant-level saved custom currencies
   - Sync across workspaces/devices
   - Admin UI to manage enabled currencies per tenant

2. **ISO 4217 Strict Validation (Optional)**
   - Add optional `strict` mode that validates against official ISO 4217 list
   - Could warn users when adding non-standard codes
   - Keep current permissive mode as default for flexibility

3. **Currency Metadata**
   - Add currency names: "USD (United States Dollar)"
   - Add minor unit info (e.g., JPY has 0 decimal places)
   - Could be useful for formatting improvements

4. **Server-Side Validation**
   - Backend should also validate currency codes on API boundaries
   - Already covered by `CurrencyCodeSchema` in contracts package

## Acceptance Criteria - ✅ All Met

- ✅ CurrencySelect shows default currencies (top 10 + VND) alphabetically
- ✅ Users can add custom 3-letter code (e.g., SGD) and select immediately
- ✅ Emitted/stored values are uppercase ISO codes only
- ✅ RentalPropertyEditorPage no longer hardcodes currency SelectItems
- ✅ No symbols persisted; symbols derived via Intl for display only
- ✅ Tests cover validation + normalization + formatting
- ✅ Component integrated and working
