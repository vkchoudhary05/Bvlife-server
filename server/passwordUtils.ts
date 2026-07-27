/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Synchronous version of hashPassword for seeding / initial database fallback.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Compares a plain text password against a hashed password.
 * Also handles fallback for legacy pre-seeded unhashed passwords.
 */
export async function comparePassword(plainPassword: string, storedPassword?: string): Promise<boolean> {
  if (!storedPassword) {
    // If no stored password, compare with default password123 fallback
    return plainPassword === "password123";
  }

  // Check if stored password is a bcrypt hash ($2a$, $2b$, or $2y$)
  const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

  if (isBcryptHash) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  // Legacy fallback comparison for unhashed database records
  return plainPassword === storedPassword;
}
