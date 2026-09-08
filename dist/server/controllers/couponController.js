/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { couponService } from "../services/couponService.js";
export const getCoupons = (req, res) => {
    try {
        const coupons = couponService.getCoupons();
        res.json(coupons);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch coupons." });
    }
};
export const createCoupon = (req, res) => {
    try {
        const coupon = couponService.createCoupon(req.body);
        res.json({ message: "Coupon saved.", coupon });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to create coupon." });
    }
};
export const deleteCoupon = (req, res) => {
    try {
        couponService.deleteCoupon(req.params.code);
        res.json({ message: "Coupon deleted." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete coupon." });
    }
};
export const validateCoupon = (req, res) => {
    try {
        const { code, subtotal } = req.body;
        const result = couponService.validateCoupon(code, Number(subtotal || 0));
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 400).json({ error: err.message || "Invalid coupon code." });
    }
};
