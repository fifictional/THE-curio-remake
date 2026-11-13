/**
 * Visibility timeout heartbeat management for SQS messages
 * Prevents messages from becoming visible again during long-running batch processing
 */

import { SQSClient, ChangeMessageVisibilityCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});

export interface HeartbeatConfig {
  queueUrl: string;
  receiptHandle: string;
  intervalSeconds?: number;      // How often to send heartbeat (default: 30)
  extensionSeconds?: number;     // How much to extend visibility timeout (default: 60)
}

/**
 * Manages heartbeat for a single SQS message
 * Automatically extends visibility timeout at regular intervals
 */
export class HeartbeatManager {
  private intervalId: NodeJS.Timeout | null = null;
  private stopped = false;
  private config: Required<Pick<HeartbeatConfig, 'intervalSeconds' | 'extensionSeconds'>> & Pick<HeartbeatConfig, 'queueUrl' | 'receiptHandle'>;

  constructor(config: HeartbeatConfig) {
    this.config = {
      intervalSeconds: config.intervalSeconds ?? 30,
      extensionSeconds: config.extensionSeconds ?? 60,
      queueUrl: config.queueUrl,
      receiptHandle: config.receiptHandle,
    };
  }

  /**
   * Start the heartbeat
   */
  start(): void {
    if (this.intervalId) {
      return; // Already started
    }

    // Send initial heartbeat immediately
    this.sendHeartbeat();

    // Then send at regular intervals
    this.intervalId = setInterval(() => {
      if (!this.stopped) {
        this.sendHeartbeat();
      }
    }, this.config.intervalSeconds * 1000);
  }

  /**
   * Stop the heartbeat
   */
  stop(): void {
    this.stopped = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Send a heartbeat to extend visibility timeout
   * 
   * Note: ChangeMessageVisibility sets an absolute timeout from NOW, not an extension.
   * The queue visibility timeout is 5 minutes, and we heartbeat every 30 seconds.
   * By setting the timeout to 5 minutes on each heartbeat, we ensure we're always
   * extending (never reducing) and maintain at least 4.5 minutes of buffer.
   * This provides quick redrive on error (5 min max wait) while maintaining safety.
   * Maximum allowed is 12 hours (43200 seconds).
   */
  private async sendHeartbeat(): Promise<void> {
    // Don't send heartbeat if stopped (prevents race condition)
    if (this.stopped) {
      return;
    }

    try {
      // Set visibility timeout to 5 minutes (300 seconds) - matches queue default.
      // Since we heartbeat every 30 seconds, we'll always have at least 4.5 minutes
      // remaining, providing ample safety margin while allowing quick redrive on error.
      const visibilityTimeoutSeconds = 5 * 60; // 5 minutes
      
      await sqsClient.send(new ChangeMessageVisibilityCommand({
        QueueUrl: this.config.queueUrl,
        ReceiptHandle: this.config.receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      }));
    } catch (error: any) {
      // Log all heartbeat errors - they indicate real problems that can cause message requeuing
      // If heartbeat fails, the message will become visible again after timeout expires,
      // causing the entire batch to be reprocessed
      process.stderr.write(`[Heartbeat] Failed to extend visibility timeout: ${error}\n`);
    }
  }
}

