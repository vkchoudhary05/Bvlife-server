/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
const store = {};
/**
 * Creates an in-memory rate limiting middleware.
 * @param maxRequests Maximum requests allowed per window
 * @param windowMs Time window in milliseconds
 */
export const rateLimiter = (maxRequests = 30, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const now = Date.now();
        if (!store[ip] || now > store[ip].resetTime) {
            store[ip] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }
        store[ip].count++;
        if (store[ip].count > maxRequests) {
            const retryAfterSeconds = Math.ceil((store[ip].resetTime - now) / 1000);
            res.setHeader("Retry-After", retryAfterSeconds);
            return res.status(429).json({
                error: `Too many requests from this IP. Please try again after ${retryAfterSeconds} seconds.`
            });
        }
        next();
    };
};
