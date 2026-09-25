import { DigiPay } from "digipay-sdk";
import crypto from "node:crypto";
import { config } from "../config.js";

let client;

function getClient() {
  if (client) return client;
  if (!process.env.DIGIPAY_API_KEY) {
    throw new Error("DigiPay is not configured. Set DIGIPAY_API_KEY.");
  }
  client = new DigiPay({
    apiKey: process.env.DIGIPAY_API_KEY,
    environment: process.env.DIGIPAY_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
    ...(process.env.DIGIPAY_BASE_URL ? { baseUrl: process.env.DIGIPAY_BASE_URL } : {}),
  });
  return client;
}

function developmentResult(type, values = {}) {
  if (config.nodeEnv === "production") return null;
  return { simulated: true, type, ...values };
}

export async function initiatePayin({ amount, customerPhone, customerEmail, reference, webhookUrl, provider }) {
  if (config.nodeEnv === "test" || !process.env.DIGIPAY_API_KEY) {
    const simulated = developmentResult("payin", {
      transactionId: `DEV-${crypto.randomUUID()}`,
      amount,
      baseAmount: amount,
      commissionAmount: 0,
      status: "pending",
      message: "Development payment simulation",
    });
    if (simulated) return simulated;
  }

  const result = await getClient().payments.initiate({
    amount,
    customerPhone,
    customerEmail,
    metadata: { reference, providerHint: provider },
    webhookUrl,
  });
  return { ...result, simulated: false };
}

export async function getTransactionStatus(transactionId) {
  if (transactionId.startsWith("DEV-")) {
    return developmentResult("status", { transactionId, status: "pending" });
  }
  return { ...(await getClient().payments.getStatus(transactionId)), simulated: false };
}

export async function getMerchantBalance() {
  if (config.nodeEnv === "test" || !process.env.DIGIPAY_API_KEY) {
    const simulated = developmentResult("balance", { balance: 0, totalRevenue: 0, totalCommissionPaid: 0 });
    if (simulated) return simulated;
  }
  return { ...(await getClient().settlements.getBalance()), simulated: false };
}

export async function requestMerchantPayout({ amount, recipientPhone }) {
  if (config.nodeEnv === "test" || !process.env.DIGIPAY_API_KEY) {
    const simulated = developmentResult("payout", {
      settlementId: `DEV-SET-${crypto.randomUUID()}`,
      amount,
      recipientPhone,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    if (simulated) return simulated;
  }
  return { ...(await getClient().settlements.requestPayout({ amount, recipientPhone })), simulated: false };
}
