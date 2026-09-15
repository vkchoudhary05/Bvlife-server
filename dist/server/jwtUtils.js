/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import jwt from "jsonwebtoken";
export const JWT_SECRET = process.env.JWT_SECRET || "Bvlife_production_jwt_secret_key_2026_dhanvantari";
export function generateToken(user) {
    const payload = {
        email: user.email.toLowerCase(),
        role: user.role || "customer",
        fullName: user.fullName || "Bv Life User"
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
