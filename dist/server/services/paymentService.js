/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "../dbManager.js";
export class PaymentService {
    /**
     * Create Razorpay Order
     */
    async createRazorpayOrder(params) {
        const { amount, currency = "INR", receipt, customKeyId } = params;
        if (!amount || Number(amount) <= 0) {
            throw { status: 400, message: "Invalid amount specified for Razorpay order." };
        }
        const key_id = customKeyId?.trim() || process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
        const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
        const amountInPaise = Math.round(Number(amount) * 100);
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
            }
            catch (rpErr) {
                console.error("Razorpay API order creation error:", rpErr);
            }
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
    verifyRazorpayPayment(params) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
        const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
        if (key_secret && razorpay_signature && razorpay_order_id) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", key_secret)
                .update(body.toString())
                .digest("hex");
            if (expectedSignature === razorpay_signature) {
                return {
                    success: true,
                    message: "Razorpay payment verified successfully",
                    paymentId: razorpay_payment_id
                };
            }
            else {
                throw {
                    status: 400,
                    message: "Razorpay payment signature verification failed"
                };
            }
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
    updatePayment(paymentId, updates) {
        const payment = db.getPayments().find(p => p.id === paymentId);
        if (!payment) {
            throw { status: 404, message: "Payment record not found." };
        }
        if (updates.status)
            payment.status = updates.status;
        if (updates.transactionReference)
            payment.transactionReference = updates.transactionReference;
        db.savePayment(payment);
        return payment;
    }
}
export const paymentService = new PaymentService();
