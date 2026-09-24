/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "../dbManager.js";
import { Payment } from "../types.js";

export class PaymentService {
  /**
   * Create Razorpay Order
   */
  async createRazorpayOrder(params: {
    amount: number;
    currency?: string;
    receipt?: string;
  }) {
    const { amount, currency = "INR", receipt } = params;
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || normalizedAmount > 10_000_000) {
      throw { status: 400, message: "Invalid amount specified for Razorpay order." };
    }
    if (currency.toUpperCase() !== 'INR') {
      throw { status: 400, message: "Only INR payments are supported." };
    }

    const key_id = process.env.RAZORPAY_KEY_ID || "";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
    const amountInPaise = Math.round(normalizedAmount * 100);

    if (process.env.NODE_ENV === "production" && (!key_id || !key_secret)) {
      throw { status: 500, message: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the backend." };
    }

    if (key_id && key_secret) {
      try {
        const razorpay = new Razorpay({ key_id, key_secret });
        const rpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: receipt || `rcpt_${Date.now()}`
        });

        return {
          success: true,
          orderId: rpOrder.id,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          keyId: key_id
        };
      } catch (rpErr: any) {
        console.error("Razorpay API order creation error:", rpErr);
        if (process.env.NODE_ENV === "production") {
          throw { status: 502, message: "Unable to create a payment order. Please try again." };
        }
      }
    }

    if (process.env.NODE_ENV === "production") {
      throw { status: 500, message: "Razorpay is not configured on the server." };
    }

    // Fallback sandbox test order
    const simOrderId = `order_rp_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    return {
      success: true,
      orderId: simOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: key_id
    };
  }

  /**
   * Verify Razorpay Payment Signature
   */
  verifyRazorpayPayment(params: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

    if (process.env.NODE_ENV === "production" && !key_secret) {
      throw { status: 500, message: "Razorpay payment verification is not configured on the backend." };
    }

    if (key_secret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
        throw { status: 400, message: "Complete Razorpay payment verification details are required." };
      }
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");

      const expected = Buffer.from(expectedSignature, 'hex');
      const received = Buffer.from(razorpay_signature, 'hex');
      if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) {
        return {
          success: true,
          message: "Razorpay payment verified successfully",
          paymentId: razorpay_payment_id
        };
      } else {
        throw {
          status: 400,
          message: "Razorpay payment signature verification failed"
        };
      }
    }

    if (process.env.NODE_ENV === "production") {
      throw { status: 400, message: "Razorpay payment signature is required." };
    }

    return {
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id || `pay_sim_${Date.now()}`
    };
  }

  /**
   * Get all payments (Admin only)
   */
  getPayments() {
    return db.getPayments();
  }

  /**
   * Update payment status
   */
  updatePayment(paymentId: string, updates: { status?: string; transactionReference?: string }) {
    const payment = db.getPayments().find(p => p.id === paymentId);
    if (!payment) {
      throw { status: 404, message: "Payment record not found." };
    }

    if (updates.status) payment.status = updates.status as Payment['status'];
    if (updates.transactionReference) payment.transactionReference = updates.transactionReference;

    db.savePayment(payment);
    return payment;
  }
}

export const paymentService = new PaymentService();
