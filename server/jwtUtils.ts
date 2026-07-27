/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "gramslife_production_jwt_secret_key_2026_dhanvantari";

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
    fullName: user.fullName || "Grams Life User"
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
