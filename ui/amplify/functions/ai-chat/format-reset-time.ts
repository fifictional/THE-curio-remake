/**
 * Format the time remaining until the user's free-message rate limit resets.
 *
 * Returns a relative duration string ("in N minutes", "in about H hour(s) and
 * M minute(s)", ...). Avoids absolute clock times so the message cannot be
 * misread across timezones or go stale after being persisted into
 * `Message.content`. See EOPRD-838.
 */
export function formatResetTime(
  resetAt: string | null,
  now: Date = new Date()
): string {
  if (!resetAt) return 'soon';

  const resetTime = new Date(resetAt);
  const diffMs = resetTime.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes <= 0) return 'shortly';
  if (diffMinutes === 1) return 'in 1 minute';
  if (diffMinutes < 60) return `in ${diffMinutes} minutes`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  if (minutes === 0) return `in about ${hourLabel}`;

  const minuteLabel = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return `in about ${hourLabel} and ${minuteLabel}`;
}
