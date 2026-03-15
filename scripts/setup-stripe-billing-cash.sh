#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost:8088}"
PRODUCT_KEY="cash-management"

ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

json_get() {
  local field="$1"
  node -e '
    const field = process.argv[1];
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      const json = JSON.parse(input);
      const value = json[field];
      if (typeof value === "undefined") {
        process.exit(1);
      }
      process.stdout.write(String(value));
    });
  ' "$field"
}

create_product() {
  local name="$1"
  local plan_key="$2"

  stripe products create \
    -d "name=${name}" \
    -d "description=Corely ${name} subscription" \
    -d "metadata[corely_product_key]=${PRODUCT_KEY}" \
    -d "metadata[corely_plan_key]=${plan_key}"
}

create_monthly_price() {
  local product_id="$1"
  local amount_cents="$2"
  local plan_key="$3"
  local lookup_key="$4"

  stripe prices create \
    -d "product=${product_id}" \
    -d "currency=eur" \
    -d "unit_amount=${amount_cents}" \
    -d "recurring[interval]=month" \
    -d "lookup_key=${lookup_key}" \
    -d "metadata[corely_product_key]=${PRODUCT_KEY}" \
    -d "metadata[corely_plan_key]=${plan_key}"
}

ensure_command stripe
ensure_command node

echo "Creating Stripe products and recurring monthly prices for ${PRODUCT_KEY}..."

starter_product_json="$(create_product "Cash Management Starter" "starter-monthly")"
starter_product_id="$(printf '%s' "${starter_product_json}" | json_get id)"
starter_price_json="$(create_monthly_price "${starter_product_id}" 1500 "starter-monthly" "cash_management_starter_monthly")"
starter_price_id="$(printf '%s' "${starter_price_json}" | json_get id)"

pro_product_json="$(create_product "Cash Management Pro" "pro-monthly")"
pro_product_id="$(printf '%s' "${pro_product_json}" | json_get id)"
pro_price_json="$(create_monthly_price "${pro_product_id}" 2400 "pro-monthly" "cash_management_pro_monthly")"
pro_price_id="$(printf '%s' "${pro_price_json}" | json_get id)"

multi_product_json="$(create_product "Cash Management Multi-location" "multi-location-monthly")"
multi_product_id="$(printf '%s' "${multi_product_json}" | json_get id)"
multi_price_json="$(create_monthly_price "${multi_product_id}" 4900 "multi-location-monthly" "cash_management_multi_location_monthly")"
multi_price_id="$(printf '%s' "${multi_price_json}" | json_get id)"

cat <<EOF

Stripe prices created.

Add these values to your local .env:

STRIPE_BILLING_PRICE_STARTER_MONTHLY=${starter_price_id}
STRIPE_BILLING_PRICE_PRO_MONTHLY=${pro_price_id}
STRIPE_BILLING_PRICE_MULTI_LOCATION_MONTHLY=${multi_price_id}
STRIPE_BILLING_SUCCESS_URL=${FRONTEND_BASE_URL}/settings/billing?checkout=success
STRIPE_BILLING_CANCEL_URL=${FRONTEND_BASE_URL}/settings/billing?checkout=cancelled
STRIPE_BILLING_PORTAL_RETURN_URL=${FRONTEND_BASE_URL}/settings/billing

Start local webhook forwarding with:

stripe listen --forward-to ${API_BASE_URL}/billing/webhooks/stripe

After Stripe prints the signing secret, set:

STRIPE_WEBHOOK_SECRET=whsec_...

Useful test events:

stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
EOF
