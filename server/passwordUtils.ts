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
 * Plain-text comparison is retained only for legacy records and should be migrated on login.
 */
export async function comparePassword(plainPassword: string, storedPassword?: string): Promise<boolean> {
  const cleanInput = (plainPassword || "").trim();

  if (!cleanInput) {
    return false;
  }

  if (!storedPassword) {
    return false;
  }

  const cleanStored = storedPassword.trim();
  if (cleanInput === cleanStored) {
    return true;
  }

  // Check if stored password is a bcrypt hash ($2a$, $2b$, or $2y$)
  const isBcryptHash = /^\$2[aby]\$/.test(cleanStored);

  if (isBcryptHash) {
    try {
      const match = await bcrypt.compare(cleanInput, cleanStored);
      if (match) return true;
    } catch (err) {
      console.warn("[PasswordUtils] Bcrypt comparison error:", err);
    }
  }

  return cleanInput === cleanStored;
}
