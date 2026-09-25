import webpush from "web-push";
import { PushSubscription } from "../models/PushSubscription.js";

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

if (configured()) webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

export async function sendPushToUsers(userIds, payload) {
  if (!configured() || !userIds?.length) return { sent: 0, configured: configured() };
  const subscriptions = await PushSubscription.find({ user: { $in: userIds } });
  let sent = 0;
  await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, expirationTime: subscription.expirationTime, keys: subscription.keys }, JSON.stringify(payload), { TTL: 300 });
      sent += 1;
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) await subscription.deleteOne();
    }
  }));
  return { sent, configured: true };
}
