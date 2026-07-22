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
    // Automatically save shipping address to user's saved addresses in DB or auto-create user if missing
    let existingUser = db.getUserByEmail(userEmail);
    if (!existingUser && shippingAddress && shippingAddress.phone) {
        existingUser = db.getUserByPhone(shippingAddress.phone);
    }
    if (!existingUser) {
        // Auto register customer in DB so their token is valid and they can view/track their order
        existingUser = {
            email: userEmail.toLowerCase(),
            fullName: userName || shippingAddress?.fullName || 'Valued Customer',
            role: 'customer',
            phone: shippingAddress?.phone || '',
            addresses: shippingAddress ? [shippingAddress] : [],
            password: 'password123'
        };
        db.saveUser(existingUser);
    }
    else {
        // Standardize user email on order to match existing user's main email
        newOrder.userEmail = existingUser.email;
        newOrder.userName = newOrder.userName || existingUser.fullName;
        if (shippingAddress) {
            if (!existingUser.addresses) {
                existingUser.addresses = [];
            }
            const streetVal = shippingAddress.addressLine1 || shippingAddress.street || '';
            const zipVal = shippingAddress.zipCode || shippingAddress.pincode || '';
            const exists = existingUser.addresses.some((a) => {
                const aStreet = a.addressLine1 || a.street || '';
                const aZip = a.zipCode || a.pincode || '';
                return aStreet && aStreet.toLowerCase() === streetVal.toLowerCase() && aZip === zipVal;
            });
            if (!exists && streetVal && zipVal) {
                const newAddrRecord = {
                    id: shippingAddress.id || `ADDR-${Date.now()}`,
                    fullName: shippingAddress.fullName || shippingAddress.name || existingUser.fullName,
                    phone: shippingAddress.phone || existingUser.phone,
                    addressLine1: streetVal,
                    street: streetVal,
                    addressLine2: shippingAddress.addressLine2 || '',
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    zipCode: zipVal,
                    pincode: zipVal,
                    isDefault: existingUser.addresses.length === 0
                };
                existingUser.addresses.push(newAddrRecord);
                db.saveUser(existingUser);
            }
        }
    }
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
// Track single order by ID, Tracking Number, Email, or Phone Number
export const trackOrder = (req, res) => {
    const { identifier } = req.params;
    if (!identifier) {
        return res.status(400).json({ error: "Missing tracking identifier." });
    }
    const queryStr = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');
    const allOrders = db.getOrders();
    const matchingOrders = allOrders.filter((o) => {
        const oId = o.id.toLowerCase();
        const oTrk = o.trackingNumber ? o.trackingNumber.toLowerCase() : '';
        const oEmail = o.userEmail ? o.userEmail.toLowerCase() : '';
        const oPhone = o.shippingAddress?.phone ? o.shippingAddress.phone.replace(/\D/g, '') : '';
        const oName = o.shippingAddress?.fullName ? o.shippingAddress.fullName.toLowerCase() : '';
        const matchId = oId === queryStr || oId.endsWith(queryStr) || queryStr.endsWith(oId);
        const matchTrk = oTrk && (oTrk === queryStr || oTrk.includes(queryStr));
        const matchEmail = oEmail && (oEmail === queryStr || oEmail.includes(queryStr));
        const matchPhone = cleanPhone && cleanPhone.length >= 7 && oPhone.endsWith(cleanPhone.slice(-10));
        const matchName = oName && oName === queryStr;
        return matchId || matchTrk || matchEmail || matchPhone || matchName;
    });
    if (!matchingOrders || matchingOrders.length === 0) {
        return res.status(404).json({ error: "No wellness order found matching that ID, tracking number, email, or mobile number." });
    }
    // Sort by date descending so the latest order comes first
    matchingOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    res.json(matchingOrders[0]);
};
