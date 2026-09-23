/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import jwt from "jsonwebtoken";
import "./env.js";
const configuredJwtSecret = process.env.JWT_SECRET?.trim();
if (!configuredJwtSecret) {
    throw new Error("JWT_SECRET must be set in the environment before the API can start.");
}
export const JWT_SECRET = configuredJwtSecret;
export function generateToken(user) {
    const payload = {
        email: user.email.toLowerCase(),
        role: user.role || "customer",
        fullName: user.fullName || "BV Life User"
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
