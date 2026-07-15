import { db } from "../dbManager.js";
// Get all orders (Admin)
export const getOrders = (req, res) => {
    res.json(db.getOrders());
};
// Get user orders
export const getOrdersByUser = (req, res) => {
    res.json(db.getOrdersByUser(req.params.email));
};
// Place new order
export const placeOrder = (req, res) => {
    const { userEmail, userName, shippingAddress, items, subtotal, tax, shippingCharge, discount, finalTotal, paymentMethod } = req.body;
    if (!userEmail || !items || items.length === 0) {
        return res.status(400).json({ error: "Invalid order details." });
    }
    // Create order
    const newOrder = {
        id: `GL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`,
        userEmail: userEmail.toLowerCase(),
        userName,
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
    items.forEach((item) => {
        const prod = db.getProductById(item.productId);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantity);
            db.saveProduct(prod);
        }
    });
    db.saveOrder(newOrder);
    // Automatically record a database-backed Payment transaction for this order
    const paymentRecord = {
        id: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`,
        orderId: newOrder.id,
        userEmail: newOrder.userEmail,
        amount: newOrder.finalTotal,
        paymentMethod: newOrder.paymentMethod,
        transactionReference: newOrder.paymentMethod === "Cash on Delivery"
            ? `COD-PENDING-${newOrder.id}`
            : `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: (newOrder.paymentStatus === "Paid" ? "Paid" : "Pending"),
        createdAt: new Date().toISOString()
    };
    db.savePayment(paymentRecord);
    db.logActivity(userEmail, "Place Order", `Placed order ${newOrder.id} totaling ${newOrder.finalTotal} INR. Payment recorded: ${paymentRecord.status}.`);
    res.json({ message: "Order placed successfully!", order: newOrder });
};
// Update order status (Admin)
export const updateOrder = (req, res) => {
    const order = db.getOrderById(req.params.id);
    if (!order)
        return res.status(404).json({ error: "Order not found." });
    const { status, paymentStatus, comment } = req.body;
    if (status !== undefined) {
        order.status = status;
        order.trackingUpdates.push({
            status,
            date: new Date().toISOString(),
            comment: comment || `Order status updated to: ${status}`
        });
    }
    if (paymentStatus !== undefined) {
        order.paymentStatus = paymentStatus;
        // Sync the database-backed payment transaction status as well!
        const payments = db.getPayments();
        let payRecord = payments.find(p => p.orderId === order.id);
        if (payRecord) {
            payRecord.status = paymentStatus;
            db.savePayment(payRecord);
        }
        else {
            // Create one retroactively if missing
            payRecord = {
                id: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`,
                orderId: order.id,
                userEmail: order.userEmail,
                amount: order.finalTotal,
                paymentMethod: order.paymentMethod,
                transactionReference: `TXN-RETRO-${Math.floor(10000000 + Math.random() * 90000000)}`,
                status: paymentStatus,
                createdAt: new Date().toISOString()
            };
            db.savePayment(payRecord);
        }
    }
    db.saveOrder(order);
    db.logActivity("admin", "Update Order Status", `Set order ${order.id} status to ${status || order.status}`);
    res.json({ message: "Order updated successfully.", order });
};
// Get all payments (Admin)
export const getPayments = (req, res) => {
    res.json(db.getPayments());
};
// Update payment record directly (Admin)
export const updatePayment = (req, res) => {
    const payments = db.getPayments();
    const payment = payments.find(p => p.id === req.params.id);
    if (!payment)
        return res.status(404).json({ error: "Payment transaction not found." });
    const { status, transactionReference } = req.body;
    if (status !== undefined) {
        payment.status = status;
        // Sync back to the order!
        const order = db.getOrderById(payment.orderId);
        if (order) {
            if (status === "Paid") {
                order.paymentStatus = "Paid";
            }
            else if (status === "Failed") {
                order.paymentStatus = "Failed";
            }
            else if (status === "Pending") {
                order.paymentStatus = "Pending";
            }
            db.saveOrder(order);
        }
    }
    if (transactionReference !== undefined) {
        payment.transactionReference = transactionReference;
    }
    db.savePayment(payment);
    db.logActivity("admin", "Update Payment Status", `Set payment transaction ${payment.id} status to ${status || payment.status}`);
    res.json({ message: "Payment updated successfully.", payment });
};
