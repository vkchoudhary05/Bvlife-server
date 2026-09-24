/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { verifyToken } from "../jwtUtils.js";
import { db } from "../dbManager.js";
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header (Bearer <token>).
 * Requires a signed JWT and a current user record. Legacy plain-email tokens
 * are intentionally rejected because they let anyone impersonate a user.
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Authentication token required." });
    }
    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }
    // First try verifying as JWT
    const decoded = verifyToken(token);
    if (decoded) {
        const normalizedEmail = typeof decoded.email === "string" ? decoded.email.toLowerCase() : "";
        const user = normalizedEmail ? db.getUserByEmail(normalizedEmail) : undefined;
        if (!user) {
            return res.status(401).json({ error: "Account is no longer active. Please sign in again." });
        }
        const isAdmin = ADMIN_EMAILS.includes(normalizedEmail) || user.role === "admin";
        req.user = {
            email: normalizedEmail,
            role: isAdmin ? "admin" : "customer",
            fullName: user.fullName || "User"
        };
        return next();
    }
    return res.status(401).json({ error: "Invalid or expired authorization token. Please log in again." });
};
/**
 * Optional Authentication Middleware:
 * Attaches user information if valid token provided, but does not block request if unauthenticated.
 */
export const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }
    const token = authHeader.split(" ")[1]?.trim();
    if (!token)
        return next();
    const decoded = verifyToken(token);
    if (decoded) {
        const normalizedEmail = typeof decoded.email === "string" ? decoded.email.toLowerCase() : "";
        const user = normalizedEmail ? db.getUserByEmail(normalizedEmail) : undefined;
        if (user) {
            const isAdmin = ADMIN_EMAILS.includes(normalizedEmail) || user.role === "admin";
            req.user = {
                email: normalizedEmail,
                role: isAdmin ? "admin" : "customer",
                fullName: user.fullName || "User"
            };
        }
    }
    next();
};
/**
 * Authorization Middleware:
 * Ensures the authenticated user has Admin privileges.
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required." });
    }
    const isWhitelisted = ADMIN_EMAILS.includes(req.user.email.toLowerCase());
    const isAdminRole = req.user.role === "admin";
    if (!isWhitelisted && !isAdminRole) {
        return res.status(403).json({ error: "Access denied. Administrator privileges required for this action." });
    }
    next();
};
