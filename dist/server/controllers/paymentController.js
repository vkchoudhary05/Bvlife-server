/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { paymentService } from "../services/paymentService.js";
/**
 * Create a new Razorpay order
 */
export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency, receipt, key_id } = req.body;
        const result = await paymentService.createRazorpayOrder({
            amount,
            currency,
            receipt,
            customKeyId: key_id
        });
        res.json(result);
    }
    catch (err) {
        console.error("Razorpay order creation error:", err);
        res.status(err.status || 500).json({ error: err.message || "Failed to create Razorpay order" });
    }
};
/**
 * Verify Razorpay payment signature
 */
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const result = paymentService.verifyRazorpayPayment(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 400).json({ success: false, error: err.message });
    }
};
/**
 * Get all payment records (Admin only)
 */
export const getPayments = (req, res) => {
    try {
        const payments = paymentService.getPayments();
        res.json(payments);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch payments." });
    }
};
/**
 * Update a payment record
 */
export const updatePayment = (req, res) => {
    try {
        const payment = paymentService.updatePayment(req.params.id, req.body);
        res.json({ message: "Payment status updated.", payment });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update payment." });
    }
};
