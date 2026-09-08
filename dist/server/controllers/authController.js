/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { authService } from "../services/authService.js";
/**
 * Register a new user account
 */
export const register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Registration failed.", ...err });
    }
};
/**
 * Standard Email/Password login
 */
export const login = async (req, res) => {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Login failed." });
    }
};
/**
 * Get current authenticated user profile
 */
export const getMe = (req, res) => {
    try {
        const email = req.user?.email;
        if (!email)
            return res.status(401).json({ error: "Unauthorized" });
        const user = authService.getUserProfile(email);
        res.json({ user });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to fetch profile." });
    }
};
/**
 * Update current user profile
 */
export const updateMe = (req, res) => {
    try {
        const email = req.user?.email;
        if (!email)
            return res.status(401).json({ error: "Unauthorized" });
        const user = authService.updateUserProfile(email, req.body);
        res.json({ message: "Profile updated successfully.", user });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update profile." });
    }
};
/**
 * Check if account exists by email/phone
 */
export const checkAccount = (req, res) => {
    try {
        const result = authService.checkAccount(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Account check failed." });
    }
};
/**
 * Reset password
 */
export const resetPassword = async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Password reset failed." });
    }
};
/**
 * Admin credentials pre-check
 */
export const adminCheckCredentials = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.adminCheckCredentials(email, password);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to verify admin credentials." });
    }
};
/**
 * Fetch all customers (Admin only)
 */
export const getCustomers = (req, res) => {
    try {
        const customers = authService.getCustomers();
        res.json(customers);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch customers." });
    }
};
/**
 * Get user by email
 */
export const getUserByEmail = (req, res) => {
    try {
        const user = authService.getUserByEmail(req.params.email);
        res.json(user);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "User not found." });
    }
};
/**
 * Update user by email
 */
export const updateUserByEmail = (req, res) => {
    try {
        const user = authService.updateUserByEmail(req.params.email, req.body);
        res.json({ message: "Profile updated successfully.", user });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update user." });
    }
};
