/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { db } from "../dbManager.js";
import { validateAndFormatIndianPhone } from "../utils.js";
import { generateToken } from "../jwtUtils.js";
import { ADMIN_EMAILS, ADMIN_PHONES } from "../middleware/authMiddleware.js";
import { communicationService } from "./communicationService.js";
export class OtpService {
    /**
     * Verify MSG91 Widget Access Token
     */
    async verifyMsg91Token(tokenToVerify) {
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
            const data = await response.json().catch(() => ({ message: response.statusText }));
            const verified = response.ok && (data.type === 'success' || data.status === 'success' ||
                (typeof data.message === 'string' && /success|verified/i.test(data.message)));
            if (!verified) {
                throw { status: 400, message: data.message || "MSG91 access-token verification failed.", details: data };
            }
            return { success: true, message: "MSG91 access token verified successfully.", data };
        }
        catch (error) {
            if (error?.status)
                throw error;
            throw { status: 502, message: "Unable to verify the MSG91 access token.", details: error?.message };
        }
    }
    async verifyAccessToken(tokenToVerify) {
        return this.verifyMsg91Token(tokenToVerify);
    }
    /**
     * Unified Single OTP Login with Phone or Email
     */
    async otpLogin(params) {
        const { identifier, accessToken, fullName, email: providedEmail, autoCreate } = params;
        if (!identifier) {
            throw { status: 400, message: "Mobile number or Email address is required." };
        }
        // The frontend is the single OTP authority: it sends and verifies through
        // the MSG91 widget. The backend accepts only the resulting access token.
        if (!accessToken) {
            throw { status: 400, message: "A verified MSG91 access token is required for login." };
        }
        await this.verifyAccessToken(accessToken);
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
            const cleanPhone10 = rawId.replace(/\D/g, '').slice(-10);
            // A configured admin mobile is allowed to create its admin profile only
            // after its MSG91 access token has been verified above.
            if (ADMIN_PHONES.includes(cleanPhone10)) {
                const adminEmail = ADMIN_EMAILS[0];
                if (!adminEmail) {
                    throw { status: 500, message: "ADMIN_EMAILS must be configured for the admin mobile login." };
                }
                user = db.getUserByEmail(adminEmail);
                if (user) {
                    user.phone = validateAndFormatIndianPhone(rawId) || rawId;
                    user.role = 'admin';
                    db.saveUser(user);
                }
                else {
                    user = db.saveUser({
                        email: adminEmail,
                        fullName: 'Administrator',
                        phone: validateAndFormatIndianPhone(rawId) || rawId,
                        role: 'admin',
                        password: 'otp-only-admin-account',
                        addresses: [],
                        createdAt: new Date().toISOString()
                    });
                }
            }
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
                }
                else {
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
                    password: 'password123',
                    addresses: [],
                    createdAt: new Date().toISOString()
                });
            }
            else if (!user && autoCreate) {
                const formattedPhone = validateAndFormatIndianPhone(rawId) || rawId;
                const autoEmail = providedEmail?.trim().toLowerCase() || (rawId.includes('@') ? rawId.toLowerCase() : `${rawId.replace(/\D/g, '')}@Bvlife.com`);
                user = db.saveUser({
                    email: autoEmail,
                    fullName: 'Ayurveda Patient',
                    phone: formattedPhone,
                    role: 'customer',
                    password: 'password123',
                    addresses: [],
                    createdAt: new Date().toISOString()
                });
            }
            else if (!user) {
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
        const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);
        if (ADMIN_EMAILS.includes(lowerEmail) || ADMIN_PHONES.includes(cleanPhone)) {
            user.role = 'admin';
        }
        const token = generateToken(user);
        db.logActivity(user.email, "OTP Auth", "Authenticated via unified Mobile SMS OTP.");
        return {
            success: true,
            message: "Authenticated successfully!",
            user,
            token,
            isNewUser: false
        };
    }
    /**
     * Change user mobile number with OTP check
     */
    async changeMobile(email, params) {
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
            details: `Your BV Life profile is now linked to this mobile number.`
        }).catch(err => console.warn('Security SMS notice:', err));
        db.logActivity(user.email, "Mobile Number Change", `Updated mobile from ${oldPhone} to ${formattedNewPhone}`);
        return user;
    }
    /**
     * Change user email address with OTP check
     */
    async changeEmail(currentEmail, params) {
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
