/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Creates an in-memory rate limiting middleware.
 * @param maxRequests Maximum requests allowed per window
 * @param windowMs Time window in milliseconds
 */
export const rateLimiter = (maxRequests: number = 30, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
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
