import { config } from "../config.js";

export async function sendSms({ to, message }) {
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const token = process.env.SMS_GATEWAY_TOKEN;
  if (!gatewayUrl || !token) {
    if (config.nodeEnv !== "production") console.info(`[SMS development outbox] ${to}: ${message}`);
    return { delivered: false, provider: "development-outbox", reason: "SMS gateway not configured" };
  }
  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, message, sender: process.env.SMS_SENDER_ID || "CrimeX" }),
  });
  if (!response.ok) throw new Error(`SMS gateway returned ${response.status}`);
  return { delivered: true, provider: "configured-gateway", response: await response.json().catch(() => ({})) };
}
