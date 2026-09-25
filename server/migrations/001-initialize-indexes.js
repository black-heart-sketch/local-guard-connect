import { Agency, AuditLog, ChannelEvent, CommunityPost, DataSubjectRequest, Emergency, Migration, Notification, OtpCode, Payment, PushSubscription, Report, User } from "../models/index.js";

export const id = "001-initialize-indexes";
export async function up() {
  await Promise.all([User, Report, Notification, CommunityPost, Emergency, Agency, AuditLog, Migration, OtpCode, ChannelEvent, DataSubjectRequest, Payment, PushSubscription].map(model => model.syncIndexes()));
}
