/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { validateAndFormatIndianPhone } from "../utils.js";
import { generateToken } from "../jwtUtils.js";
import { ADMIN_EMAILS } from "../middleware/authMiddleware.js";
import { communicationService } from "./communicationService.js";

export class OtpService {
  /**
   * Dispatch OTP to mobile number or email
   */
  async sendOtp(params: { identifier: string; purpose?: string; channel?: 'SMS' | 'EMAIL' | 'WHATSAPP' }) {
    const { identifier, purpose, channel } = params;
    if (!identifier) {
      throw { status: 400, message: "Mobile number or email identifier is required." };
    }

    const result = await communicationService.sendOtp({
      identifier,
      purpose: (purpose as any) || 'Login',
      channel: channel || 'SMS'
    });

    return {
      success: true,
      message: result.message,
      reqId: result.reqId,
      otp: result.otp, // undefined in production
      formattedPhone: result.identifier
    };
  }

  /**
   * Verify an entered OTP
   */
  async verifyOtp(params: { identifier: string; code: string; reqId?: string }) {
    const { identifier, code, reqId } = params;
    if (!identifier || !code) {
      throw { status: 400, message: "Identifier and OTP code are required." };
    }

    const result = await communicationService.verifyOtp({
      identifier,
      code: String(code).trim(),
      reqId
    });

    if (!result.success) {
      throw { status: 400, message: result.error || "OTP verification failed." };
    }

    return { success: true, message: result.message };
  }

  /**
   * Verify MSG91 Widget Access Token
   */
  async verifyMsg91Token(tokenToVerify: string, authKeyOverride?: string) {
    if (!tokenToVerify) {
      throw { status: 400, message: "Access token (JWT) from MSG91 OTP Widget is required." };
    }

    const authKey = (process.env.MSG91_AUTH_KEY || authKeyOverride || '').trim();

    if (authKey && authKey !== '') {
      const url = new URL('https://control.msg91.com/api/v5/widget/verifyAccessToken');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          authkey: authKey,
          "access-token": tokenToVerify
        })
      });

      const data: any = await response.json();
      if (response.ok && (data.type === 'success' || data.status === 'success' || (data.message && data.message.toLowerCase().includes('success')) || (data.message && data.message.toLowerCase().includes('verified')))) {
        return {
          success: true,
          message: "MSG91 Widget Access Token verified successfully.",
          data
        };
      } else {
        throw {
          status: 400,
          message: data.message || "MSG91 Widget Access Token verification failed.",
          details: data
        };
      }
    } else {
      return {
        success: true,
        message: "MSG91 Access Token accepted (server authkey not configured).",
        data: { token: tokenToVerify }
      };
    }
  }

  /**
   * Unified OTP Login with Phone or Email
   */
  async otpLogin(params: { identifier: string; code?: string; reqId?: string; accessToken?: string }) {
    const { identifier, code, reqId, accessToken } = params;
    if (!identifier) {
      throw { status: 400, message: "Mobile number or Email address is required." };
    }

    const rawId = identifier.trim();
    let user = db.getUserByEmail(rawId);
    if (!user) {
      const formattedPhone = validateAndFormatIndianPhone(rawId);
      user = db.getUsers().find(u => {
        const uPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
        return uPhone && (uPhone === rawId || uPhone === formattedPhone);
      });
    }

    if (!user) {
      throw { status: 404, message: "This mobile number is not registered. Please register first." };
    }

    // Verify OTP first (or skip if widget pre-verified)
    if (!accessToken) {
      if (!code) {
        throw { status: 400, message: "OTP verification code is required." };
      }
      const otpCheck = await communicationService.verifyOtp({ identifier, code, reqId });
      if (!otpCheck.success) {
        throw { status: 400, message: otpCheck.error || "Invalid OTP code." };
      }
    }

    // Promote to admin if configured
    const lowerEmail = user.email.toLowerCase();
    const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);
    if (ADMIN_EMAILS.includes(lowerEmail) || ['7451050607', '9425011088'].includes(cleanPhone)) {
      user.role = 'admin';
    }

    const token = generateToken(user);
    db.logActivity(user.email, "OTP Login", "Logged in via unified SMS OTP authentication.");

    return {
      message: "Authenticated successfully!",
      user,
      token
    };
  }

  /**
   * Change user mobile number with OTP check
   */
  async changeMobile(email: string, params: { newPhone: string; code?: string; reqId?: string }) {
    const { newPhone, code, reqId } = params;
    if (!newPhone) {
      throw { status: 400, message: "New mobile number is required." };
    }

    const formattedNewPhone = validateAndFormatIndianPhone(newPhone);
    if (!formattedNewPhone) {
      throw { status: 400, message: "Invalid mobile number. Please provide a valid 10-digit Indian phone number." };
    }

    if (code) {
      const otpCheck = await communicationService.verifyOtp({ identifier: formattedNewPhone, code, reqId });
      if (!otpCheck.success) {
        throw { status: 400, message: otpCheck.error || "OTP verification failed for new mobile number." };
      }
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found." };
    }

    const oldPhone = user.phone;
    user.phone = formattedNewPhone;
    db.saveUser(user);

    communicationService.sendSecurityAlertEmail({
      userEmail: user.email,
      userName: user.fullName,
      action: "Mobile Number Updated",
      details: `Your account mobile number was updated from ${oldPhone || 'None'} to ${formattedNewPhone}.`
    }).catch(err => console.warn('Security email notice:', err));

    communicationService.sendSecurityAlertSms({
      phone: formattedNewPhone,
      action: "Mobile Number Linked",
      details: `Your Grams Life profile is now linked to this mobile number.`
    }).catch(err => console.warn('Security SMS notice:', err));

    db.logActivity(user.email, "Mobile Number Change", `Updated mobile from ${oldPhone} to ${formattedNewPhone}`);
    return user;
  }

  /**
   * Change user email address with OTP check
   */
  async changeEmail(currentEmail: string, params: { newEmail: string; code?: string; reqId?: string }) {
    const { newEmail, code, reqId } = params;
    if (!newEmail || !newEmail.includes('@')) {
      throw { status: 400, message: "Valid new email address is required." };
    }

    const formattedNewEmail = newEmail.trim().toLowerCase();

    const existing = db.getUserByEmail(formattedNewEmail);
    if (existing && existing.email.toLowerCase() !== currentEmail.toLowerCase()) {
      throw { status: 400, message: "An account already exists with this new email address." };
    }

    if (code) {
      const otpCheck = await communicationService.verifyOtp({ identifier: formattedNewEmail, code, reqId });
      if (!otpCheck.success) {
        throw { status: 400, message: otpCheck.error || "OTP verification failed for new email address." };
      }
    }

    const user = db.getUserByEmail(currentEmail);
    if (!user) {
      throw { status: 404, message: "User not found." };
    }

    user.email = formattedNewEmail;
    db.saveUser(user);

    communicationService.sendSecurityAlertEmail({
      userEmail: formattedNewEmail,
      userName: user.fullName,
      action: "Primary Email Address Updated",
      details: `Your primary email address has been updated to ${formattedNewEmail}.`
    }).catch(err => console.warn('Security email notice:', err));

    if (user.phone) {
      communicationService.sendSecurityAlertSms({
        phone: user.phone,
        action: "Email Address Updated",
        details: `Your account email address was changed to ${formattedNewEmail}.`
      }).catch(err => console.warn('Security SMS notice:', err));
    }

    const token = generateToken(user);
    db.logActivity(formattedNewEmail, "Email Address Change", `Changed email from ${currentEmail} to ${formattedNewEmail}`);

    return { user, token };
  }
}

export const otpService = new OtpService();
