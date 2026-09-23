/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { db } from "../dbManager.js";
import { ADMIN_EMAILS } from "../middleware/authMiddleware.js";
import { communicationService } from "./communicationService.js";
export class OrderService {
    /**
     * Fetch orders according to user privileges
     */
    getOrders(user) {
        if (!user) {
            throw { status: 401, message: "Authentication required to view orders." };
        }
        const isUserAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.role === 'admin';
        if (isUserAdmin) {
            return db.getOrders();
        }
        return db.getOrdersByUser(user.email);
    }
    /**
     * Fetch orders for a particular user email safely
     */
    getOrdersByUser(requestedEmail, currentUser) {
        if (!currentUser) {
            throw { status: 401, message: "Authentication required to view user orders." };
        }
        const isUserAdmin = ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) || currentUser.role === 'admin';
        const isSelf = currentUser.email.toLowerCase() === requestedEmail.toLowerCase();
        if (!isUserAdmin && !isSelf) {
            return db.getOrdersByUser(currentUser.email);
        }
        return db.getOrdersByUser(requestedEmail);
    }
    /**
     * Place a new order
     */
    placeOrder(params) {
        const { userEmail, userName, shippingAddress, items, subtotal, tax, shippingCharge, discount, finalTotal, paymentMethod, currentUserEmail, currentUserName } = params;
        const emailToUse = (currentUserEmail || userEmail || "").toLowerCase();
        if (!emailToUse || !items || items.length === 0) {
            throw { status: 400, message: "Invalid order details. User email and cart items are required." };
        }
        const newOrder = {
            id: `BVL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`,
            userEmail: emailToUse,
            userName: userName || currentUserName || "Valued Customer",
            shippingAddress,
            items,
            subtotal: Number(subtotal),
            tax: Number(tax),
            shippingCharge: Number(shippingCharge),
            discount: Number(discount),
            finalTotal: Number(finalTotal),
            status: "Pending",
            paymentMethod: paymentMethod || "Razorpay",
            paymentStatus: paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
            orderDate: new Date().toISOString(),
            trackingNumber: `BVLTRK${Math.floor(100000 + Math.random() * 900000)}`,
            trackingUpdates: [
                {
                    status: "Pending",
                    date: new Date().toISOString(),
                    comment: "Your Bv Life authentic wellness order has been received and is being prepared."
                }
            ]
        };
        // Adjust product inventory
        items.forEach((item) => {
            const prod = db.getProductById(item.productId);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
                db.saveProduct(prod);
            }
        });
        db.saveOrder(newOrder);
        // Save shipping address to user's saved addresses in DB
        const existingUser = db.getUserByEmail(emailToUse);
        if (existingUser) {
            const hasAddress = existingUser.addresses?.some(a => a.addressLine1 === shippingAddress?.addressLine1 && a.zipCode === shippingAddress?.zipCode);
            if (!hasAddress && shippingAddress) {
                existingUser.addresses = [...(existingUser.addresses || []), shippingAddress];
                db.saveUser(existingUser);
            }
        }
        // Create payment ledger record
        const newPayment = {
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
        // Asynchronous communication triggers: MSG91 Order Confirmation Template Email & PDF/HTML Invoice
        communicationService.sendOrderConfirmationMsg91Email(newOrder).catch(err => {
            console.warn('[MSG91 Order Confirmation Email] Notice:', err);
        });
        communicationService.sendOrderInvoiceEmail(newOrder).catch(err => {
            console.warn('[Order Invoice Email] Notice:', err);
        });
        // Alert Store / Admin Help Desk (care@gmail.com, care@bvlife.in)
        communicationService.sendOrderAlertEmailToClinic(newOrder).catch(err => {
            console.warn('[Store Alert Email] Notice:', err);
        });
        // Alert Store / Admin Help Desk WhatsApp (+91 7451050607)
        communicationService.sendOrderAlertToClinicWhatsApp(newOrder).catch(err => {
            console.warn('[Store Alert WhatsApp] Notice:', err);
        });
        if (shippingAddress?.phone) {
            communicationService.sendOrderConfirmationWhatsApp(newOrder).catch(err => {
                console.warn('[Order Confirmation WhatsApp] Notice:', err);
            });
            communicationService.sendPaymentConfirmationSms({
                phone: shippingAddress.phone,
                orderId: newOrder.id,
                amount: newOrder.finalTotal,
                paymentMethod: newOrder.paymentMethod,
                status: newOrder.paymentStatus
            }).catch(err => {
                console.warn('[Payment Confirmation SMS] Notice:', err);
            });
        }
        return newOrder;
    }
    /**
     * Update order status & tracking info (Admin)
     */
    updateOrder(orderId, updates) {
        const { status, trackingNumber, comment, paymentStatus, actorEmail } = updates;
        const order = db.getOrderById(orderId);
        if (!order) {
            throw { status: 404, message: "Order not found." };
        }
        const previousStatus = order.status;
        if (status)
            order.status = status;
        if (paymentStatus)
            order.paymentStatus = paymentStatus;
        if (trackingNumber)
            order.trackingNumber = trackingNumber;
        if (status || comment) {
            const updateObj = {
                status: (status || order.status),
                date: new Date().toISOString(),
                comment: comment || `Order status updated to ${status}`
            };
            order.trackingUpdates = [...(order.trackingUpdates || []), updateObj];
        }
        db.saveOrder(order);
        db.logActivity(actorEmail || "admin@Bvlife.com", "Order Update", `Updated order #${orderId} status to ${status}`);
        if (status && status !== previousStatus) {
            if (order.shippingAddress?.phone) {
                communicationService.sendDeliveryTrackingSms({
                    phone: order.shippingAddress.phone,
                    orderId: order.id,
                    status: order.status,
                    trackingNumber: order.trackingNumber,
                    comment: comment || `Your order status is now ${order.status}.`
                }).catch(err => console.warn('[Delivery SMS] Notice:', err));
            }
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
        return order;
    }
    /**
     * Track order by Order ID, Tracking Number, Email or Phone
     */
    trackOrder(rawIdentifier, reqUser) {
        if (!rawIdentifier) {
            throw { status: 400, message: "Please provide an Order ID, Tracking Number, Email, or Phone Number." };
        }
        const identifier = rawIdentifier.trim();
        const lowerId = identifier.toLowerCase();
        const cleanId = lowerId.replace(/[^a-z0-9]/g, '');
        const cleanPhone = lowerId.replace(/\D/g, '');
        const allOrders = db.getOrders();
        const isReqUserAdmin = !!(reqUser && (ADMIN_EMAILS.includes(reqUser.email.toLowerCase()) || reqUser.role === 'admin'));
        const matchingOrders = allOrders.filter(o => {
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
            throw { status: 404, message: "No order found matching this Order ID, Tracking Number, Email, or Phone Number." };
        }
        matchingOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        const primaryOrder = matchingOrders[0];
        let userOrders = [];
        const isSearchByEmailOrPhone = lowerId.includes('@') || cleanPhone.length >= 10;
        if (isReqUserAdmin) {
            userOrders = matchingOrders;
        }
        else if (reqUser) {
            userOrders = db.getOrdersByUser(reqUser.email);
        }
        else if (isSearchByEmailOrPhone) {
            userOrders = matchingOrders;
        }
        else {
            userOrders = [primaryOrder];
        }
        return {
            order: primaryOrder,
            userOrders,
            ...primaryOrder
        };
    }
}
export const orderService = new OrderService();
