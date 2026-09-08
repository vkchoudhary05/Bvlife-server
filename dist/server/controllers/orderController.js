/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { orderService } from "../services/orderService.js";
/**
 * Get orders for current user or all orders if admin
 */
export const getOrders = (req, res) => {
    try {
        const orders = orderService.getOrders(req.user);
        res.json(orders);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to fetch orders." });
    }
};
/**
 * Get orders for specific user email
 */
export const getOrdersByUser = (req, res) => {
    try {
        const orders = orderService.getOrdersByUser(req.params.email, req.user);
        res.json(orders);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to fetch orders." });
    }
};
/**
 * Place a new order
 */
export const placeOrder = (req, res) => {
    try {
        const newOrder = orderService.placeOrder({
            ...req.body,
            currentUserEmail: req.user?.email,
            currentUserName: req.user?.fullName
        });
        res.json({ message: "Order placed successfully!", order: newOrder });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to place order." });
    }
};
/**
 * Update order status & tracking info
 */
export const updateOrder = (req, res) => {
    try {
        const order = orderService.updateOrder(req.params.id, {
            ...req.body,
            actorEmail: req.user?.email
        });
        res.json({ message: "Order updated successfully.", order });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update order." });
    }
};
/**
 * Public order tracking
 */
export const trackOrder = (req, res) => {
    try {
        const result = orderService.trackOrder(req.params.id, req.user);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Order tracking lookup failed." });
    }
};
