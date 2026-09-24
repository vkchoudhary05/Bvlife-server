/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { paymentService } from "../services/paymentService.js";

/**
 * Create a new Razorpay order
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency, receipt } = req.body;
    const result = await paymentService.createRazorpayOrder({
      amount,
      currency,
      receipt
    });
    res.json(result);
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to create Razorpay order" });
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const result = paymentService.verifyRazorpayPayment(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

/**
 * Get all payment records (Admin only)
 */
export const getPayments = (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = paymentService.getPayments();
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch payments." });
  }
};

/**
 * Update a payment record
 */
export const updatePayment = (req: AuthenticatedRequest, res: Response) => {
  try {
    const payment = paymentService.updatePayment(req.params.id, req.body);
    res.json({ message: "Payment status updated.", payment });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update payment." });
  }
};
