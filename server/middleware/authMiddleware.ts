/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../jwtUtils.js";
import { db } from "../dbManager.js";

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_PHONES = (process.env.ADMIN_PHONES || '')
  .split(',')
  .map((phone) => phone.replace(/\D/g, '').slice(-10))
  .filter((phone) => phone.length === 10);

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    role: string;
    fullName: string;
  };
}

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header (Bearer <token>).
 * Falls back safely to email token for backwards compatibility during migration.
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    const user = db.getUserByEmail(decoded.email);
    const role = user?.role || decoded.role || "customer";
    const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase());

    req.user = {
      email: decoded.email.toLowerCase(),
      role: isAdmin ? "admin" : role,
      fullName: user?.fullName || decoded.fullName || "User"
    };
    return next();
  }

  // Backwards compatibility fallback for plain email tokens
  const fallbackUser = db.getUserByEmail(token.toLowerCase());
  if (fallbackUser) {
    const isAdmin = ADMIN_EMAILS.includes(fallbackUser.email.toLowerCase());
    req.user = {
      email: fallbackUser.email.toLowerCase(),
      role: isAdmin ? "admin" : (fallbackUser.role || "customer"),
      fullName: fallbackUser.fullName
    };
    return next();
  }

  return res.status(401).json({ error: "Invalid or expired authorization token. Please log in again." });
};

/**
 * Optional Authentication Middleware:
 * Attaches user information if valid token provided, but does not block request if unauthenticated.
 */
export const optionalAuthenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) return next();

  const decoded = verifyToken(token);
  if (decoded) {
    const user = db.getUserByEmail(decoded.email);
    const role = user?.role || decoded.role || "customer";
    const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase());

    req.user = {
      email: decoded.email.toLowerCase(),
      role: isAdmin ? "admin" : role,
      fullName: user?.fullName || decoded.fullName || "User"
    };
  } else {
    const fallbackUser = db.getUserByEmail(token.toLowerCase());
    if (fallbackUser) {
      const isAdmin = ADMIN_EMAILS.includes(fallbackUser.email.toLowerCase());
      req.user = {
        email: fallbackUser.email.toLowerCase(),
        role: isAdmin ? "admin" : (fallbackUser.role || "customer"),
        fullName: fallbackUser.fullName
      };
    }
  }

  next();
};

/**
 * Authorization Middleware:
 * Ensures the authenticated user has Admin privileges.
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
