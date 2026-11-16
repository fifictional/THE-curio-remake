#!/usr/bin/env bash
#
# Read-only AWS inventory for the DynamoDB → Postgres migration.
#
# Nothing here writes, deletes or mutates. Every call is Describe/List/Get.
#
# Usage:
#   AWS_PROFILE=curio-dev ./scripts/aws-inventory.sh [region]
#
# Output:
#   docs/migration/aws-inventory.json   raw facts
#   docs/migration/aws-inventory.md     human summary (this is what to share)

set -uo pipefail

REGION="${1:-${AWS_REGION:-}}"
OUT_DIR="docs/migration"
JSON="$OUT_DIR/aws-inventory.json"
MD="$OUT_DIR/aws-inventory.md"

mkdir -p "$OUT_DIR"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Install AWS CLI v2, then re-run." >&2
  exit 1
fi

if [ -z "$REGION" ]; then
  REGION="$(aws configure get region 2>/dev/null || true)"
fi
if [ -z "$REGION" ]; then
  echo "No region. Pass it: ./scripts/aws-inventory.sh eu-west-1" >&2
  exit 1
fi

echo "→ identity"
aws sts get-caller-identity --output json > "$OUT_DIR/identity.json" || {
  echo "Not authenticated. Run: aws sso login --profile \$AWS_PROFILE" >&2
  exit 1
}

ACCOUNT=$(python3 -c "import json;print(json.load(open('$OUT_DIR/identity.json'))['Account'])")
echo "  account $ACCOUNT, region $REGION"

echo "→ dynamodb tables"
aws dynamodb list-tables --region "$REGION" --output json > "$OUT_DIR/tables.json"

echo "→ describe each table (keys, indexes, item counts)"
: > "$OUT_DIR/describe.ndjson"
python3 - "$OUT_DIR/tables.json" <<'PY' > /tmp/ddb-table-names.txt
import json, sys
print("\n".join(json.load(open(sys.argv[1])).get("TableNames", [])))
PY

while read -r table; do
  [ -z "$table" ] && continue
  aws dynamodb describe-table --region "$REGION" --table-name "$table" --output json \
    >> "$OUT_DIR/describe.ndjson"
  echo "  $table"
done < /tmp/ddb-table-names.txt

echo "→ cloudformation stacks + templates"
aws cloudformation list-stacks --region "$REGION" \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE \
  --output json > "$OUT_DIR/stacks.json"

mkdir -p "$OUT_DIR/templates"
python3 - "$OUT_DIR/stacks.json" <<'PY' > /tmp/stack-names.txt
import json, sys
stacks = json.load(open(sys.argv[1])).get("StackSummaries", [])
print("\n".join(s["StackName"] for s in stacks))
PY

while read -r stack; do
  [ -z "$stack" ] && continue
  aws cloudformation get-template --region "$REGION" --stack-name "$stack" \
    --output json > "$OUT_DIR/templates/${stack//\//_}.json" 2>/dev/null || true
  echo "  $stack"
done < /tmp/stack-names.txt

echo "→ cognito user pools (sizing only, no user data)"
aws cognito-idp list-user-pools --max-results 20 --region "$REGION" --output json \
  > "$OUT_DIR/user-pools.json" 2>/dev/null || echo '{"UserPools":[]}' > "$OUT_DIR/user-pools.json"

echo "→ assembling json"
python3 - "$OUT_DIR" "$ACCOUNT" "$REGION" <<'PY'
import json, os, sys

out_dir, account, region = sys.argv[1], sys.argv[2], sys.argv[3]

identity = json.load(open(os.path.join(out_dir, "identity.json")))

tables = []
for line in open(os.path.join(out_dir, "describe.ndjson")):
    line = line.strip()
    if not line:
        continue
    t = json.loads(line)["Table"]
    tables.append({
        "name": t["TableName"],
        "itemCount": t.get("ItemCount"),
        "sizeBytes": t.get("TableSizeBytes"),
        "billingMode": (t.get("BillingModeSummary") or {}).get("BillingMode", "PROVISIONED"),
        "keySchema": [
            {"name": k["AttributeName"], "type": k["KeyType"]} for k in t.get("KeySchema", [])
        ],
        "attributeTypes": [
            {"name": a["AttributeName"], "type": a["AttributeType"]} for a in t.get("AttributeDefinitions", [])
        ],
        "globalIndexes": [
            {
                "name": g["IndexName"],
                "keySchema": [
                    {"name": k["AttributeName"], "type": k["KeyType"]} for k in g.get("KeySchema", [])
                ],
                "itemCount": g.get("ItemCount"),
            }
            for g in t.get("GlobalSecondaryIndexes", [])
        ],
        "stream": (t.get("StreamSpecification") or {}).get("StreamEnabled", False),
    })

stacks = [
    {"name": s["StackName"], "status": s["StackStatus"], "updated": s.get("LastUpdatedTime", "")}
    for s in json.load(open(os.path.join(out_dir, "stacks.json"))).get("StackSummaries", [])
]

pools = [
    {"id": p["Id"], "name": p["Name"]}
    for p in json.load(open(os.path.join(out_dir, "user-pools.json"))).get("UserPools", [])
]

payload = {
    "identity": identity,
    "region": region,
    "tables": sorted(tables, key=lambda x: -(x["itemCount"] or 0)),
    "stacks": stacks,
    "userPools": pools,
}
with open(os.path.join(out_dir, "aws-inventory.json"), "w") as fh:
    json.dump(payload, fh, indent=2)

lines = [
    "# AWS inventory (read-only)",
    "",
    f"Account **{account}**, region **{region}**",
    "",
    "## DynamoDB tables by row count",
    "",
    "| table | items | size (MB) | keys | indexes |",
    "|---|---|---|---|---|",
]
for t in payload["tables"]:
    keys = ", ".join(f'{k["name"]}({k["type"][0]})' for k in t["keySchema"])
    size_mb = round((t["sizeBytes"] or 0) / 1024 / 1024, 1)
    lines.append(
        f'| {t["name"]} | {t["itemCount"]} | {size_mb} | {keys} | {len(t["globalIndexes"])} |'
    )

total = sum(t["itemCount"] or 0 for t in payload["tables"])
lines += ["", f"**{len(payload['tables'])} tables, ~{total:,} rows total**", "", "## Stacks", ""]
for s in payload["stacks"]:
    lines.append(f'- {s["name"]} ({s["status"]})')

lines += ["", "## Cognito pools", ""]
for p in payload["userPools"]:
    lines.append(f'- {p["name"]} `{p["id"]}`')
if not payload["userPools"]:
    lines.append("- (none found)")

with open(os.path.join(out_dir, "aws-inventory.md"), "w") as fh:
    fh.write("\n".join(lines) + "\n")

print("ok")
PY

rm -f "$OUT_DIR/tables.json" "$OUT_DIR/describe.ndjson" "$OUT_DIR/stacks.json" \
      "$OUT_DIR/user-pools.json" "$OUT_DIR/identity.json" /tmp/ddb-table-names.txt /tmp/stack-names.txt

echo
echo "Done. Share these two files:"
echo "  $MD"
echo "  $JSON"
