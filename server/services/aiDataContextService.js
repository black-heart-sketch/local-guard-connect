import { Agency } from "../models/Agency.js";
import { AuditLog } from "../models/AuditLog.js";
import { CommunityPost } from "../models/CommunityPost.js";
import { DataSubjectRequest } from "../models/DataSubjectRequest.js";
import { Emergency } from "../models/Emergency.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { Report } from "../models/Report.js";
import { User } from "../models/User.js";
import { emergencyDirectory } from "../config.js";

const RESPONSE_ROLES = new Set(["police", "gendarmerie", "fire", "medical"]);
const MODERATION_ROLES = new Set(["admin", "dispatcher"]);

function date(value) {
  return value ? new Date(value).toISOString() : null;
}

function jurisdictionSummary(value = {}) {
  return Object.fromEntries(["region", "division", "subdivision", "council", "town", "quarter", "village", "landmark"]
    .filter(key => value?.[key])
    .map(key => [key, value[key]]));
}

function reportSummary(report, includePrivate = false) {
  return {
    reference: report.reference,
    category: report.category,
    severity: report.severity,
    status: report.status,
    jurisdiction: jurisdictionSummary(report.jurisdiction),
    ...(includePrivate ? {
      locationDescription: report.addressText,
      latestTimeline: (report.timeline || []).slice(-3).map(item => ({ status: item.status, note: item.note, at: date(item.at) })),
    } : {}),
    createdAt: date(report.createdAt),
    updatedAt: date(report.updatedAt),
  };
}

function emergencySummary(emergency, includePrivate = false) {
  return {
    reference: emergency.reference,
    type: emergency.type,
    status: emergency.status,
    jurisdiction: jurisdictionSummary(emergency.jurisdiction),
    authorityNotified: Boolean(emergency.authorityNotified),
    ...(includePrivate ? {
      trustedContactsNotified: Boolean(emergency.trustedContactsNotified),
      latestEvents: (emergency.events || []).slice(-3).map(item => ({ type: item.type, note: item.note, at: date(item.at) })),
    } : {}),
    createdAt: date(emergency.createdAt),
    updatedAt: date(emergency.updatedAt),
  };
}

function notificationScopes(user) {
  const scopes = [{ type: "general" }, { type: "registered" }, { targetUser: user._id }];
  if (user.jurisdiction?.region) scopes.push({ type: "jurisdiction", "jurisdiction.region": user.jurisdiction.region });
  if (["dispatcher", "police", "gendarmerie", "fire", "medical", "admin"].includes(user.role)) scopes.push({ type: "emergency" });
  return { $or: scopes };
}

function regionalClause(user) {
  return user.jurisdiction?.region ? { "jurisdiction.region": user.jurisdiction.region } : null;
}

async function assignedAgencyIds(user) {
  const clauses = [{ members: user._id }];
  if (["police", "gendarmerie", "fire", "medical", "ngo", "council"].includes(user.role)) {
    clauses.push({ type: user.role, ...(user.jurisdiction?.region ? { "jurisdiction.region": user.jurisdiction.region } : {}) });
  }
  return (await Agency.find({ verified: true, $or: clauses }).distinct("_id"));
}

async function reportFilterFor(user) {
  if (user.role === "admin" || user.role === "dispatcher") return {};
  if (user.role === "citizen") return { reporter: user._id };
  const agencyIds = await assignedAgencyIds(user);
  const assignment = { $or: [{ assignedTo: user._id }, ...(agencyIds.length ? [{ assignedAgency: { $in: agencyIds } }] : [])] };
  const region = regionalClause(user);
  return region ? { $and: [region, assignment] } : assignment;
}

function emergencyFilterFor(user) {
  if (user.role === "admin" || user.role === "dispatcher") return {};
  if (user.role === "citizen") return { user: user._id };
  if (!RESPONSE_ROLES.has(user.role)) return { _id: null };
  const responseScope = { $or: [{ "acknowledgement.responder": user._id }, { type: user.role }] };
  const region = regionalClause(user);
  return region ? { $and: [region, responseScope] } : responseScope;
}

async function publicContext() {
  const [agencies, reports, posts] = await Promise.all([
    Agency.find({ verified: true }).select("name type phones jurisdiction").sort({ name: 1 }).limit(30).lean(),
    Report.find({ publicVisibility: true, status: "resolved", sensitive: false, publicAfter: { $lte: new Date() } })
      .select("reference category severity status jurisdiction createdAt updatedAt").sort({ createdAt: -1 }).limit(20).lean(),
    CommunityPost.find({ moderationStatus: "visible" }).select("title category verificationStatus jurisdiction createdAt").sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return {
    access: { authenticated: false, role: "guest", scope: "public data only" },
    emergencyDirectory,
    verifiedAgencies: agencies.map(item => ({ name: item.name, type: item.type, phones: item.phones, jurisdiction: jurisdictionSummary(item.jurisdiction) })),
    publicResolvedReports: reports.map(item => reportSummary(item, false)),
    visibleCommunityUpdates: posts.map(item => ({ title: item.title, category: item.category, verificationStatus: item.verificationStatus, jurisdiction: jurisdictionSummary(item.jurisdiction), createdAt: date(item.createdAt) })),
  };
}

async function personalContext(user) {
  const [reports, emergencies, payments, privacyRequests, notifications] = await Promise.all([
    Report.find({ reporter: user._id }).select("reference category severity status addressText jurisdiction timeline createdAt updatedAt").sort({ createdAt: -1 }).limit(20).lean(),
    Emergency.find({ user: user._id }).select("reference type status jurisdiction authorityNotified trustedContactsNotified events createdAt updatedAt").sort({ createdAt: -1 }).limit(20).lean(),
    Payment.find({ user: user._id }).select("reference provider amount currency purpose status simulated createdAt updatedAt").sort({ createdAt: -1 }).limit(20).lean(),
    DataSubjectRequest.find({ user: user._id }).select("type status resolution completedAt createdAt updatedAt").sort({ createdAt: -1 }).limit(20).lean(),
    Notification.find(notificationScopes(user)).select("title message type actionUrl expiresAt createdAt readBy").sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return {
    myReports: reports.map(item => reportSummary(item, true)),
    myEmergencies: emergencies.map(item => emergencySummary(item, true)),
    myPayments: payments.map(item => ({ reference: item.reference, provider: item.provider, amount: item.amount, currency: item.currency, purpose: item.purpose, status: item.status, simulated: item.simulated, createdAt: date(item.createdAt) })),
    myPrivacyRequests: privacyRequests.map(item => ({ type: item.type, status: item.status, resolution: item.resolution, completedAt: date(item.completedAt), createdAt: date(item.createdAt) })),
    myNotifications: notifications.map(item => ({ title: item.title?.[user.locale] || item.title?.en, message: item.message?.[user.locale] || item.message?.en, type: item.type, actionUrl: item.actionUrl, read: (item.readBy || []).some(id => String(id) === user.id), createdAt: date(item.createdAt) })),
  };
}

async function operationalContext(user) {
  const [reportFilter, agencies] = await Promise.all([
    reportFilterFor(user),
    Agency.find(user.role === "admin" ? {} : { verified: true }).select("name type verified phones jurisdiction").sort({ name: 1 }).limit(50).lean(),
  ]);
  const emergencyFilter = emergencyFilterFor(user);
  const [reports, emergencies, reportCounts, emergencyCounts] = await Promise.all([
    Report.find(reportFilter).select("reference category severity status addressText jurisdiction timeline createdAt updatedAt").sort({ createdAt: -1 }).limit(30).lean(),
    Emergency.find(emergencyFilter).select("reference type status jurisdiction authorityNotified trustedContactsNotified events createdAt updatedAt").sort({ createdAt: -1 }).limit(30).lean(),
    Report.aggregate([{ $match: reportFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Emergency.aggregate([{ $match: emergencyFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return {
    operationalScope: user.role === "admin" || user.role === "dispatcher" ? "all operational cases" : "assigned reports and role-eligible emergencies within the responder's permitted agency/jurisdiction scope",
    reportCountsByStatus: Object.fromEntries(reportCounts.map(item => [item._id, item.count])),
    emergencyCountsByStatus: Object.fromEntries(emergencyCounts.map(item => [item._id, item.count])),
    recentPermittedReports: reports.map(item => reportSummary(item, true)),
    recentPermittedEmergencies: emergencies.map(item => emergencySummary(item, true)),
    agencies: agencies.map(item => ({ name: item.name, type: item.type, verified: item.verified, phones: item.phones, jurisdiction: jurisdictionSummary(item.jurisdiction) })),
  };
}

async function privilegedContext(user) {
  if (!MODERATION_ROLES.has(user.role)) return {};
  const [moderation, roleCounts, privacyCounts] = await Promise.all([
    CommunityPost.find({ $or: [{ moderationStatus: "flagged" }, { reportsCount: { $gt: 0 } }] }).select("title category verificationStatus moderationStatus reportsCount createdAt").sort({ reportsCount: -1 }).limit(20).lean(),
    User.aggregate([{ $match: { active: true } }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
    user.role === "admin" ? DataSubjectRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]) : [],
  ]);
  const context = {
    activeUsersByRole: Object.fromEntries(roleCounts.map(item => [item._id, item.count])),
    moderationQueue: moderation.map(item => ({ title: item.title, category: item.category, verificationStatus: item.verificationStatus, moderationStatus: item.moderationStatus, reportsCount: item.reportsCount, createdAt: date(item.createdAt) })),
  };
  if (user.role === "admin") {
    const auditActions = await AuditLog.aggregate([{ $group: { _id: "$action", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]);
    context.privacyRequestsByStatus = Object.fromEntries(privacyCounts.map(item => [item._id, item.count]));
    context.auditActions = Object.fromEntries(auditActions.map(item => [item._id, item.count]));
  }
  return context;
}

export async function buildAiDataContext(user) {
  const publicData = await publicContext();
  if (!user?.active) return publicData;

  const base = {
    ...publicData,
    access: {
      authenticated: true,
      role: user.role,
      scope: user.role === "citizen" ? "own records plus public data" : "role, assignment and jurisdiction filtered data",
    },
    currentUser: {
      name: user.fullName || null,
      role: user.role,
      locale: user.locale,
      verified: Boolean(user.verified),
      jurisdiction: jurisdictionSummary(user.jurisdiction),
    },
  };

  if (user.role === "citizen") return { ...base, ...(await personalContext(user)) };
  return { ...base, ...(await operationalContext(user)), ...(await privilegedContext(user)) };
}
