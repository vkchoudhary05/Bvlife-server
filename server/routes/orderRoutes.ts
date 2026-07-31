/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { 
  getOrders, 
  getOrdersByUser, 
  placeOrder, 
  updateOrder, 
  getPayments, 
  updatePayment,
  trackOrder,
  createRazorpayOrder,
  verifyRazorpayPayment
} from "../controllers/orderController.js";
import { authenticateToken, requireAdmin, optionalAuthenticateToken } from "../middleware/authMiddleware.js";
import { validateOrder } from "../middleware/validationMiddleware.js";

export const orderRouter = Router();

// Order Endpoints
orderRouter.get("/api/orders", authenticateToken, getOrders);
orderRouter.get("/api/orders/user/:email", authenticateToken, getOrdersByUser);
orderRouter.get("/api/orders/track/:identifier", trackOrder);
orderRouter.post("/api/orders", optionalAuthenticateToken, validateOrder, placeOrder);
orderRouter.put("/api/orders/:id", authenticateToken, requireAdmin, updateOrder);

// Razorpay Payment Integration Endpoints
orderRouter.post("/api/payment/razorpay-order", createRazorpayOrder);
orderRouter.post("/api/payment/verify-razorpay", verifyRazorpayPayment);

// Payments (Admin only)
orderRouter.get("/api/payments", authenticateToken, requireAdmin, getPayments);
orderRouter.put("/api/payments/:id", authenticateToken, requireAdmin, updatePayment);
