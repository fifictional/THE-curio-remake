# Fix Question Concepts Lambda

This Lambda function fixes existing `ExtractedQuestion` records by matching them to the correct SAT concepts from the `TopicSubtopicConcept` table using GPT-4o.

## What It Does

1. Fetches all SAT concepts from the database (filtered by `tag` containing "SAT")
2. Fetches all `ExtractedQuestion` records
3. For each question:
   - Checks if the concept is already valid (matches database)
   - If not, uses GPT-4o to match the question to the correct concept
   - Updates the question with the correct `topic`, `subtopic`, and `concept`
4. Returns statistics on success/failure

## How to Run

### Option 1: Via Dispatcher (Recommended)

The easiest way is to trigger it through the dispatcher service:

```bash
# Dry run (preview changes without updating)
curl -X POST https://your-dispatcher-url/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "fix-question-concepts",
    "payload": {
      "arguments": {
        "dryRun": true
      }
    }
  }'

# Actual run (will update the database)
curl -X POST https://your-dispatcher-url/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "fix-question-concepts",
    "payload": {
      "arguments": {
        "dryRun": false
      }
    }
  }'
```

### Option 2: Via AWS Console

1. Go to AWS Lambda Console
2. Find the `fix-question-concepts` function
3. Click "Test"
4. Create a new test event:

**Dry Run Test:**
```json
{
  "arguments": {
    "dryRun": true
  }
}
```

**Actual Run Test:**
```json
{
  "arguments": {
    "dryRun": false
  }
}
```

5. Click "Test" to execute

### Option 3: Via AWS CLI

```bash
# Dry run
aws lambda invoke \
  --function-name fix-question-concepts-BRANCH-ENV \
  --payload '{"arguments":{"dryRun":true}}' \
  response.json

# Actual run
aws lambda invoke \
  --function-name fix-question-concepts-BRANCH-ENV \
  --payload '{"arguments":{"dryRun":false}}' \
  response.json
```

## Parameters

- `dryRun` (boolean, optional, default: `false`): If `true`, the Lambda will match concepts but NOT update the database. Use this to preview changes.

## Output

The Lambda returns a JSON object with:

```json
{
  "success": true,
  "message": "Processed 120 questions",
  "stats": {
    "total": 120,
    "updated": 95,
    "skipped": 20,
    "failed": 5
  },
  "dryRun": false
}
```

## Logs

Check CloudWatch Logs for detailed progress:
- Each question shows current concept and matched concept
- Reasoning for each match
- Summary statistics at the end

Example log output:
```
[1/120] Processing question abc-123
  Current: Unit conversion yards to miles
  Content: A runner completes a 440-yard dash. How many miles is this?...
  ✓ Matched to: Units & Rates (Question tests unit conversion)
  ✅ Updated successfully
```

## Configuration

- **Timeout**: 15 minutes (900 seconds) - enough to process hundreds of questions
- **Memory**: 512 MB
- **Rate Limiting**: 1 second delay between GPT requests to avoid rate limits
- **OpenAI Model**: GPT-4o with JSON mode

## Cost Considerations

- **AI API**: ~$0.002 per question (GPT-4o)
- **Lambda**: Minimal (execution time + memory)
- **Database**: Minimal (read/write operations)

For 100 questions: ~$0.20 total

## Prerequisites

1. **SAT Concepts**: Ensure you've added default SAT topics in the admin panel (`/admin/topics`)
2. **OpenAI API Key**: Must be stored in AWS Secrets Manager as `openai/api-key`

## Safety Features

- ✅ **Dry run mode**: Preview changes before applying
- ✅ **Skips valid concepts**: Won't update questions that already have correct concepts
- ✅ **Validates AI output**: Ensures GPT returns concepts from the allowed list
- ✅ **Preserves other fields**: Only updates topic, subtopic, and concept
- ✅ **Error handling**: Continues processing even if individual questions fail

## Troubleshooting

### "No SAT concepts found"
- Ensure you've added default topics in `/admin/topics`
- Check that concepts have `tag: "SAT"` set

### High failure rate
- Check CloudWatch logs for specific errors
- Verify OpenAI API key is valid
- Check if question content is readable

### Timeout
- The Lambda has a 15-minute timeout
- If you have thousands of questions, consider running in batches
- You can modify the Lambda to process a subset of questions

## Monitoring

Monitor the Lambda execution in:
- **CloudWatch Logs**: Detailed progress and errors
- **CloudWatch Metrics**: Invocation count, duration, errors
- **Lambda Console**: Recent executions and status

