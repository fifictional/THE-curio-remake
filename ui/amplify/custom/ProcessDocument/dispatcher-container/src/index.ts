import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { performDispatch } from './dispatch';
import { SFNClient } from '@aws-sdk/client-sfn';
import { getMixpanel } from '../../common/mixpanel/mixpanel';
import { createServer } from 'http';

const requiredEnv = [
  'AWS_REGION',
  'AWS_BRANCH',
  'ENVIRONMENT',
  'QUEUE_URL',
  'STATE_MACHINE_ARN',
  'LOG_GROUP',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const region = process.env.AWS_REGION!;
const queueUrl = process.env.QUEUE_URL!;
const stateMachineArn = process.env.STATE_MACHINE_ARN!;
const chatLambdaArn = process.env.CHAT_LAMBDA_ARN!;
const mockExamsGenerateQuestionsLambdaArn = process.env.MOCK_EXAMS_GENERATE_QUESTIONS_LAMBDA_ARN!;
const satExtractModulesArn = process.env.SAT_EXTRACT_MODULES_LAMBDA_ARN!;
const satExtractAnswerModulesArn = process.env.SAT_EXTRACT_ANSWER_MODULES_LAMBDA_ARN!;
const satQuestionExtractorArn = process.env.SAT_QUESTION_EXTRACTOR_LAMBDA_ARN!;
const generateQuestionsArn = process.env.GENERATE_QUESTIONS_LAMBDA_ARN!;

const sqs = new SQSClient({ region });
const sfn = new SFNClient({ region: process.env.AWS_REGION! });

// Default config (change by redeploying)
const WORKER_SLOTS = 50; // number of concurrent dispatch slots
const COOLDOWN_MS = 60_000; // 1 minute cooldown after each dispatch

const slotCooldownUntil: number[] = Array.from({ length: WORKER_SLOTS }, () => 0);
const slotTaskInfo: Array<{ taskType: string; taskUuid: string } | null> = Array.from({ length: WORKER_SLOTS }, () => null);

function nowMs(): number {
  return Date.now();
}

function getNextAvailableTime(): number {
  return Math.min(...slotCooldownUntil);
}

function acquireAvailableSlot(): number | null {
  const current = nowMs();
  for (let i = 0; i < slotCooldownUntil.length; i += 1) {
    if (current >= slotCooldownUntil[i]) {
      return i;
    }
  }
  return null;
}

function setSlotCooldown(slotIndex: number, taskType: string, taskUuid: string): void {
  slotCooldownUntil[slotIndex] = nowMs() + COOLDOWN_MS;
  slotTaskInfo[slotIndex] = { taskType, taskUuid };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getSlotsStatus() {
  const now = Date.now();
  const slots = slotCooldownUntil.map((untilMs, index) => {
    const msRemaining = Math.max(0, untilMs - now);
    const active = msRemaining > 0;
    const taskInfo = slotTaskInfo[index];
    return {
      untilMs,
      msRemaining,
      secondsRemaining: Math.ceil(msRemaining / 1000),
      active,
      taskType: active && taskInfo ? taskInfo.taskType : null,
      taskUuid: active && taskInfo ? taskInfo.taskUuid : null,
    };
  });
  const usedCount = slots.filter(s => s.active).length;
  var nextReadyMs = Math.min(...slotCooldownUntil);
  if ( nextReadyMs < now) {
    nextReadyMs = now;
  }
  return {
    workerSlots: WORKER_SLOTS,
    cooldownMs: COOLDOWN_MS,
    usedCount,
    freeCount: WORKER_SLOTS - usedCount,
    nextReadyIso: new Date(nextReadyMs).toISOString(),
    nowIso: new Date(now).toISOString(),
    slots,
  };
}

function renderHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatcher Slots</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 16px; }
    .meta { margin-bottom: 12px; font-size: 1.125rem; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(192px, 1fr)); gap: 8px; }
    .slot { border: 1px solid #ddd; border-radius: 6px; padding: 8px; height: 84px; display: flex; flex-direction: column; justify-content: space-between; }
    .slot.active { background: #ffe8e8; border-color: #f5b5b5; }
    .slot.free { background: #e8ffef; border-color: #b5f5c6; }
    
    /* Top row: slot number (left) and task type/free (right) */
    .row-top { display: flex; justify-content: space-between; align-items: center; }
    .slot-number { font-weight: bold; font-size: 0.75rem; }
    .task-type { font-weight: bold; font-size: 0.625rem; }
    
    /* Middle row: task UUID */
    .row-middle { font-size: 0.5rem; color: #6b7280; word-break: break-all; text-align: center; min-height: 1.5rem; display: flex; align-items: center; justify-content: center; line-height: 1.2; }
    
    /* Bottom row: clock display (only when active) */
    .row-bottom { display: flex; flex-direction: column; gap: 2px; }
    .clock-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .seconds { font-size: 1rem; font-weight: bold; color: #ef4444; min-width: 2ch; text-align: left; }
    .bar { flex: 1; height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .fill { height: 100%; background: #ef4444; width: 0%; transition: width .3s; }
    .clock-bottom { font-size: 0.625rem; color: #6b7280; text-align: center; }
  </style>
  <!-- Simple auto-refresh every 5 minutes as a fallback -->
  <meta http-equiv="refresh" content="300">
  </head>
<body>
  <h1>Dispatcher Slots</h1>
  <div class="meta" id="meta"></div>
  <div class="grid" id="grid"></div>
  <script>
    async function fetchStatus() {
      const res = await fetch('/status');
      return await res.json();
    }
    function render(data) {
      const meta = document.getElementById('meta');
      meta.textContent = 'Used: ' + data.usedCount + '/' + data.workerSlots + ' • Next ready: ' + data.nextReadyIso;

      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      const maxSeconds = Math.ceil(data.cooldownMs / 1000);
      data.slots.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'slot ' + (s.active ? 'active' : 'free');
        const pct = Math.min(100, Math.max(0, (s.secondsRemaining / maxSeconds) * 100));
        
        let content = '';
        
        // Top row: slot number (left) and task type/free (right)
        content += '<div class="row-top">';
        content += '<div class="slot-number">#' + i + '</div>';
        content += '<div class="task-type">' + (s.active && s.taskType ? s.taskType : 'FREE') + '</div>';
        content += '</div>';
        
        // Middle row: task UUID (only if active)
        content += '<div class="row-middle">';
        if (s.active && s.taskUuid) {
          content += s.taskUuid;
        }
        content += '</div>';
        
        // Bottom row: clock display (only if active)
        if (s.active) {
          content += '<div class="row-bottom">';
          content += '<div class="clock-top">';
          content += '<div class="seconds">' + s.secondsRemaining + '</div>';
          content += '<div class="bar"><div class="fill" style="width:' + pct + '%"></div></div>';
          content += '</div>';
          content += '<div class="clock-bottom">until: ' + new Date(s.untilMs).toLocaleTimeString() + '</div>';
          content += '</div>';
        }
        
        div.innerHTML = content;
        grid.appendChild(div);
      });
    }
    async function tick() {
      try { render(await fetchStatus()); } catch (e) { console.error(e); }
    }
    tick(); setInterval(tick, 1000);
  </script>
  </body>
</html>`;
}

function startStatusServer() {
  const port = Number(process.env.STATUS_PORT || 3000);
  const token = process.env.STATUS_TOKEN;
  const server = createServer((req, res) => {
    // Very small router
    const path = (req.url || '/').split('?')[0];

    // Simple bearer token guard if configured
    if (token) {
      const auth = req.headers['authorization'];
      if (!auth || auth !== `Bearer ${token}`) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return;
      }
    }

    if (path === '/status') {
      const body = JSON.stringify(getSlotsStatus());
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(body);
      return;
    }
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(renderHtml());
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Status server listening on http://0.0.0.0:${port}`);
  });
  return server;
}

// Start the status server alongside the dispatcher
startStatusServer();

async function main() {
  console.log('Dispatcher container started');

  const mixpanel = await getMixpanel();
  if (!mixpanel) {
    console.error('Mixpanel not found');
    process.exit(1);
  }

  // Handle SIGTERM to gracefully shutdown
  var quit = false;
  process.on('SIGTERM', () => {
    quit = true;
    console.log('SIGTERM received, exiting');
  });

  while (!quit) {
    // If all slots are on cooldown, throttle until the earliest slot is ready
    const nextReady = getNextAvailableTime();
    const waitMs = nextReady - nowMs();
    if (waitMs > 0) {
      const throttleUntil = new Date(nextReady).toISOString();
      console.log(`throttling till ${throttleUntil}`);
      await sleep(Math.min(waitMs, 60_000));
      continue;
    }

    // Ensure we have a slot; if not (race), throttle briefly
    const slot = acquireAvailableSlot();
    if (slot === null) {
      console.log('no slot available, throttling');
      await sleep(1_000);
      continue;
    }

    const msg = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 30,
    }));

    if (!msg.Messages || msg.Messages.length === 0) {
      continue;
    }

    try {
      const m = msg.Messages[0];
      var messageId = m.MessageId;
      if (!messageId) {
        console.warn('Message ID not found in message');
        messageId = crypto.randomUUID();
      }

      // Get the task uuid from the message body and process for dispatch
      const body = JSON.parse(m.Body ?? '{}');
      const taskUuid = body.taskUuid;
      const taskType = body.taskType;
      if (!taskUuid) {
        console.error('Task UUID not found in message body');
        continue;
      }

      const { retry, errorMessage } = await performDispatch({ sfn, mixpanel }, taskUuid, taskType, stateMachineArn, {
        chatLambdaArn,
        mockExamsGenerateQuestionsLambdaArn,
        satExtractModulesArn,
        satExtractAnswerModulesArn,
        satQuestionExtractorArn,
        generateQuestionsArn,
      }, messageId);
      if (errorMessage) {
        console.error('Failed to dispatch message', errorMessage);
      }
      // if retry is true, don't delete the message
      if (!retry) {
        await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle! }));
        setSlotCooldown(slot, taskType, taskUuid);
      }
    } catch (err) {
      console.error('Failed to dispatch message', err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
