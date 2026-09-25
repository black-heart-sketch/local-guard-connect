import { ChannelEvent, DataSubjectRequest, OtpCode, Payment, PushSubscription } from "../models/index.js";

export const id = "004-operational-domains";
export async function up() {
  await Promise.all([ChannelEvent, DataSubjectRequest, OtpCode, Payment, PushSubscription].map(model => model.syncIndexes()));
}
