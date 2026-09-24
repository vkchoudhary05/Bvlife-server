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
  private assertVerifiedIdentifier(data: any, requestedIdentifier: string) {
    const verifiedContacts: string[] = [];
    const visit = (value: any, key = '') => {
      if (!value) return;
      // MSG91 response fields vary by widget/account configuration. Only
      // values under contact-like keys can be used for identity binding.
      if (typeof value === 'string' || typeof value === 'number') {
        if (/(mobile|phone|email|identifier|contact|recipient|destination)/i.test(key)) {
          verifiedContacts.push(String(value).trim());
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(item => visit(item, key));
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
      }
    };
    visit(data, '');

    // MSG91 token verification is authoritative. Some standard widget
    // configurations return only a success result and omit the identifier;
    // in that case there is no contact claim to compare. Keep the additional
    // binding check when MSG91 does provide a contact value.
    if (verifiedContacts.length === 0) return;

    const requestedEmail = requestedIdentifier.includes('@') ? requestedIdentifier.trim().toLowerCase() : '';
    const requestedPhone = requestedEmail ? '' : requestedIdentifier.replace(/\D/g, '').slice(-10);
    const matches = verifiedContacts.some(contact => requestedEmail
      ? contact.trim().toLowerCase() === requestedEmail
      : requestedPhone.length === 10 && contact.replace(/\D/g, '').slice(-10) === requestedPhone);

    // A valid MSG91 token must belong to the identifier being authenticated.
    // Otherwise a token verified for one phone could be replayed to log in as
    // another account by changing the request body.
    if (!matches) {
      throw { status: 401, message: "The verified OTP identity does not match this account." };
    }
  }

  /**
   * Verify MSG91 Widget Access Token
   */
  async verifyMsg91Token(tokenToVerify: string) {
    if (!tokenToVerify || typeof tokenToVerify !== 'string' || !tokenToVerify.trim()) {
      throw { status: 400, message: "Valid access-token (JWT) from MSG91 OTP Widget is required." };
    }

    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
    if (!authKey) {
      throw { status: 500, message: "MSG91_AUTH_KEY is required to verify login tokens." };
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
        method: 'POST',
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ authkey: authKey, "access-token": tokenToVerify.trim() })
      });
      const data: any = await response.json().catch(() => ({ message: response.statusText }));
      const verified = response.ok && (
        data.type === 'success' || data.status === 'success' ||
        (typeof data.message === 'string' && /success|verified/i.test(data.message))
      );

      if (!verified) {
        throw { status: 400, message: data.message || "MSG91 access-token verification failed.", details: data };
      }

      return { success: true, message: "MSG91 access token verified successfully.", data };
    } catch (error: any) {
      if (error?.status) throw error;
      throw { status: 502, message: "Unable to verify the MSG91 access token.", details: error?.message };
    }
  }

  async verifyAccessToken(tokenToVerify: string) {
    return this.verifyMsg91Token(tokenToVerify);
  }

  async verifyAccessTokenForIdentifier(tokenToVerify: string, identifier: string) {
    const result = await this.verifyAccessToken(tokenToVerify);
    let tokenClaims: Record<string, unknown> = {};
    try {
      const payload = tokenToVerify.split('.')[1];
      if (payload) tokenClaims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      // Some MSG91 deployments may return a non-JWT token; the verified API
      // response remains the source of identity claims in that case.
    }
    this.assertVerifiedIdentifier({ response: result.data, tokenClaims }, identifier);
    return result;
  }

  /**
   * Unified Single OTP Login with Phone or Email
   */
  async otpLogin(params: { identifier: string; accessToken?: string; fullName?: string; email?: string; autoCreate?: boolean }) {
    const { identifier, accessToken, fullName, email: providedEmail, autoCreate } = params;
    if (!identifier) {
      throw { status: 400, message: "Mobile number or Email address is required." };
    }

    // The frontend is the single OTP authority: it sends and verifies through
    // the MSG91 widget. The backend accepts only the resulting access token.
    if (!accessToken) {
      throw { status: 400, message: "A verified MSG91 access token is required for login." };
    }
    await this.verifyAccessTokenForIdentifier(accessToken, identifier);

    const rawId = identifier.trim();
    let user = db.getUserByEmail(rawId);
    if (!user) {
      user = db.getUserByPhone(rawId);
    }
    if (!user) {
      const clean10 = rawId.replace(/\D/g, '').slice(-10);
      if (clean10.length === 10) {
        user = db.getUsers().find(u => {
          const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
          return uPhone === clean10;
        });
      }
    }

    if (!user) {
      if (!user && fullName && fullName.trim()) {
        const formattedPhone = validateAndFormatIndianPhone(rawId) || rawId;
        const cleanEmail = providedEmail?.trim().toLowerCase();
        
        // Check duplicate email
        if (cleanEmail) {
          const existingEmailUser = db.getUserByEmail(cleanEmail);
          if (existingEmailUser) {
            throw {
              status: 400,
              message: "This email address is already registered. Please sign in or use another email."
            };
          }
        } else {
          throw { status: 400, message: "Email address is required to complete registration." };
        }

        // Check duplicate mobile
        const cleanPhone10 = rawId.replace(/\D/g, '').slice(-10);
        if (cleanPhone10.length === 10) {
          const existingPhoneUser = db.getUsers().find(u => (u.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone10);
          if (existingPhoneUser) {
            throw {
              status: 400,
              message: "This mobile number is already registered. Please sign in instead."
            };
          }
        }

        user = db.saveUser({
          email: cleanEmail,
          fullName: fullName.trim(),
          phone: formattedPhone,
          role: 'customer',
          addresses: [],
          createdAt: new Date().toISOString()
        });
      } else if (!user && autoCreate) {
        const formattedPhone = validateAndFormatIndianPhone(rawId) || rawId;
        const autoEmail = providedEmail?.trim().toLowerCase() || (rawId.includes('@') ? rawId.toLowerCase() : `${rawId.replace(/\D/g, '')}@Bvlife.com`);
        user = db.saveUser({
          email: autoEmail,
          fullName: 'Ayurveda Patient',
          phone: formattedPhone,
          role: 'customer',
          addresses: [],
          createdAt: new Date().toISOString()
        });
      } else if (!user) {
        // Return verified status indicating user needs to provide Name & Email to complete registration
        return {
          success: true,
          verified: true,
          isNewUser: true,
          message: "Mobile verified successfully. Please enter your name and email to complete registration.",
          identifier: rawId,
          accessToken: accessToken || ''
        };
      }
    }

    // Promote to admin if configured
    const lowerEmail = user.email.toLowerCase();
    if (ADMIN_EMAILS.includes(lowerEmail)) {
      user.role = 'admin';
    } else if (user.role !== 'admin') {
      user.role = 'customer';
    }
    db.saveUser(user);

    const token = generateToken(user);
    db.logActivity(user.email, "OTP Auth", "Authenticated via unified Mobile SMS OTP.");

    const { password: _password, ...publicUser } = user;
    return {
      success: true,
      message: "Authenticated successfully!",
      user: publicUser,
      token,
      isNewUser: false
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

    if (!code || !reqId) {
      throw { status: 400, message: "A verified OTP for the new mobile number is required." };
    }
    const otpCheck = await communicationService.verifyOtp({ identifier: formattedNewPhone, code, reqId });
    if (!otpCheck.success) {
      throw { status: 400, message: otpCheck.error || "OTP verification failed for new mobile number." };
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
      details: `Your BV Life profile is now linked to this mobile number.`
    }).catch(err => console.warn('Security SMS notice:', err));

    db.logActivity(user.email, "Mobile Number Change", `Updated mobile from ${oldPhone} to ${formattedNewPhone}`);
    const { password: _password, ...publicUser } = user;
    return publicUser;
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

    if (!code || !reqId) {
      throw { status: 400, message: "A verified OTP for the new email address is required." };
    }
    const otpCheck = await communicationService.verifyOtp({ identifier: formattedNewEmail, code, reqId });
    if (!otpCheck.success) {
      throw { status: 400, message: otpCheck.error || "OTP verification failed for new email address." };
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

    const { password: _password, ...publicUser } = user;
    return { user: publicUser, token };
  }
}

export const otpService = new OtpService();
