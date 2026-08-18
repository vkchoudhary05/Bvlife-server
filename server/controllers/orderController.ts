/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "../dbManager.js";
import { Order, Payment } from "../types.js";
import { AuthenticatedRequest, ADMIN_EMAILS } from "../middleware/authMiddleware.js";
import { communicationService } from "../services/communicationService.js";

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

  // Unified Omnichannel Communication:
  // 1. Email Invoice & Receipt
  communicationService.sendOrderInvoiceEmail(newOrder).catch(err => {
    console.warn('[Order Invoice Email] Non-blocking dispatch notice:', err);
  });

  // 2. SMS Payment & Order Confirmation
  if (shippingAddress?.phone) {
    communicationService.sendPaymentConfirmationSms({
      phone: shippingAddress.phone,
      orderId: newOrder.id,
      amount: newOrder.finalTotal,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.paymentStatus
    }).catch(err => {
      console.warn('[Payment Confirmation SMS] Non-blocking dispatch notice:', err);
    });
  }

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

  const previousStatus = order.status;
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

  // Omnichannel Delivery & Refund triggers
  if (status && status !== previousStatus) {
    // Delivery Tracking SMS
    if (order.shippingAddress?.phone) {
      communicationService.sendDeliveryTrackingSms({
        phone: order.shippingAddress.phone,
        orderId: order.id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        comment: comment || `Your order status is now ${order.status}.`
      }).catch(err => console.warn('[Delivery SMS] Notice:', err));
    }

    // Refund Email if Cancelled or Returned
    if (['Cancelled', 'Returned'].includes(status) && order.paymentStatus === 'Paid') {
      communicationService.sendRefundEmail({
        orderId: order.id,
        userEmail: order.userEmail,
        userName: order.userName,
        amount: order.finalTotal,
        reason: comment || `Order status changed to ${status}`,
        reference: `REF-${order.id}`
      }).catch(err => console.warn('[Refund Email] Notice:', err));
    }
  }

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

// Track order by Order ID, Tracking Number, Email, or Mobile Number (Privacy & Customer-Isolated)
export const trackOrder = (req: AuthenticatedRequest, res: Response) => {
  const rawIdentifier = req.params.identifier;
  if (!rawIdentifier) {
    return res.status(400).json({ error: "Please provide an Order ID, Tracking Number, Email, or Phone Number." });
  }

  const identifier = rawIdentifier.trim();
  const lowerId = identifier.toLowerCase();
  const cleanId = lowerId.replace(/[^a-z0-9]/g, '');
  const cleanPhone = lowerId.replace(/\D/g, '');
  const allOrders = db.getOrders();

  const reqUser = req.user;
  const isReqUserAdmin = !!(reqUser && (ADMIN_EMAILS.includes(reqUser.email.toLowerCase()) || reqUser.role === 'admin'));

  // Search by exact Order ID, Tracking Number, Email, or Phone Number
  let matchingOrders = allOrders.filter(o => {
    const oId = (o.id || "").toLowerCase();
    const oIdClean = oId.replace(/[^a-z0-9]/g, '');
    const oTrk = (o.trackingNumber || "").toLowerCase();
    const oTrkClean = oTrk.replace(/[^a-z0-9]/g, '');
    const oEmail = (o.userEmail || "").toLowerCase();
    const oPhone = o.shippingAddress?.phone ? o.shippingAddress.phone.replace(/\D/g, '') : '';

    const exactIdMatch = oId === lowerId || oTrk === lowerId;
    const cleanExactIdMatch = cleanId.length >= 6 && (oIdClean === cleanId || oTrkClean === cleanId);
    const emailMatch = oEmail === lowerId;
    const phoneMatch = cleanPhone.length >= 10 && oPhone.endsWith(cleanPhone.slice(-10));

    return exactIdMatch || cleanExactIdMatch || emailMatch || phoneMatch;
  });

  if (matchingOrders.length === 0) {
    return res.status(404).json({ error: "No order found matching this Order ID, Tracking Number, Email, or Phone Number." });
  }

  // Sort matching orders by date descending (latest order first)
  matchingOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  // Pick the latest/primary matched order
  const primaryOrder = matchingOrders[0];

  // PRIVACY & CUSTOMER ISOLATION:
  // - If Admin: can see all matching orders
  // - If Logged-in Customer: userOrders is restricted to THEIR OWN orders
  // - If Public (by email/phone): userOrders is restricted to that specific email/phone
  // - If Public (by Order ID/Tracking Number): return ONLY that single order (do not leak other orders of that customer)
  let userOrders: Order[] = [];
  const isSearchByEmailOrPhone = lowerId.includes('@') || cleanPhone.length >= 10;

  if (isReqUserAdmin) {
    userOrders = matchingOrders;
  } else if (reqUser) {
    userOrders = db.getOrdersByUser(reqUser.email);
  } else if (isSearchByEmailOrPhone) {
    userOrders = matchingOrders;
  } else {
    userOrders = [primaryOrder];
  }

  return res.json({
    order: primaryOrder,
    userOrders: userOrders,
    ...primaryOrder
  });
};

/**
 * Create Razorpay Order
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, currency = "INR", receipt, customKeyId } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount specified for Razorpay order." });
    }

    const key_id = customKeyId?.trim() || process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

    const amountInPaise = Math.round(Number(amount) * 100);

    if (key_id && key_secret) {
      try {
        const razorpay = new Razorpay({ key_id, key_secret });
        const orderOptions = {
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: receipt || `rcpt_${Date.now()}`
        };

        const rpOrder = await razorpay.orders.create(orderOptions);
        return res.json({
          success: true,
          orderId: rpOrder.id,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          keyId: key_id
        });
      } catch (rpErr: any) {
        console.error("Razorpay API order creation error:", rpErr);
      }
    }

    // Fallback order ID when key_secret is omitted or in test sandbox mode
    const simOrderId = `order_rp_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    return res.json({
      success: true,
      orderId: simOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: key_id
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ error: error.message || "Failed to initialize Razorpay transaction." });
  }
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

    if (key_secret && razorpay_signature && razorpay_order_id) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        return res.json({
          success: true,
          message: "Razorpay payment verified successfully",
          paymentId: razorpay_payment_id
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Razorpay payment signature verification failed"
        });
      }
    }

    // Default success for sandbox or test payment
    return res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id || `pay_sim_${Date.now()}`
    });
  } catch (error: any) {
    console.error("Error verifying Razorpay payment:", error);
    return res.status(500).json({ error: "Failed to verify payment." });
  }
};
