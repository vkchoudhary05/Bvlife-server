/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Router } from "express";
import { getOrders, getOrdersByUser, placeOrder, updateOrder, trackOrder } from "../controllers/orderController.js";
import { getPayments, updatePayment, createRazorpayOrder, verifyRazorpayPayment } from "../controllers/paymentController.js";
import { authenticateToken, requireAdmin, optionalAuthenticateToken } from "../middleware/authMiddleware.js";
import { validateOrder } from "../middleware/validationMiddleware.js";
import { rateLimiter } from "../middleware/rateLimitMiddleware.js";
export const orderRouter = Router();
// Order Endpoints
orderRouter.get("/api/orders", authenticateToken, getOrders);
orderRouter.get("/api/orders/user/:email", authenticateToken, getOrdersByUser);
orderRouter.get("/api/orders/track/:identifier", rateLimiter(20), optionalAuthenticateToken, trackOrder);
orderRouter.post("/api/orders", rateLimiter(10), optionalAuthenticateToken, validateOrder, placeOrder);
orderRouter.put("/api/orders/:id", authenticateToken, requireAdmin, updateOrder);
// Razorpay Payment Integration Endpoints
orderRouter.post("/api/payment/razorpay-order", rateLimiter(20), createRazorpayOrder);
orderRouter.post("/api/payment/verify-razorpay", rateLimiter(30), verifyRazorpayPayment);
// Payments (Admin only)
orderRouter.get("/api/payments", authenticateToken, requireAdmin, getPayments);
orderRouter.put("/api/payments/:id", authenticateToken, requireAdmin, updatePayment);
