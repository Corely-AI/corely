#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west4}"
SOURCE_SERVICE="${SOURCE_SERVICE:-corely-api}"
TARGET_SERVICE="${TARGET_SERVICE:-corely-worker}"
OUT_ENV="${OUT_ENV:-.env.prod}"
APPLY_TO_WORKER=true

usage() {
  cat <<'EOF'
Sync env vars from one Cloud Run service to local .env file and optionally to another service.

Usage:
  ./scripts/sync-cloudrun-worker-env.sh [options]

Options:
  --project <project-id>      GCP project ID (defaults to gcloud configured project)
  --region <region>           Cloud Run region (default: europe-west4)
  --source <service-name>     Source service to copy env from (default: corely-api)
  --target <service-name>     Target service to update (default: corely-worker)
  --out-env <file-path>       Output .env file path (default: .env.prod)
  --no-apply                  Do not update target service, only write .env file
  -h, --help                  Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE_SERVICE="${2:-}"
      shift 2
      ;;
    --target)
      TARGET_SERVICE="${2:-}"
      shift 2
      ;;
    --out-env)
      OUT_ENV="${2:-}"
      shift 2
      ;;
    --no-apply)
      APPLY_TO_WORKER=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required but not installed." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not installed." >&2
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null | tr -d '\r')"
fi

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "Missing project ID. Pass --project or set PROJECT_ID." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SOURCE_JSON="$TMP_DIR/source-service.json"
ENV_YAML="$TMP_DIR/target-env.yaml"

echo "Reading env from Cloud Run service '$SOURCE_SERVICE' (${PROJECT_ID}/${REGION})..."
gcloud run services describe "$SOURCE_SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format=json > "$SOURCE_JSON"

python3 - "$SOURCE_JSON" "$OUT_ENV" "$ENV_YAML" <<'PY'
import json
import sys
from datetime import datetime, timezone

source_json_path, out_env_path, out_yaml_path = sys.argv[1:]

with open(source_json_path, "r", encoding="utf-8") as f:
    service = json.load(f)

service_name = service.get("metadata", {}).get("name", "unknown")
containers = (
    service.get("spec", {})
    .get("template", {})
    .get("spec", {})
    .get("containers", [])
)
container = containers[0] if containers else {}
env_list = container.get("env", [])

env_map: dict[str, str] = {}
skipped: list[str] = []
for entry in env_list:
    name = entry.get("name")
    if not name:
        continue
    if "value" not in entry:
        skipped.append(name)
        continue
    value = entry.get("value")
    env_map[name] = "" if value is None else str(value)

timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

with open(out_env_path, "w", encoding="utf-8") as f:
    f.write(f"# Generated from Cloud Run service {service_name} at {timestamp}\n")
    for key in sorted(env_map):
        f.write(f"{key}={json.dumps(env_map[key])}\n")

with open(out_yaml_path, "w", encoding="utf-8") as f:
    for key in sorted(env_map):
        f.write(f"{key}: {json.dumps(env_map[key])}\n")

print(f"Wrote {len(env_map)} env vars to {out_env_path}")
if skipped:
    print(
        "Skipped vars without plain values (likely secret refs): "
        + ", ".join(sorted(set(skipped)))
    )
PY

if [[ "$APPLY_TO_WORKER" == "true" ]]; then
  echo "Updating Cloud Run service '$TARGET_SERVICE'..."
  gcloud run services update "$TARGET_SERVICE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --env-vars-file "$ENV_YAML"
  echo "Done. '$TARGET_SERVICE' now uses env copied from '$SOURCE_SERVICE'."
else
  echo "Skipped Cloud Run update because --no-apply was set."
fi
