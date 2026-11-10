#!/usr/bin/env bash
# Run independent regressions even if a preceding check fails.
set -uo pipefail
suite=${1:?Expected app-center, invoice, hr, focused-ux or observability}
case "$suite" in app-center|invoice|hr|focused-ux|observability) ;; *) echo "Unknown focused suite: $suite" >&2; exit 2 ;; esac
results="ci-results/focused-$suite"
mkdir -p "$results"
: > "$results/summary.txt"
result=0
run_check() {
  local name=$1 status=0
  shift
  printf 'Command: ' > "$results/$name.log"
  printf '%q ' "$@" >> "$results/$name.log"
  printf '\n' >> "$results/$name.log"
  "$@" >> "$results/$name.log" 2>&1 || status=$?
  cat "$results/$name.log"
  printf '%s: exit %s\n' "$name" "$status" | tee -a "$results/summary.txt"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '%s: exit %s\n' "$name" "$status" >> "$GITHUB_STEP_SUMMARY"
  fi
  if [ "$status" -ne 0 ]; then result=1; fi
}
if [ "$suite" = app-center ]; then
  run_check shared-unit pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts
  run_check app-center-unit pnpm --dir apps/app-center test
fi
run_check browser pnpm --dir apps/e2e exec playwright test --config "playwright.$suite.config.ts"
exit "$result"
