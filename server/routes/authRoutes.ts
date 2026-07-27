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
  getUserByEmail, 
  updateUserByEmail, 
  getCustomers, 
  getActivityLogs,
  sendOtp, 
  verifyOtp,
  checkAccount,
  resetPassword,
  getGoogleAuthUrl,
  getFacebookAuthUrl,
  handleGoogleCallback,
  handleFacebookCallback
} from "../controllers/authController.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin, validateResetPassword } from "../middleware/validationMiddleware.js";
import { rateLimiter } from "../middleware/rateLimitMiddleware.js";

export const authRouter = Router();

// Auth Endpoints with validation & rate limiting
authRouter.post("/api/auth/register", rateLimiter(20), validateRegister, register);
authRouter.post("/api/auth/login", rateLimiter(30), validateLogin, login);
authRouter.get("/api/auth/me", authenticateToken, getMe);
authRouter.put("/api/auth/me", authenticateToken, updateMe);

// User Management & Security Routes
authRouter.get("/api/users/:email", authenticateToken, getUserByEmail);
authRouter.put("/api/users/:email", authenticateToken, updateUserByEmail);
authRouter.get("/api/customers", authenticateToken, requireAdmin, getCustomers);
authRouter.get("/api/logs", getActivityLogs);

// Security & Recovery Routes
authRouter.post("/api/auth/otp", rateLimiter(15), sendOtp);
authRouter.post("/api/auth/verify-otp", rateLimiter(20), verifyOtp);
authRouter.post("/api/auth/check-account", checkAccount);
authRouter.post("/api/auth/reset-password", rateLimiter(10), validateResetPassword, resetPassword);

// OAuth Routes
authRouter.get("/api/auth/google/url", getGoogleAuthUrl);
authRouter.get("/api/auth/facebook/url", getFacebookAuthUrl);
authRouter.get(["/auth/google/callback", "/auth/google/callback/"], handleGoogleCallback);
authRouter.get(["/auth/facebook/callback", "/auth/facebook/callback/"], handleFacebookCallback);
