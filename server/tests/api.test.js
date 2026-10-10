import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Report } from "../models/Report.js";
import { attachEmergencyStreamSocket } from "../routes/emergencyRoutes.js";
import { config } from "../config.js";

let mongo;
let app;
let citizenToken;
let citizenId;
let adminToken;
let anonymousReference;
let anonymousRecoveryCode;
let anonymousReportId;
let server;
let serverUrl;

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongo.getUri());
  app = createApp();
  server = http.createServer(app);
  attachEmergencyStreamSocket(server);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  serverUrl = `ws://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("health exposes the MongoDB backend", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.database, "mongodb");
});

test("AI chat validates input and proxies a safe bilingual request to OpenRouter", async () => {
  await request(app).post("/api/ai/chat").send({ messages: [] }).expect(400);

  const originalKey = config.openRouterApiKey;
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  config.openRouterApiKey = "test-openrouter-key";
  globalThis.fetch = async (_url, options) => {
    upstreamRequest = options;
    return new Response(JSON.stringify({
      model: "test/safety-model",
      choices: [{ message: { role: "assistant", content: "Appelez le 117 en cas de danger immédiat." } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const response = await request(app).post("/api/ai/chat").send({
      locale: "fr",
      sessionId: `test-${randomUUID()}`,
      messages: [{ role: "user", content: "Quel numéro dois-je appeler ?" }],
    }).expect(200);
    assert.equal(response.body.model, "test/safety-model");
    assert.match(response.body.reply, /117/);
    const payload = JSON.parse(upstreamRequest.body);
    assert.equal(payload.messages.at(-1).content, "Quel numéro dois-je appeler ?");
    assert.match(payload.messages[0].content, /Police 117/);
    assert.equal(upstreamRequest.headers.Authorization, "Bearer test-openrouter-key");
  } finally {
    config.openRouterApiKey = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("citizen registration, session and profile update", async () => {
  const registered = await request(app).post("/api/auth/register").send({ email: "citizen@example.cm", password: "StrongPass123!", fullName: "Test Citizen", locale: "en" }).expect(201);
  citizenToken = registered.body.token;
  citizenId = registered.body.user.id;
  assert.equal(registered.body.profile.role, "citizen");

  const session = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${citizenToken}`).expect(200);
  assert.equal(session.body.user.email, "citizen@example.cm");

  const updated = await request(app).patch("/api/profile").set("Authorization", `Bearer ${citizenToken}`).send({ phone: "+237699123456", jurisdiction: { region: "Centre", town: "Yaounde", quarter: "Bastos" } }).expect(200);
  assert.equal(updated.body.profile.phone, "+237699123456");

  const admin = await request(app).post("/api/auth/register").send({ email: "admin@example.cm", password: "StrongPass123!", fullName: "Test Administrator", locale: "fr" }).expect(201);
  await User.findByIdAndUpdate(admin.body.user.id, { role: "admin", verified: true });
  adminToken = admin.body.token;
});

test("session reads are not throttled like credential attempts", async () => {
  const responses = await Promise.all(Array.from({ length: 35 }, () => request(app).get("/api/auth/me").set("Authorization", `Bearer ${citizenToken}`)));
  assert.ok(responses.every(response => response.status === 200));
});

test("administrator can update user identity, role and jurisdiction fields", async () => {
  const updated = await request(app).patch(`/api/users/${citizenId}`).set("Authorization", `Bearer ${adminToken}`).send({ fullName: "Updated Citizen", phone: "+237699123457", role: "citizen", jurisdiction: { region: "Centre", division: "Mfoundi", town: "Yaounde" } }).expect(200);
  assert.equal(updated.body.full_name, "Updated Citizen");
  assert.equal(updated.body.phone, "+237699123457");
  assert.equal(updated.body.location.town, "Yaounde");
});

test("AI application context is filtered by the authenticated user's server-side role", async () => {
  const citizen = await User.findById(citizenId);
  const administrator = await User.findOne({ email: "admin@example.cm" });
  const other = await User.create({ email: "other-context@example.cm", passwordHash: "not-used-in-this-test", fullName: "Other Citizen", role: "citizen" });
  const ownReport = await Report.create({ reference: `CTX-OWN-${Date.now()}`, category: "Road safety", description: "Citizen-owned private report", addressText: "Mvan", reporter: citizen._id });
  const otherReport = await Report.create({ reference: `CTX-OTHER-${Date.now()}`, category: "Theft", description: "Another user's private report", addressText: "Bonamoussadi", reporter: other._id });

  const originalKey = config.openRouterApiKey;
  const originalFetch = globalThis.fetch;
  const upstreamPayloads = [];
  config.openRouterApiKey = "test-role-aware-key";
  globalThis.fetch = async (_url, options) => {
    upstreamPayloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ model: "test/role-model", choices: [{ message: { role: "assistant", content: "Authorized summary" } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const input = { locale: "en", sessionId: `role-${randomUUID()}`, messages: [{ role: "user", content: "Show the reports I may access" }] };
    const citizenResponse = await request(app).post("/api/ai/chat").set("Authorization", `Bearer ${citizenToken}`).send(input).expect(200);
    assert.equal(citizenResponse.body.access.role, "citizen");
    const citizenSystem = upstreamPayloads[0].messages[0].content;
    assert.match(citizenSystem, new RegExp(ownReport.reference));
    assert.doesNotMatch(citizenSystem, new RegExp(otherReport.reference));
    assert.doesNotMatch(citizenSystem, /activeUsersByRole/);

    const adminResponse = await request(app).post("/api/ai/chat").set("Authorization", `Bearer ${adminToken}`).send({ ...input, sessionId: `admin-${randomUUID()}` }).expect(200);
    assert.equal(adminResponse.body.access.role, "admin");
    const adminSystem = upstreamPayloads[1].messages[0].content;
    assert.match(adminSystem, new RegExp(ownReport.reference));
    assert.match(adminSystem, new RegExp(otherReport.reference));
    assert.match(adminSystem, /activeUsersByRole/);
    assert.equal(administrator.role, "admin");
  } finally {
    config.openRouterApiKey = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("anonymous report returns a recovery code and hides it from public listings", async () => {
  const created = await request(app).post("/api/reports").field("category", "Mobile Money fraud").field("description", "Fraudulent transfer request").field("addressText", "Mokolo market, Yaounde").field("isAnonymous", "true").field("latitude", "3.8667").field("longitude", "11.5167").expect(201);
  assert.match(created.body.recoveryCode, /^[A-Z0-9_-]+$/i);
  anonymousReference = created.body.report.reference;
  anonymousRecoveryCode = created.body.recoveryCode;
  anonymousReportId = created.body.report.id;
  assert.equal(created.body.report.coordinates.latitude, 3.8667);

  const publicReports = await request(app).get("/api/reports").expect(200);
  assert.equal(publicReports.body.length, 0);

  const recovered = await request(app).get(`/api/reports/${created.body.report.id}`).set("x-recovery-code", created.body.recoveryCode).expect(200);
  assert.equal(recovered.body.reference, created.body.report.reference);
});

test("anonymous report can be tracked by Cameroon reference and recovery code", async () => {
  const tracked = await request(app).get(`/api/reports/track/${anonymousReference}`).set("x-recovery-code", anonymousRecoveryCode).expect(200);
  assert.equal(tracked.body.reference, anonymousReference);
  assert.ok(Array.isArray(tracked.body.timeline));
});

test("guest emergency transfers one continuous recording stream", async () => {
  const sessionId = `test-${randomUUID()}`;
  const created = await request(app).post("/api/emergencies").send({ recordingSessionId: sessionId, type: "medical", latitude: 4.0511, longitude: 9.7679 }).expect(201);
  assert.equal(created.body.authorityNotified, false);
  assert.ok(created.body.recoveryCode);

  const recording = Buffer.from("continuous test recording stream");
  const uploaded = await request(app).post(`/api/emergencies/${sessionId}/stream`).set("x-recovery-code", created.body.recoveryCode).set("content-type", "video/webm").send(recording).expect(200);
  assert.equal(uploaded.body.size, recording.length);
  const downloaded = await request(app).get(`/api/emergencies/${created.body.emergency.id}/recording`).set("x-recovery-code", created.body.recoveryCode).expect(200);
  assert.deepEqual(downloaded.body, recording);
  assert.equal(downloaded.headers["accept-ranges"], "bytes");

  const partial = await request(app).get(`/api/emergencies/${created.body.emergency.id}/recording`).set("x-recovery-code", created.body.recoveryCode).set("Range", "bytes=0-9").expect(206);
  assert.equal(partial.headers["content-range"], `bytes 0-9/${recording.length}`);
  assert.deepEqual(partial.body, recording.subarray(0, 10));
});

test("browser-compatible WebSocket stream saves one emergency recording", async () => {
  const sessionId = `socket-${randomUUID()}`;
  const created = await request(app).post("/api/emergencies").send({ recordingSessionId: sessionId, type: "panic_button", latitude: 3.848, longitude: 11.502 }).expect(201);
  const recording = Buffer.from("continuous websocket recording stream");
  const result = await new Promise((resolve, reject) => {
    const socket = new WebSocket(`${serverUrl}/api/emergencies/${sessionId}/stream-socket`);
    const timer = setTimeout(() => { socket.terminate(); reject(new Error("WebSocket recording timed out")); }, 5000);
    socket.on("open", () => socket.send(JSON.stringify({ type: "authenticate", recoveryCode: created.body.recoveryCode, mimeType: "video/webm" })));
    socket.on("message", data => {
      const message = JSON.parse(data.toString());
      if (message.type === "ready") { socket.send(recording); socket.send(JSON.stringify({ type: "complete" })); }
      if (message.type === "completed") { clearTimeout(timer); resolve(message); }
      if (message.type === "error") { clearTimeout(timer); reject(new Error(message.error)); }
    });
    socket.on("error", reject);
  });
  assert.equal(result.size, recording.length);
  const downloaded = await request(app).get(`/api/emergencies/${created.body.emergency.id}/recording`).set("x-recovery-code", created.body.recoveryCode).expect(200);
  assert.deepEqual(downloaded.body, recording);
});

test("Cameroon phone OTP creates a passwordless session", async () => {
  const requested = await request(app).post("/api/auth/otp/request").send({ phone: "+237677123456" }).expect(201);
  assert.match(requested.body.developmentCode, /^\d{6}$/);
  const verified = await request(app).post("/api/auth/otp/verify").send({ phone: "+237677123456", code: requested.body.developmentCode, fullName: "OTP Citizen" }).expect(200);
  assert.equal(verified.body.user.phone, "+237677123456");
  assert.ok(verified.body.token);
});

test("SMS fallback accepts the documented report format", async () => {
  const response = await request(app).post("/api/channels/sms/inbound").send({ phone: "+237655123456", messageId: `sms-${Date.now()}`, message: "REPORT|Road crash|Mvan junction, Yaounde|Two vehicles involved" }).expect(201);
  assert.equal(response.body.accepted, true);
  assert.match(response.body.reference, /^CMR-/);
});

test("citizen can export data and submit a deletion request", async () => {
  const submitted = await request(app).post("/api/privacy/requests").set("Authorization", `Bearer ${citizenToken}`).send({ type: "deletion", details: "Close my account" }).expect(201);
  assert.equal(submitted.body.status, "submitted");
  const exported = await request(app).get("/api/privacy/export").set("Authorization", `Bearer ${citizenToken}`).expect(200);
  assert.equal(exported.body.profile.email, "citizen@example.cm");
  assert.ok(Array.isArray(exported.body.reports));
});

test("citizen can initiate and refresh an optional DigiPay contribution", async () => {
  const created = await request(app).post("/api/payments").set("Authorization", `Bearer ${citizenToken}`).send({ provider: "mtn", phone: "+237699123456", amount: 1000, purpose: "donation" }).expect(201);
  assert.equal(created.body.gateway, "digipay");
  assert.equal(created.body.status, "pending");
  assert.equal(created.body.simulated, true);
  assert.match(created.body.externalReference, /^DEV-/);

  const refreshed = await request(app).get(`/api/payments/${created.body.reference}/status`).set("Authorization", `Bearer ${citizenToken}`).expect(200);
  assert.equal(refreshed.body.status, "pending");

  await request(app).post("/api/payments").set("Authorization", `Bearer ${citizenToken}`).send({ provider: "orange", phone: "+237699123456", amount: 1000, purpose: "incident_report" }).expect(400);
});

test("admin can verify partners, moderate community information, and access DigiPay settlements", async () => {
  const agency = await request(app).post("/api/agencies").set("Authorization", `Bearer ${adminToken}`).send({ name: "Test Council Safety Desk", type: "council", phones: ["+237222000000"], jurisdiction: { region: "Centre", council: "Yaounde I" } }).expect(201);
  const verified = await request(app).patch(`/api/agencies/${agency.body.id}`).set("Authorization", `Bearer ${adminToken}`).send({ verified: true }).expect(200);
  assert.equal(verified.body.verified, true);
  const assigned = await request(app).patch(`/api/reports/${anonymousReportId}/assign`).set("Authorization", `Bearer ${adminToken}`).send({ agencyId: agency.body.id, note: "Test dispatch" }).expect(200);
  assert.equal(assigned.body.status, "assigned");

  const post = await request(app).post("/api/community/posts").set("Authorization", `Bearer ${citizenToken}`).send({ title: "Road notice", content: "Road blocked near the market", category: "traffic" }).expect(201);
  await request(app).post(`/api/community/posts/${post.body.id}/report`).set("Authorization", `Bearer ${citizenToken}`).send({ reason: "needs_verification" }).expect(200);
  const queue = await request(app).get("/api/community/moderation").set("Authorization", `Bearer ${adminToken}`).expect(200);
  assert.ok(queue.body.some(item => item.id === post.body.id));
  await request(app).patch(`/api/community/posts/${post.body.id}/moderate`).set("Authorization", `Bearer ${adminToken}`).send({ moderationStatus: "visible", verificationStatus: "verified" }).expect(200);

  const balance = await request(app).get("/api/payments/admin/balance").set("Authorization", `Bearer ${adminToken}`).expect(200);
  assert.equal(balance.body.simulated, true);
  const payout = await request(app).post("/api/payments/admin/payouts").set("Authorization", `Bearer ${adminToken}`).send({ amount: 1000, recipientPhone: "+237699123456" }).expect(201);
  assert.match(payout.body.settlementId, /^DEV-SET-/);
});

test("authenticated user can manage a browser push subscription", async () => {
  const endpoint = `https://push.example.test/${Date.now()}`;
  const subscribed = await request(app).post("/api/push/subscriptions").set("Authorization", `Bearer ${citizenToken}`).send({ endpoint, expirationTime: null, keys: { p256dh: "test-public-key", auth: "test-auth-key" } }).expect(201);
  assert.equal(subscribed.body.subscribed, true);
  await request(app).delete("/api/push/subscriptions").set("Authorization", `Bearer ${citizenToken}`).send({ endpoint }).expect(204);
});
