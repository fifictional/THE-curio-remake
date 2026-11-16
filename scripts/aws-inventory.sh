#!/usr/bin/env bash
#
# Read-only AWS inventory for the DynamoDB → Postgres migration.
#
# Every call is Describe / List / Get / ListTagsOfResource. No data is read, and
# nothing is written, created or deleted.
#
# Usage:
#   ./scripts/aws-inventory.sh eu-west-2            # uses the default profile
#   AWS_PROFILE=curio ./scripts/aws-inventory.sh eu-west-2
#   KEEP=1 ./scripts/aws-inventory.sh eu-west-2     # keep intermediate files
#
# Output:
#   docs/migration/aws-inventory.json   raw facts
#   docs/migration/aws-inventory.md     shareable summary
#   docs/migration/templates/*.json      CloudFormation templates (gitignored)

set -uo pipefail

REGION="${1:-${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}}"
OUT_DIR="docs/migration"
JSON="$OUT_DIR/aws-inventory.json"
MD="$OUT_DIR/aws-inventory.md"

mkdir -p "$OUT_DIR"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Install AWS CLI v2, then re-run." >&2
  exit 1
fi
if [ -z "$REGION" ]; then
  echo "No region. Pass it: ./scripts/aws-inventory.sh eu-west-2" >&2
  exit 1
fi

say() { echo "→ $*"; }

say "identity"
if ! aws sts get-caller-identity --output json > "$OUT_DIR/identity.json" 2>/dev/null; then
  echo "Not authenticated. For SSO: aws sso login --profile <name>" >&2
  exit 1
fi
ACCOUNT=$(python3 -c "import json;print(json.load(open('$OUT_DIR/identity.json'))['Account'])")
echo "  account $ACCOUNT, region $REGION"

say "dynamodb tables"
aws dynamodb list-tables --region "$REGION" --output json > "$OUT_DIR/tables.json"

say "describe each table (keys, indexes, item counts)"
: > "$OUT_DIR/describe.ndjson"
python3 - "$OUT_DIR/tables.json" > /tmp/curio-ddb-tables.txt <<'PY_TABLES'
import json, sys
for name in json.load(open(sys.argv[1])).get("TableNames", []):
    print(name)
PY_TABLES

while read -r table; do
  [ -z "$table" ] && continue
  aws dynamodb describe-table --region "$REGION" --table-name "$table" --output json \
    | python3 -c 'import json,sys;print(json.dumps(json.load(sys.stdin)))' \
    >> "$OUT_DIR/describe.ndjson"
  echo "  $table"
done < /tmp/curio-ddb-tables.txt

say "table -> owning stack (this is what separates dev from release)"
: > "$OUT_DIR/table-tags.ndjson"
while read -r table; do
  [ -z "$table" ] && continue
  arn="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${table}"
  aws dynamodb list-tags-of-resource --region "$REGION" --resource-arn "$arn" \
    --output json 2>/dev/null \
  | python3 -c "
import json, sys
raw = sys.stdin.read() or '{}'
try:
    tags = {t['Key']: t['Value'] for t in json.loads(raw).get('Tags', [])}
except Exception:
    tags = {}
print(json.dumps({
    'table': '''$table''',
    'stack': tags.get('aws:cloudformation:stack-name', ''),
    'environment': tags.get('Environment', ''),
}))
" >> "$OUT_DIR/table-tags.ndjson"
done < /tmp/curio-ddb-tables.txt

say "cloudformation stacks + templates"
aws cloudformation list-stacks --region "$REGION" \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE \
  --output json > "$OUT_DIR/stacks.json" 2>/dev/null || echo '{"StackSummaries":[]}' > "$OUT_DIR/stacks.json"

mkdir -p "$OUT_DIR/templates"
python3 - "$OUT_DIR/stacks.json" > /tmp/curio-stacks.txt <<'PY_STACKS'
import json, sys
for s in json.load(open(sys.argv[1])).get("StackSummaries", []):
    print(s["StackName"])
PY_STACKS

while read -r stack; do
  [ -z "$stack" ] && continue
  aws cloudformation get-template --region "$REGION" --stack-name "$stack" \
    --output json > "$OUT_DIR/templates/${stack//\//_}.json" 2>/dev/null || true
done < /tmp/curio-stacks.txt
echo "  $(wc -l < /tmp/curio-stacks.txt) stacks"

say "cognito user pools (ids only — no user data)"
aws cognito-idp list-user-pools --max-results 60 --region "$REGION" --output json \
  > "$OUT_DIR/user-pools.json" 2>/dev/null || echo '{"UserPools":[]}' > "$OUT_DIR/user-pools.json"

say "assembling summary"
python3 - "$OUT_DIR" "$ACCOUNT" "$REGION" <<'PY_ASSEMBLE'
import json, os, sys

out_dir, account, region = sys.argv[1], sys.argv[2], sys.argv[3]

def load(path, default):
    full = os.path.join(out_dir, path)
    if not os.path.exists(full):
        return default
    try:
        with open(full) as fh:
            text = fh.read().strip()
        return json.loads(text) if text else default
    except json.JSONDecodeError:
        return default

identity = load("identity.json", {})
tags = {}
for line in load("table-tags.ndjson", "") if False else []:
    pass
tags_path = os.path.join(out_dir, "table-tags.ndjson")
if os.path.exists(tags_path):
    for line in open(tags_path):
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
            tags[row["table"]] = row
        except json.JSONDecodeError:
            continue

tables = []
describe_path = os.path.join(out_dir, "describe.ndjson")
if os.path.exists(describe_path):
    for line in open(describe_path):
        line = line.strip()
        if not line:
            continue
        try:
            t = json.loads(line)["Table"]
        except (json.JSONDecodeError, KeyError):
            continue
        tables.append({
            "name": t["TableName"],
            "itemCount": t.get("ItemCount"),
            "sizeBytes": t.get("TableSizeBytes"),
            "billingMode": (t.get("BillingModeSummary") or {}).get("BillingMode", "PROVISIONED"),
            "keySchema": [{"name": k["AttributeName"], "type": k["KeyType"]} for k in t.get("KeySchema", [])],
            "attributeTypes": [{"name": a["AttributeName"], "type": a["AttributeType"]} for a in t.get("AttributeDefinitions", [])],
            "globalIndexes": [
                {
                    "name": g["IndexName"],
                    "keySchema": [{"name": k["AttributeName"], "type": k["KeyType"]} for k in g.get("KeySchema", [])],
                    "itemCount": g.get("ItemCount"),
                }
                for g in t.get("GlobalSecondaryIndexes", [])
            ],
            "stream": (t.get("StreamSpecification") or {}).get("StreamEnabled", False),
            "stack": tags.get(t["TableName"], {}).get("stack", ""),
            "environment": tags.get(t["TableName"], {}).get("environment", ""),
        })

stacks = [
    {"name": s["StackName"], "status": s["StackStatus"]}
    for s in load("stacks.json", {}).get("StackSummaries", [])
]
pools = [{"id": p["Id"], "name": p["Name"]} for p in load("user-pools.json", {}).get("UserPools", [])]

tables.sort(key=lambda x: -(x["itemCount"] or 0))
payload = {"identity": identity, "region": region, "tables": tables, "stacks": stacks, "userPools": pools}
with open(os.path.join(out_dir, "aws-inventory.json"), "w") as fh:
    json.dump(payload, fh, indent=2)

# Amplify table names end with the data backend id. The tags confirm the mapping
# (verified from the tagged rows): shq3… = release, e5zkp… = main/dev.
KNOWN_SUFFIX = {
    "shq3giqnkzcpjkd4lgxh3yfjq4": "RELEASE",
    "e5zkpg67jvezvmxgyuoq2awjty": "dev",
}

def env_of(t):
    for suffix, name in KNOWN_SUFFIX.items():
        if t["name"].endswith(f"-{suffix}-NONE"):
            return name
    stack = t["stack"]
    if "release-branch" in stack:
        return "RELEASE"
    if "main-branch" in stack:
        return "dev"
    if t["environment"]:
        return t["environment"]
    return "?"

lines = [
    "# AWS inventory (read-only)",
    "",
    f"Account **{account}**, region **{region}**",
    "",
    "## DynamoDB tables by row count",
    "",
    "| table | env | items | MB | partition key | sort key | GSIs |",
    "|---|---|---|---|---|---|---|",
]
for t in tables:
    keys = {k["type"]: k["name"] for k in t["keySchema"]}
    mb = round((t["sizeBytes"] or 0) / 1024 / 1024, 1)
    lines.append(
        f'| {t["name"]} | {env_of(t)} | {t["itemCount"]} | {mb} | '
        f'{keys.get("HASH", "")} | {keys.get("RANGE", "—")} | {len(t["globalIndexes"])} |'
    )

for env in ("dev", "RELEASE", "?"):
    subset = [t for t in tables if env_of(t) == env]
    if subset:
        rows = sum(t["itemCount"] or 0 for t in subset)
        size = round(sum(t["sizeBytes"] or 0 for t in subset) / 1024 / 1024, 1)
        lines.append(f"\n**{env}**: {len(subset)} tables, ~{rows:,} rows, {size} MB")

lines += ["", "## Stacks", ""]
for name in sorted({s["name"] for s in stacks if "amplify" in s["name"]}):
    lines.append(f"- {name}")
if not any("amplify" in s["name"] for s in stacks):
    lines.append("- (no amplify stacks visible)")

lines += ["", "## Cognito pools", ""]
for p in pools:
    lines.append(f'- {p["name"]} `{p["id"]}`')
if not pools:
    lines.append("- (none found)")

with open(os.path.join(out_dir, "aws-inventory.md"), "w") as fh:
    fh.write("\n".join(lines) + "\n")

print(f"  {len(tables)} tables, {len(stacks)} stacks, {len(pools)} pools")
PY_ASSEMBLE

if [ "${KEEP:-0}" = "1" ]; then
  echo "intermediate files kept in $OUT_DIR"
else
  rm -f "$OUT_DIR/tables.json" "$OUT_DIR/describe.ndjson" "$OUT_DIR/table-tags.ndjson" \
        "$OUT_DIR/stacks.json" "$OUT_DIR/user-pools.json" "$OUT_DIR/identity.json" \
        /tmp/curio-ddb-tables.txt /tmp/curio-stacks.txt
fi

echo
echo "Done. Share these two files:"
echo "  $MD"
echo "  $JSON"
