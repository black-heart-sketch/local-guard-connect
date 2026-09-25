import { PushSubscription } from "../models/PushSubscription.js";

export function pushConfig(_req, res) {
  res.json({ enabled: Boolean(process.env.VAPID_PUBLIC_KEY), publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

export async function subscribe(req, res, next) {
  try {
    const { endpoint, expirationTime, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: "Valid browser push subscription required" });
    const item = await PushSubscription.findOneAndUpdate({ endpoint }, { user: req.user._id, endpoint, expirationTime, keys, userAgent: req.headers["user-agent"] }, { upsert: true, returnDocument: "after", runValidators: true });
    res.status(201).json({ subscribed: true, id: item.id });
  } catch (error) { next(error); }
}

export async function unsubscribe(req, res, next) {
  try { await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id }); res.status(204).end(); } catch (error) { next(error); }
}
