import { Payment } from "../models/Payment.js";
import { getMerchantBalance, getTransactionStatus, initiatePayin, requestMerchantPayout } from "../services/digiPayService.js";
import { audit, reference } from "../lib/utils.js";

function normalizeCameroonPhone(phone) {
  return String(phone || "").replace(/[\s()-]/g, "").replace(/^\+/, "");
}

function isCameroonMobile(phone) {
  return /^2376\d{8}$/.test(phone);
}

export async function createPayment(req, res, next) {
  try {
    const { provider, phone, amount, purpose } = req.body;
    const customerPhone = normalizeCameroonPhone(phone);
    if (!isCameroonMobile(customerPhone)) return res.status(400).json({ error: "Valid Cameroon mobile number required" });
    if (!Number.isFinite(Number(amount)) || Number(amount) < 100) return res.status(400).json({ error: "Amount must be at least 100 XAF" });
    if (!['mtn', 'orange'].includes(provider)) return res.status(400).json({ error: "Provider must be MTN or Orange" });
    if (!["donation", "organization_subscription"].includes(purpose)) return res.status(400).json({ error: "Payments cannot be required for incident reports" });
    const payment = await Payment.create({ reference: reference("PAY"), user: req.user._id, provider, phone: `+${customerPhone}`, amount: Number(amount), purpose, customerEmail: req.user.email });
    const result = await initiatePayin({
      provider,
      amount: payment.amount,
      customerPhone,
      customerEmail: req.user.email,
      reference: payment.reference,
      webhookUrl: `${process.env.PUBLIC_API_URL || ""}/api/payments/webhook`,
    });
    payment.externalReference = result.transactionId;
    payment.status = result.status;
    payment.simulated = result.simulated;
    payment.baseAmount = result.baseAmount;
    payment.chargedAmount = result.amount;
    payment.commissionAmount = result.commissionAmount;
    payment.gatewayMessage = result.message;
    await payment.save();
    await audit(req, "payment.create", "Payment", payment.id, { provider, amount, purpose });
    res.status(201).json(payment);
  } catch (error) { next(error); }
}

export async function refreshPaymentStatus(req, res, next) {
  try {
    const filter = { reference: req.params.reference, ...(req.user.role === "admin" ? {} : { user: req.user._id }) };
    const payment = await Payment.findOne(filter);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (!payment.externalReference) return res.status(409).json({ error: "Payment has no DigiPay transaction ID" });
    const result = await getTransactionStatus(payment.externalReference);
    payment.status = result.status;
    payment.baseAmount = result.baseAmount ?? payment.baseAmount;
    payment.chargedAmount = result.totalAmount ?? payment.chargedAmount;
    payment.commissionAmount = result.commissionAmount ?? payment.commissionAmount;
    await payment.save();
    res.json(payment);
  } catch (error) { next(error); }
}

export async function merchantBalance(_req, res, next) {
  try { res.json(await getMerchantBalance()); } catch (error) { next(error); }
}

export async function createPayout(req, res, next) {
  try {
    const recipientPhone = normalizeCameroonPhone(req.body.recipientPhone);
    const amount = Number(req.body.amount);
    if (!isCameroonMobile(recipientPhone)) return res.status(400).json({ error: "Valid Cameroon recipient number required" });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "A positive payout amount is required" });
    const payout = await requestMerchantPayout({ amount, recipientPhone });
    await audit(req, "payment.payout", "DigiPaySettlement", payout.settlementId, { amount, recipientPhone });
    res.status(201).json(payout);
  } catch (error) { next(error); }
}

export async function paymentWebhook(req, res, next) {
  try {
    if (!process.env.PAYMENT_WEBHOOK_SECRET || req.headers["x-webhook-secret"] !== process.env.PAYMENT_WEBHOOK_SECRET) return res.status(401).json({ error: "Invalid webhook signature" });
    const transactionId = req.body.transactionId || req.body.externalReference;
    const payment = await Payment.findOneAndUpdate({ externalReference: transactionId }, { status: req.body.status }, { returnDocument: "after", runValidators: true });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ received: true });
  } catch (error) { next(error); }
}
export async function listPayments(req, res, next) { try { res.json(await Payment.find(req.user.role === "admin" ? {} : { user: req.user._id }).sort({ createdAt: -1 })); } catch (error) { next(error); } }
