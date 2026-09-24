/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { 
  register, 
  login, 
  getMe, 
  updateMe, 
  upgradeMembership,
  createMembershipPayment,
  confirmMembershipPayment,
  getUserByEmail, 
  updateUserByEmail, 
  getCustomers, 
  checkAccount, 
  resetPassword, 
  adminCheckCredentials 
} from "../controllers/authController.js";
import { 
  verifyMsg91Token, 
  getMsg91Config, 
  otpLogin, 
  changeMobile, 
  changeEmail 
} from "../controllers/otpController.js";

import { 
  getActivityLogs, 
  getCommunicationLogs, 
  testMsg91EmailDispatch 
} from "../controllers/contentController.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin, validateResetPassword } from "../middleware/validationMiddleware.js";
import { rateLimiter } from "../middleware/rateLimitMiddleware.js";

export const authRouter = Router();

// Auth Endpoints with validation & rate limiting
authRouter.post("/api/auth/register", rateLimiter(20), validateRegister, register);
authRouter.post("/api/auth/login", rateLimiter(30), validateLogin, login);
// The former phone-only login route created sessions without proving control
// of the phone number. Sign in through the MSG91 OTP flow instead.
authRouter.post("/api/auth/otp-login", rateLimiter(30), otpLogin);
authRouter.get("/api/auth/me", authenticateToken, getMe);
authRouter.put("/api/auth/me", authenticateToken, updateMe);
authRouter.post("/api/auth/membership/upgrade", authenticateToken, upgradeMembership);
authRouter.post("/api/auth/membership/create-payment", authenticateToken, createMembershipPayment);
authRouter.post("/api/auth/membership/confirm-payment", authenticateToken, confirmMembershipPayment);
authRouter.post("/api/auth/change-mobile", authenticateToken, rateLimiter(10), changeMobile);
authRouter.post("/api/auth/change-email", authenticateToken, rateLimiter(10), changeEmail);

// User Management & Security Routes
authRouter.get("/api/users/:email", authenticateToken, getUserByEmail);
authRouter.put("/api/users/:email", authenticateToken, updateUserByEmail);
authRouter.get("/api/customers", authenticateToken, requireAdmin, getCustomers);
authRouter.get("/api/logs", authenticateToken, requireAdmin, getActivityLogs);
authRouter.get("/api/communication/logs", authenticateToken, requireAdmin, getCommunicationLogs);
authRouter.post("/api/communication/test-email", authenticateToken, requireAdmin, rateLimiter(3, 60_000), testMsg91EmailDispatch);

// Security & Recovery Routes
authRouter.post("/api/auth/admin-check-credentials", rateLimiter(20), adminCheckCredentials);
authRouter.post("/api/auth/verify-msg91-token", rateLimiter(20), verifyMsg91Token);
authRouter.get("/api/auth/msg91-config", getMsg91Config);
authRouter.post("/api/auth/check-account", rateLimiter(10), checkAccount);
authRouter.post("/api/auth/reset-password", rateLimiter(10), validateResetPassword, resetPassword);
