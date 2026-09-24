/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { User } from "../types.js";
import { validateAndFormatIndianPhone } from "../utils.js";
import { hashPassword, comparePassword } from "../passwordUtils.js";
import { generateToken } from "../jwtUtils.js";
import { ADMIN_EMAILS } from "../middleware/authMiddleware.js";
import { communicationService } from "./communicationService.js";
import { otpService } from "./otpService.js";
import { paymentService } from "./paymentService.js";
import { Payment } from "../types.js";

const MEMBERSHIP_PRICES = {
  '1 Year': 2500,
  '3 Years': 4000,
  '5 Years': 5000,
  '10 Years': 10000,
  'Lifetime': 15000
} as const;

type MembershipTier = keyof typeof MEMBERSHIP_PRICES;

const toPublicUser = (user: User): Omit<User, 'password'> => {
  const { password: _password, ...publicUser } = user;
  return publicUser;
};

export class AuthService {
  /**
   * Register a new user account
   */
  async register(params: {
    email: string;
    fullName: string;
    phone?: string;
    role?: string;
    password?: string;
    code?: string;
    reqId?: string;
    accessToken?: string;
  }) {
    const { email, fullName, phone, password, code, reqId, accessToken } = params;
    if (!email || !fullName) {
      throw { status: 400, message: "Email and Full Name are required." };
    }

    const existingEmail = db.getUserByEmail(email);
    if (existingEmail) {
      throw {
        status: 400,
        message: "Account with this email address already exists. Please sign in to your account.",
        accountExists: true,
        existingEmail: existingEmail.email
      };
    }

    if (!accessToken && (!code || !reqId)) {
      throw { status: 400, message: "Verify your mobile number with an OTP before creating an account." };
    }

    // Format and validate phone
    const formattedPhone = validateAndFormatIndianPhone(phone) || phone;
    if (phone) {
      const existingPhone = db.getUsers().find(u => {
        const uPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return uPhone && uPhone === formattedPhone;
      });
      if (existingPhone) {
        throw {
          status: 400,
          message: "An account with this mobile number already exists. Please sign in to your account.",
          accountExists: true,
          existingEmail: existingPhone.email
        };
      }
    }

    const lowerEmail = email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(lowerEmail);

    // Verify OTP: either through MSG91 Widget verified access token or direct OTP code
    if (accessToken) {
      try {
        await otpService.verifyAccessTokenForIdentifier(accessToken, formattedPhone || email);
      } catch (err: any) {
        if (code) {
          const otpCheck = await communicationService.verifyOtp({ identifier: formattedPhone || email, code, reqId });
          if (!otpCheck.success) {
            throw { status: 400, message: otpCheck.error || "Invalid or expired verification code." };
          }
        } else {
          throw err;
        }
      }
    } else if (code) {
      const otpCheck = await communicationService.verifyOtp({ identifier: formattedPhone || email, code, reqId });
      if (!otpCheck.success) {
        throw { status: 400, message: otpCheck.error || "Invalid or expired verification code." };
      }
    }

    const plainPassword = (password || '').trim();
    if (!plainPassword) {
      throw { status: 400, message: "A password is required to create an account." };
    }
    const hashedPassword = await hashPassword(plainPassword);

    const newUser: User = {
      email: lowerEmail,
      fullName,
      role: isAdmin ? "admin" : "customer",
      phone: formattedPhone || "",
      addresses: [],
      password: hashedPassword
    };

    db.saveUser(newUser);
    db.logActivity(newUser.email, "User Registration", `Created account for ${fullName} with phone ${formattedPhone}`);

    // Send Welcome Email
    communicationService.sendWelcomeEmail({
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone
    }).catch(err => console.warn('[CommunicationService] Welcome email dispatch notice:', err));

    const token = generateToken(newUser);
    return { message: "Registration successful!", user: toPublicUser(newUser), token };
  }

  /**
   * Standard Email/Password login
   */
  async login(params: { email?: string; password?: string }) {
    const { email, password } = params;
    if (!email || !password || !password.trim()) {
      throw { status: 400, message: "Email or Phone Number and password are required." };
    }

    const cleanInput = email.trim();
    const lookupEmail = cleanInput.toLowerCase();
    let user = db.getUserByEmail(lookupEmail);
    if (!user) {
      const formattedPhoneInput = validateAndFormatIndianPhone(cleanInput);
      user = db.getUsers().find(u => {
        const dbPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return dbPhone && (dbPhone === cleanInput || dbPhone === formattedPhoneInput);
      });
    }

    if (!user) {
      throw { status: 401, message: "No account found with this email or mobile number. Please register first." };
    }

    if (user.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      throw { status: 403, message: "Administrator accounts must sign in with the verified OTP flow." };
    }
    const plainPassword = password.trim();
    const isValidPassword = await comparePassword(plainPassword, user.password);

    if (!isValidPassword) {
      throw { status: 401, message: "Incorrect password. Please verify and try again." };
    }

    // Auto-upgrade unhashed legacy password to bcrypt hash
    if (user.password && !/^\$2[aby]\$/.test(user.password)) {
      user.password = await hashPassword(plainPassword);
      db.saveUser(user);
    }

    const lowerEmail = user.email.toLowerCase();
    if (ADMIN_EMAILS.includes(lowerEmail)) {
      user.role = 'admin';
    }

    db.logActivity(user.email, "User Login", "Logged in successfully.");
    const token = generateToken(user);
    return { message: "Login successful!", user: toPublicUser(user), token };
  }

  /**
   * Get current authenticated user profile
   */
  getUserProfile(email: string) {
    const user = db.getUserByEmail(email);
    if (!user) {
      throw { status: 401, message: "User profile not found." };
    }
    const lowerEmail = user.email.toLowerCase();
    if (ADMIN_EMAILS.includes(lowerEmail)) {
      user.role = 'admin';
    }
    return toPublicUser(user);
  }

  /**
   * Update current user profile
   */
  updateUserProfile(email: string, updates: { fullName?: string; phone?: string; addresses?: any[]; role?: string }) {
    const user = db.getUserByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found." };
    }

    if (updates.fullName !== undefined) user.fullName = updates.fullName;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.addresses !== undefined) user.addresses = updates.addresses;
    db.saveUser(user);
    db.logActivity(user.email, "Profile Update", "Updated contact details/addresses.");
    return toPublicUser(user);
  }

  /**
   * Upgrade / Enroll in BV Life Wellness Club Membership
   */
  upgradeMembership(email: string, params: { tier: MembershipTier; pricePaid?: number; cardNumber?: string }) {
    const user = db.getUserByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found." };
    }

    const { tier, pricePaid } = params;
    if (!(tier in MEMBERSHIP_PRICES)) {
      throw { status: 400, message: "Please select a valid membership plan." };
    }
    const now = new Date();
    const startDate = now.toISOString();
    
    // Calculate expiry date
    let expiryDate = '';
    let discountPercentage = 30;
    let standardPrice = MEMBERSHIP_PRICES[tier];

    if (tier === '1 Year') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      expiryDate = exp.toISOString();
    } else if (tier === '3 Years') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 3);
      expiryDate = exp.toISOString();
    } else if (tier === '5 Years') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 5);
      expiryDate = exp.toISOString();
    } else if (tier === '10 Years') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 10);
      expiryDate = exp.toISOString();
    } else if (tier === 'Lifetime') {
      expiryDate = 'Lifetime';
    }

    const randomSuffix1 = Math.floor(1000 + Math.random() * 9000);
    const randomSuffix2 = Math.floor(1000 + Math.random() * 9000);
    const generatedCardNumber = params.cardNumber || `BVL-MEM-${randomSuffix1}-${randomSuffix2}`;

    user.membership = {
      tier,
      cardNumber: generatedCardNumber,
      startDate,
      expiryDate,
      pricePaid: pricePaid || standardPrice,
      discountPercentage,
      status: 'active'
    };

    db.saveUser(user);
    db.logActivity(user.email, "Membership Upgrade", `Enrolled into BV Life ${tier} Membership with Card No ${generatedCardNumber}.`);
    
    return {
      success: true,
      message: `Congratulations! Your BV Life ${tier} Membership is activated.`,
      membership: user.membership,
      user: toPublicUser(user)
    };
  }

  async createMembershipPayment(email: string, tier: MembershipTier) {
    const user = db.getUserByEmail(email);
    if (!user) throw { status: 404, message: "User not found." };
    if (!(tier in MEMBERSHIP_PRICES)) throw { status: 400, message: "Please select a valid membership plan." };

    const paymentId = `membership_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const receipt = `mem_${paymentId.slice(-24)}`;
    const razorpayOrder = await paymentService.createRazorpayOrder({
      amount: MEMBERSHIP_PRICES[tier],
      currency: "INR",
      receipt
    });

    const payment: Payment = {
      id: paymentId,
      orderId: razorpayOrder.orderId,
      userEmail: user.email.toLowerCase(),
      amount: MEMBERSHIP_PRICES[tier],
      paymentMethod: "Razorpay Membership",
      transactionReference: razorpayOrder.orderId,
      status: "Pending",
      createdAt: new Date().toISOString()
    };
    db.savePayment(payment);

    return { ...razorpayOrder, paymentId, tier, amount: razorpayOrder.amount };
  }

  confirmMembershipPayment(email: string, params: {
    paymentId?: string;
    tier?: MembershipTier;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) {
    const user = db.getUserByEmail(email);
    if (!user) throw { status: 404, message: "User not found." };
    const payment = db.getPayments().find(p => p.id === params.paymentId && p.userEmail.toLowerCase() === user.email.toLowerCase());
    if (!payment) throw { status: 404, message: "Membership payment session not found." };
    if (payment.status === "Paid") throw { status: 409, message: "This membership payment was already processed." };
    if (!params.tier || !(params.tier in MEMBERSHIP_PRICES)) throw { status: 400, message: "Please select a valid membership plan." };
    if (payment.amount !== MEMBERSHIP_PRICES[params.tier]) throw { status: 400, message: "Membership payment amount does not match the selected plan." };
    if (!params.razorpay_order_id || params.razorpay_order_id !== payment.orderId) throw { status: 400, message: "Razorpay order does not match the membership payment session." };

    const verification = paymentService.verifyRazorpayPayment(params);
    if (!verification.success) throw { status: 400, message: "Razorpay payment verification failed." };

    payment.status = "Paid";
    payment.transactionReference = verification.paymentId || params.razorpay_payment_id || payment.orderId;
    db.savePayment(payment);

    const result = this.upgradeMembership(user.email, {
      tier: params.tier,
      pricePaid: payment.amount
    });
    db.logActivity(user.email, "Membership Payment", `Razorpay payment ${payment.transactionReference} verified for ${params.tier} membership.`);
    return { ...result, payment };
  }

  /**
   * Lookup account by query (email or phone)
   */
  checkAccount(params: { query?: string; email?: string; phone?: string }) {
    const { query, email, phone } = params;

    if (email || phone) {
      let emailUser = null;
      let phoneUser = null;

      if (email && typeof email === 'string' && email.trim()) {
        emailUser = db.getUserByEmail(email.trim());
      }

      if (phone && typeof phone === 'string' && phone.trim()) {
        const cleanPhone = phone.trim();
        const formattedPhone = validateAndFormatIndianPhone(cleanPhone) || cleanPhone;
        phoneUser = db.getUsers().find(u => {
          const uPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
          return uPhone && (uPhone === cleanPhone || uPhone === formattedPhone);
        });
      }

      if (emailUser && phoneUser) {
        return {
          exists: true,
          emailExists: true,
          phoneExists: true,
          error: "Both this email address and mobile number are already registered. Please sign in instead."
        };
      }
      if (emailUser) {
        return {
          exists: true,
          emailExists: true,
          phoneExists: false,
          error: "This email address is already registered. Please sign in instead."
        };
      }
      if (phoneUser) {
        return {
          exists: true,
          emailExists: false,
          phoneExists: true,
          error: "This mobile number is already registered. Please sign in instead."
        };
      }
      return { exists: false, emailExists: false, phoneExists: false };
    }

    if (!query) {
      throw { status: 400, message: "Email or mobile number query is required." };
    }

    const queryStr = query.trim();
    let user = db.getUserByEmail(queryStr);
    if (!user) {
      const formattedPhoneInput = validateAndFormatIndianPhone(queryStr);
      user = db.getUsers().find(u => {
        const dbPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return dbPhone && (dbPhone === queryStr || dbPhone === formattedPhoneInput);
      });
    }

    if (user) {
      return {
        exists: true,
        isAdmin: user.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase()),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        addresses: user.addresses || []
      };
    }

    return {
      exists: false,
      error: "This mobile number is not registered. Please register first."
    };
  }

  /**
   * Reset user password
   */
  async resetPassword(params: { query: string; newPassword: string; code?: string; reqId?: string }) {
    const { query, newPassword, code, reqId } = params;
    if (!query || !newPassword || !code || !reqId) {
      throw { status: 400, message: "Registered email/phone, new password, and a verified OTP are required." };
    }

    const queryStr = query.trim();
    let user = db.getUserByEmail(queryStr);
    if (!user) {
      const formattedPhoneInput = validateAndFormatIndianPhone(queryStr);
      user = db.getUsers().find(u => {
        const dbPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return dbPhone && (dbPhone === queryStr || dbPhone === formattedPhoneInput);
      });
    }

    if (!user) {
      throw { status: 404, message: "No account found registered with this email or mobile number." };
    }

    const otpCheck = await communicationService.verifyOtp({ identifier: queryStr, code, reqId });
    if (!otpCheck.success) {
      throw { status: 400, message: otpCheck.error || "Invalid OTP code for password reset." };
    }

    user.password = await hashPassword(newPassword);
    db.saveUser(user);
    db.logActivity(user.email, "Password Reset", "Successfully updated password.");

    communicationService.sendSecurityAlertEmail({
      userEmail: user.email,
      userName: user.fullName,
      action: "Password Reset Completed",
      details: "Your BV Life account password was successfully updated."
    }).catch(err => console.warn('Security email notice:', err));

    if (user.phone) {
      communicationService.sendSecurityAlertSms({
        phone: user.phone,
        action: "Password Reset Completed",
        details: "Your account password was updated."
      }).catch(err => console.warn('Security SMS notice:', err));
    }

    const token = generateToken(user);
    return { message: "Password updated successfully! Please log in with your new password.", email: user.email, token };
  }

  /**
   * Admin credential verification for 2FA flow
   */
  async adminCheckCredentials(email: string, password: string) {
    if (!email || !password) {
      throw { status: 400, message: "Admin email and passcode are required." };
    }

    const cleanEmail = email.trim();
    let user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const formattedPhoneInput = validateAndFormatIndianPhone(cleanEmail);
      user = db.getUsers().find(u => {
        const dbPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return dbPhone && (dbPhone === cleanEmail || dbPhone === formattedPhoneInput);
      });
    }

    if (!user) {
      throw { status: 401, message: "No administrative account matches these credentials." };
    }

    const lowerEmail = user.email.toLowerCase();
    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(lowerEmail);

    if (!isAdmin) {
      throw { status: 403, message: "Access Denied: Account lacks administrative privileges." };
    }

    const usesKnownSeedPassword = await comparePassword('123123123', user.password) ||
      await comparePassword('password123', user.password);
    if (usesKnownSeedPassword) {
      throw { status: 403, message: "The old seeded administrator password is disabled. Use mobile OTP sign-in." };
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw { status: 401, message: "Invalid admin security passcode. Please check your credentials." };
    }

    const adminPhone = user.phone || '9425011088';
    return {
      success: true,
      message: "Admin credentials verified. Please complete SMS OTP verification.",
      admin: {
        email: user.email,
        fullName: user.fullName,
        phone: adminPhone,
        role: 'admin'
      }
    };
  }

  /**
   * Fetch all customers (Admin only)
   */
  getCustomers() {
    return db.getUsers().filter(u => u.role === "customer").map(toPublicUser);
  }

  /**
   * Fetch user by email
   */
  getUserByEmail(email: string) {
    const user = db.getUserByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found." };
    }
    return toPublicUser(user);
  }

  /**
   * Update user by email
   */
  updateUserByEmail(email: string, updates: any) {
    const existing = db.getUserByEmail(email);
    if (!existing) {
      throw { status: 404, message: "User not found." };
    }

    if (updates.fullName !== undefined) existing.fullName = updates.fullName;
    if (updates.phone !== undefined) existing.phone = updates.phone;
    if (updates.addresses !== undefined) existing.addresses = updates.addresses;
    if (updates.role !== undefined) existing.role = updates.role;

    db.saveUser(existing);
    db.logActivity(existing.email, "Profile Update", "Updated contact details/addresses.");
    return toPublicUser(existing);
  }
}

export const authService = new AuthService();
