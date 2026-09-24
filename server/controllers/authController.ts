/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { authService } from "../services/authService.js";

/**
 * Register a new user account
 */
export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Registration failed." });
  }
};

/**
 * Standard Email/Password login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Login failed." });
  }
};

/**
 * Get current authenticated user profile
 */
export const getMe = (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const user = authService.getUserProfile(email);
    res.json({ user });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch profile." });
  }
};

/**
 * Update current user profile
 */
export const updateMe = (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const user = authService.updateUserProfile(email, req.body);
    res.json({ message: "Profile updated successfully.", user });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update profile." });
  }
};

/**
 * Upgrade / enroll in BV Life Membership
 */
export const upgradeMembership = (req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    error: "Direct membership activation is disabled. Create and confirm a Razorpay membership payment instead."
  });
};

/** Create a Razorpay order for a membership plan. */
export const createMembershipPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const result = await authService.createMembershipPayment(email, req.body.tier);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create membership payment." });
  }
};

/** Verify a successful Razorpay payment and activate the membership. */
export const confirmMembershipPayment = (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const result = authService.confirmMembershipPayment(email, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Membership payment verification failed." });
  }
};

/**
 * Check if account exists by email/phone
 */
export const checkAccount = (req: Request, res: Response) => {
  try {
    const result = authService.checkAccount(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Account check failed." });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Password reset failed." });
  }
};

/**
 * Admin credentials pre-check
 */
export const adminCheckCredentials = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.adminCheckCredentials(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to verify admin credentials." });
  }
};

/**
 * Fetch all customers (Admin only)
 */
export const getCustomers = (req: Request, res: Response) => {
  try {
    const customers = authService.getCustomers();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customers." });
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedEmail = req.params.email.toLowerCase();
    if (req.user?.role !== 'admin' && req.user?.email.toLowerCase() !== requestedEmail) {
      return res.status(403).json({ error: "You may only access your own account." });
    }
    const user = authService.getUserByEmail(req.params.email);
    res.json(user);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "User not found." });
  }
};

/**
 * Update user by email
 */
export const updateUserByEmail = (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedEmail = req.params.email.toLowerCase();
    if (req.user?.role !== 'admin' && req.user?.email.toLowerCase() !== requestedEmail) {
      return res.status(403).json({ error: "You may only update your own account." });
    }
    if (req.body?.role !== undefined && req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Only administrators can change account roles." });
    }
    const user = authService.updateUserByEmail(req.params.email, req.body);
    res.json({ message: "Profile updated successfully.", user });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update user." });
  }
};
