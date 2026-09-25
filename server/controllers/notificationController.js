import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { sendPushToUsers } from "../services/pushService.js";

export async function listNotifications(req, res, next) {
  try {
    const scopes = [{ type: "general" }, { type: "registered" }, { targetUser: req.user._id }];
    if (req.user.jurisdiction?.region) scopes.push({ type: "jurisdiction", "jurisdiction.region": req.user.jurisdiction.region });
    if (["dispatcher", "police", "gendarmerie", "fire", "medical", "admin"].includes(req.user.role)) scopes.push({ type: "emergency" });
    const rows = await Notification.find({ $or: scopes }).sort({ createdAt: -1 }).limit(100);
    res.json(rows.map(n => ({ ...n.toJSON(), title: n.title?.[req.user.locale] || n.title?.en, message: n.message?.[req.user.locale] || n.message?.en, is_read: n.readBy.some(id => String(id) === req.user.id), created_at: n.createdAt, target_user_id: n.targetUser, sender_id: n.sender })));
  } catch (error) { next(error); }
}
export async function createNotification(req, res, next) { try {
  const notification = await Notification.create({ ...req.body, sender: req.user._id });
  let users = [];
  if (notification.targetUser) users = [notification.targetUser];
  else if (notification.type === "registered" || notification.type === "general") users = (await User.find({ active: true }).select("_id")).map(user => user._id);
  else if (notification.type === "jurisdiction" && notification.jurisdiction?.region) users = (await User.find({ active: true, "jurisdiction.region": notification.jurisdiction.region }).select("_id")).map(user => user._id);
  void sendPushToUsers(users, { title: notification.title?.en || "CrimeX", body: notification.message?.en, url: notification.actionUrl || "/dashboard" });
  res.status(201).json(notification);
} catch (error) { next(error); } }
export async function markNotificationRead(req, res, next) { try { res.json(await Notification.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } }, { returnDocument: "after" })); } catch (error) { next(error); } }
export async function deleteNotification(req, res, next) { try { await Notification.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (error) { next(error); } }
