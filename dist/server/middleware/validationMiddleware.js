/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Validates registration input fields.
 */
export const validateRegister = (req, res, next) => {
    const { email, fullName, password, phone } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "A valid email address is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: "Invalid email address format." });
    }
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({ error: "Full Name is required." });
    }
    if (password !== undefined && password !== null) {
        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }
    }
    next();
};
/**
 * Validates login input fields.
 */
export const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "Email address or Mobile number is required." });
    }
    if (!password || typeof password !== "string") {
        return res.status(400).json({ error: "Password is required." });
    }
    next();
};
/**
 * Validates password reset input fields.
 */
export const validateResetPassword = (req, res, next) => {
    const { query, newPassword, code, reqId } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "Registered email address or mobile number is required." });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    if (!code || typeof code !== "string" || !reqId || typeof reqId !== "string") {
        return res.status(400).json({ error: "A verified OTP is required to reset the password." });
    }
    next();
};
/**
 * Validates product creation/update fields.
 */
export const validateProduct = (req, res, next) => {
    const { name, price, stock, category } = req.body;
    if (req.method === "POST") {
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Product name is required." });
        }
        if (price === undefined || typeof price !== "number" || price < 0) {
            return res.status(400).json({ error: "Valid non-negative product price is required." });
        }
        if (stock === undefined || typeof stock !== "number" || stock < 0) {
            return res.status(400).json({ error: "Valid stock quantity is required." });
        }
        if (!category || typeof category !== "string") {
            return res.status(400).json({ error: "Product category is required." });
        }
    }
    next();
};
/**
 * Validates order creation fields.
 */
export const validateOrder = (req, res, next) => {
    const { items, shippingAddress } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item." });
    }
    if (!shippingAddress || typeof shippingAddress !== "object") {
        return res.status(400).json({ error: "Valid shipping address is required." });
    }
    next();
};
