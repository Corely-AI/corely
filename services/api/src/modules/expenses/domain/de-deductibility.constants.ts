/**
 * Germany (DE) 2026 Deductibility Constants
 *
 * Keep all numeric constants here so they are easy to update annually.
 * Reference: EStG §4 Abs. 5, BMF-Schreiben Tagegeld 2026.
 */

// ---------------------------------------------------------------------------
// Gift threshold (§4 Abs. 5 Nr. 1 EStG)
// ---------------------------------------------------------------------------

/** Maximum gift value (in cents) deductible per recipient per calendar year. €50. */
export const DE_GIFT_THRESHOLD_CENTS = 5_000;

// ---------------------------------------------------------------------------
// Travel-meal per-diem rates for DE 2026 (§9 Abs. 4a EStG)
// ---------------------------------------------------------------------------

/** Per-diem for ≥ 8 h absence or arrival/departure day (in cents). €14. */
export const DE_TRAVEL_MEAL_PARTIAL_DAY_CENTS = 1_400;

/** Per-diem for full 24 h absence (in cents). €28. */
export const DE_TRAVEL_MEAL_FULL_DAY_CENTS = 2_800;

/** Minimum absence hours to qualify for a partial-day per-diem. */
export const DE_TRAVEL_MEAL_MIN_HOURS = 8;

// ---------------------------------------------------------------------------
// Home-office flat-rate (§4 Abs. 5 Nr. 6b / §9 Abs. 5 EStG)
// ---------------------------------------------------------------------------

/** Deductible amount per home-office day (in cents). €6. */
export const DE_HOME_OFFICE_PER_DAY_CENTS = 600;

/** Annual cap for home-office flat-rate deduction (in cents). €1,260. */
export const DE_HOME_OFFICE_ANNUAL_CAP_CENTS = 126_000;
