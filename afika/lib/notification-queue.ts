/**
 * Pure helpers for the device-local push-notification queue.
 *
 * The app only *enqueues* `pending` notifications; a REST delivery endpoint
 * does not exist yet, so the queue is persisted with `lib/local-store`. Kept
 * dependency-free so it can run in the node test runner.
 */

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type QueuedPushNotificationStatus = "pending";

export type QueuedPushNotification = {
  walletAddress: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: QueuedPushNotificationStatus;
  attempts: number;
  createdAt: number;
  createdAtMs: number;
};

/**
 * Builds a queued push notification. The wallet address is lowercased so queue
 * entries match the wallet identity used everywhere else.
 */
export function buildQueuedPushNotification(
  walletAddress: string,
  payload: PushNotificationPayload,
  createdAtMs: number,
): QueuedPushNotification {
  return {
    walletAddress: walletAddress.trim().toLowerCase(),
    title: payload.title,
    body: payload.body,
    data: payload.data ? { ...payload.data } : {},
    status: "pending",
    attempts: 0,
    createdAt: createdAtMs,
    createdAtMs,
  };
}

/** Returns true when the notification has enough content to deliver. */
export function isDeliverablePushNotification(
  payload: PushNotificationPayload,
): boolean {
  return Boolean(payload.title?.trim() || payload.body?.trim());
}
