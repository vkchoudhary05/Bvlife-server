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

export interface JwtPayload {
  email: string;
  role: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

export function generateToken(user: { email: string; role?: string; fullName?: string }): string {
  const payload: JwtPayload = {
    email: user.email.toLowerCase(),
    role: user.role || "customer",
    fullName: user.fullName || "BV Life User"
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return null;
  }
}
