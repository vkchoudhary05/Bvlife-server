/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_RATE_LIMIT_KEYS = 50_000;

/**
 * Creates an in-memory rate limiting middleware.
 * @param maxRequests Maximum requests allowed per window
 * @param windowMs Time window in milliseconds
 */
export const rateLimiter = (maxRequests: number = 30, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Do not trust X-Forwarded-For here: unless Express is explicitly
    // configured with a trusted proxy, clients can forge it to evade limits.
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      store.set(ip, entry);

      // Keep this process-local store bounded under high-cardinality traffic.
      if (store.size > MAX_RATE_LIMIT_KEYS) {
        for (const [key, value] of store) {
          if (now > value.resetTime) store.delete(key);
        }
        if (store.size > MAX_RATE_LIMIT_KEYS) {
          const oldestKey = store.keys().next().value;
          if (oldestKey !== undefined) store.delete(oldestKey);
        }
      }
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: `Too many requests from this IP. Please try again after ${retryAfterSeconds} seconds.`
      });
    }

    next();
  };
};
