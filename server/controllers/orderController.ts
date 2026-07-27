/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { db } from "../dbManager.js";
import { Order, Payment } from "../types.js";
import { AuthenticatedRequest, ADMIN_EMAILS } from "../middleware/authMiddleware.js";

/**
 * Get orders:
 * Returns ALL orders if authenticated user is an Admin.
 * Returns ONLY the particular user's orders if authenticated user is a regular customer.
 */
export const getOrders = (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required to view orders." });
  }

  const isUserAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.role === 'admin';

  if (isUserAdmin) {
    return res.json(db.getOrders());
  }

  // Particular customer: Fetch and return ONLY that user's orders
  const userOrders = db.getOrdersByUser(user.email);
  return res.json(userOrders);
};

/**
 * Get user orders by email parameter:
 * Enforces privacy so users can only access their own order history unless they are an admin.
 */
export const getOrdersByUser = (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required to view user orders." });
  }

  const requestedEmail = req.params.email;
  const isUserAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.role === 'admin';
  const isSelf = user.email.toLowerCase() === requestedEmail.toLowerCase();

  if (!isUserAdmin && !isSelf) {
    // If not admin and requesting another user's email, safely restrict to the logged-in user's orders
    return res.json(db.getOrdersByUser(user.email));
  }

  return res.json(db.getOrdersByUser(requestedEmail));
};

// Place new order
export const placeOrder = (req: AuthenticatedRequest, res: Response) => {
  const { userEmail, userName, shippingAddress, items, subtotal, tax, shippingCharge, discount, finalTotal, paymentMethod } = req.body;
  
  // Prefer email from authenticated token if available
  const emailToUse = (req.user?.email || userEmail || "").toLowerCase();

  if (!emailToUse || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order details. User email and cart items are required." });
  }

  // Create order
  const newOrder: Order = {
    id: `GL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`,
    userEmail: emailToUse,
    userName: userName || req.user?.fullName || "Valued Customer",
    shippingAddress,
    items,
    subtotal: Number(subtotal),
    tax: Number(tax),
    shippingCharge: Number(shippingCharge),
    discount: Number(discount),
    finalTotal: Number(finalTotal),
    status: "Pending",
    paymentMethod,
    paymentStatus: paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
    orderDate: new Date().toISOString(),
    trackingNumber: `GLTRK${Math.floor(100000 + Math.random() * 900000)}`,
    trackingUpdates: [
      {
        status: "Pending",
        date: new Date().toISOString(),
        comment: "Your organic wellbeing order has been received and is waiting for validation."
      }
    ]
  };

  // Adjust product stocks
  items.forEach((item: any) => {
    const prod = db.getProductById(item.productId);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
      db.saveProduct(prod);
    }
  });

  db.saveOrder(newOrder);

  // Automatically save shipping address to user's saved addresses in DB or auto-create user if missing
  let existingUser = db.getUserByEmail(emailToUse);
  if (existingUser) {
    const hasAddress = existingUser.addresses?.some(
      a => a.addressLine1 === shippingAddress?.addressLine1 && a.zipCode === shippingAddress?.zipCode
    );
    if (!hasAddress && shippingAddress) {
      existingUser.addresses = [...(existingUser.addresses || []), shippingAddress];
      db.saveUser(existingUser);
    }
  }

  // Create corresponding payment audit log
  const newPayment: Payment = {
    id: `PAY-${Date.now().toString().slice(-6)}`,
    orderId: newOrder.id,
    userEmail: emailToUse,
    amount: newOrder.finalTotal,
    paymentMethod,
    transactionReference: paymentMethod === "Cash on Delivery" ? "COD_PENDING" : `TXN_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    status: paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
    createdAt: new Date().toISOString()
  };
  db.savePayment(newPayment);

  db.logActivity(emailToUse, "Order Placed", `Placed order #${newOrder.id} for amount ₹${newOrder.finalTotal}`);

  return res.json({ message: "Order placed successfully!", order: newOrder });
};

// Update order status (Admin only)
export const updateOrder = (req: AuthenticatedRequest, res: Response) => {
  const orderId = req.params.id;
  const { status, trackingNumber, comment, paymentStatus } = req.body;

  const order = db.getOrderById(orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  if (status) order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;

  if (status || comment) {
    const updateObj = {
      status: status || order.status,
      date: new Date().toISOString(),
      comment: comment || `Order status updated to ${status}`
    };
    order.trackingUpdates = [...(order.trackingUpdates || []), updateObj];
  }

  db.saveOrder(order);
  db.logActivity(req.user?.email || "admin@gramslife.com", "Order Update", `Updated order #${orderId} status to ${status}`);

  return res.json({ message: "Order updated successfully.", order });
};

// Get payment transactions (Admin only)
export const getPayments = (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getPayments());
};

// Update payment status (Admin only)
export const updatePayment = (req: AuthenticatedRequest, res: Response) => {
  const paymentId = req.params.id;
  const { status, transactionReference } = req.body;

  const payment = db.getPayments().find(p => p.id === paymentId);
  if (!payment) {
    return res.status(404).json({ error: "Payment record not found." });
  }

  if (status) payment.status = status;
  if (transactionReference) payment.transactionReference = transactionReference;

  db.savePayment(payment);
  return res.json({ message: "Payment updated successfully.", payment });
};

// Track order by Order ID, Tracking Number, Email, or Mobile Number (Public access)
export const trackOrder = (req: Request, res: Response) => {
  const rawIdentifier = req.params.identifier;
  if (!rawIdentifier) {
    return res.status(400).json({ error: "Please provide an Order ID, Tracking Number, Email, or Phone Number." });
  }

  const identifier = rawIdentifier.trim();
  const lowerId = identifier.toLowerCase();
  const cleanId = lowerId.replace(/[^a-z0-9]/g, '');
  const cleanPhone = lowerId.replace(/\D/g, '');
  const allOrders = db.getOrders();

  // Search by Order ID, Tracking Number, Email, or Phone Number
  let matchingOrders = allOrders.filter(o => {
    const oId = (o.id || "").toLowerCase();
    const oIdClean = oId.replace(/[^a-z0-9]/g, '');
    const oTrk = (o.trackingNumber || "").toLowerCase();
    const oTrkClean = oTrk.replace(/[^a-z0-9]/g, '');
    const oEmail = (o.userEmail || "").toLowerCase();
    const oPhone = o.shippingAddress?.phone ? o.shippingAddress.phone.replace(/\D/g, '') : '';

    const exactIdMatch = oId === lowerId || oTrk === lowerId;
    const cleanIdMatch = cleanId.length >= 4 && (oIdClean.includes(cleanId) || oTrkClean.includes(cleanId));
    const emailMatch = oEmail === lowerId;
    const phoneMatch = cleanPhone.length >= 10 && oPhone.endsWith(cleanPhone.slice(-10));

    return exactIdMatch || cleanIdMatch || emailMatch || phoneMatch;
  });

  if (matchingOrders.length === 0) {
    return res.status(404).json({ error: "No order found matching this Order ID, Tracking Number, Email, or Phone Number." });
  }

  // Sort matching orders by date descending (latest order first)
  matchingOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  // Pick the latest/primary matched order
  const primaryOrder = matchingOrders[0];

  // Fetch ALL orders for the user associated with this primary order (both previous and latest orders)
  const userEmail = (primaryOrder.userEmail || "").toLowerCase();
  const userPhone = primaryOrder.shippingAddress?.phone ? primaryOrder.shippingAddress.phone.replace(/\D/g, '') : '';

  const userOrders = allOrders.filter(o => {
    const oEmail = (o.userEmail || "").toLowerCase();
    const oPhone = o.shippingAddress?.phone ? o.shippingAddress.phone.replace(/\D/g, '') : '';
    const emailMatch = !!(userEmail && oEmail === userEmail);
    const phoneMatch = !!(userPhone && userPhone.length >= 10 && oPhone.endsWith(userPhone.slice(-10)));
    return emailMatch || phoneMatch;
  }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const finalUserOrdersList = userOrders.length > 0 ? userOrders : matchingOrders;

  return res.json({
    order: primaryOrder,
    userOrders: finalUserOrdersList,
    // Spread all properties of primaryOrder at root level for backward compatibility
    ...primaryOrder
  });
};
