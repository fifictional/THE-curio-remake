#!/usr/bin/env bash
#
# Dump a few sample rows per table from the DEV environment, for schema/transform
# work. Read-only: Scan with --limit 3, no writes.
#
#   ./scripts/aws-samples.sh > docs/migration/samples.json
#
# Dev only — the suffix is hard-coded to the dev backend on purpose.

set -uo pipefail

REGION="${1:-eu-west-2}"
DEV_SUFFIX="e5zkpg67jvezvmxgyuoq2awjty"

TABLES=(
  UserProfile
  Document
  DocumentSummary
  DocumentSection
  Chat
  Message
  ChatCitation
  Space
  SpaceUsers
  Flashcard
  FlashcardDeck
  Question
  Quiz
  QuizQuestion
  MockExam
  CurioSubscription
  Purchase
  Bundle
  Task
  UserRequest
  Metadata
  UserActionLog
  MemoryBlock
  MemoryCandidate
  YoutubeVideo
  ExamModule
  Partnership
  FutureUser
  BatchProcess
  DatalabRequest
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for table in "${TABLES[@]}"; do
  full="${table}-${DEV_SUFFIX}-NONE"
  if aws dynamodb describe-table --region "$REGION" --table-name "$full" >/dev/null 2>&1; then
    aws dynamodb scan --region "$REGION" --table-name "$full" --limit 3 --output json \
      > "$TMP/${table}.json" 2>/dev/null || echo '{"Items":[]}' > "$TMP/${table}.json"
    echo "  $table" >&2
  else
    echo '{"Items":[],"missing":true}' > "$TMP/${table}.json"
    echo "  $table (not present)" >&2
  fi
done

python3 - "$TMP" <<'PY'
import json, os, sys

tmp = sys.argv[1]
tables = sorted(f[:-5] for f in os.listdir(tmp) if f.endswith(".json"))
out = {}
counts = {}
for name in tables:
    with open(os.path.join(tmp, f"{name}.json")) as fh:
        data = json.load(fh)
    out[name] = data.get("Items", [])
    counts[name] = len(out[name])

json.dump(out, sys.stdout, indent=2, default=str)
print("", file=sys.stderr)
print("rows sampled: " + ", ".join(f"{k}={v}" for k, v in counts.items() if v), file=sys.stderr)
PY
