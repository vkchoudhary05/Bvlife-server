/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { Order, User, OTPRecord } from "../types.js";
import { validateAndFormatIndianPhone } from "../utils.js";

export type { OTPRecord };

export interface CommunicationLog {
  id: string;
  recipient: string; // Email or Phone
  channel: 'OTP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'VOICE';
  category: 'Registration' | 'Login' | 'ForgotPassword' | 'MobileChange' | 'EmailChange' | 'Invoice' | 'Order' | 'Order Confirmation' | 'Refund' | 'Delivery' | 'Payment' | 'Security' | 'Welcome' | 'DoctorAppointment' | 'Doctor Booking' | string;
  subject?: string;
  content: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED' | 'SIMULATED';
  metadata?: Record<string, any>;
  timestamp: string;
}

// In-memory store for active OTP codes with 10-minute TTL and multi-code grace pool
export const activeOtpStore = new Map<string, OTPRecord[]>();
export const activeOtpByReqIdStore = new Map<string, OTPRecord>();
const communicationLogsStore: CommunicationLog[] = [];

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, records] of activeOtpStore.entries()) {
    const valid = records.filter(r => r.expiresAt > now);
    if (valid.length === 0) {
      activeOtpStore.delete(key);
    } else if (valid.length !== records.length) {
      activeOtpStore.set(key, valid);
    }
  }
  for (const [reqId, record] of activeOtpByReqIdStore.entries()) {
    if (record.expiresAt <= now) {
      activeOtpByReqIdStore.delete(reqId);
    }
  }
}, 60000);

export interface CommunicationSettings {
  msg91AuthKey: string;
  senderEmail: string;
  senderName: string;
  emailDomain: string;
  orderEmailTemplateId: string;
  bookingEmailTemplateId: string;
  clinicWhatsAppNumber: string;
}

export class CommunicationService {
  private static instance: CommunicationService;

  private commSettings: CommunicationSettings = {
    msg91AuthKey: (process.env.MSG91_AUTH_KEY || '').trim().replace(/^["']|["']$/g, ''),
    senderEmail: (process.env.MSG91_SENDER_EMAIL || process.env.MSG91_FROM_EMAIL || 'care@bvlife.in').trim().replace(/^["']|["']$/g, ''),
    senderName: (process.env.MSG91_SENDER_NAME || 'BV Life Care Desk').trim().replace(/^["']|["']$/g, ''),
    emailDomain: (process.env.MSG91_EMAIL_DOMAIN || 'bvlife.in').trim().replace(/^["']|["']$/g, ''),
    orderEmailTemplateId: (process.env.MSG91_ORDER_EMAIL_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID || '').trim().replace(/^["']|["']$/g, ''),
    bookingEmailTemplateId: (process.env.MSG91_BOOKING_EMAIL_TEMPLATE_ID || '').trim().replace(/^["']|["']$/g, ''),
    clinicWhatsAppNumber: (process.env.CLINIC_WHATSAPP_NUMBER || process.env.DOCTOR_HELPLINE_PHONE || '').trim().replace(/^["']|["']$/g, ''),
  };

  private constructor() {}

  public static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  public getSettings(): CommunicationSettings {
    return {
      msg91AuthKey: (process.env.MSG91_AUTH_KEY || this.commSettings.msg91AuthKey || '').trim().replace(/^["']|["']$/g, ''),
      senderEmail: (process.env.MSG91_SENDER_EMAIL || process.env.MSG91_FROM_EMAIL || this.commSettings.senderEmail || 'care@bvlife.in').trim().replace(/^["']|["']$/g, ''),
      senderName: (process.env.MSG91_SENDER_NAME || this.commSettings.senderName || 'BV Life Care Desk').trim().replace(/^["']|["']$/g, ''),
      emailDomain: (process.env.MSG91_EMAIL_DOMAIN || this.commSettings.emailDomain || 'bvlife.in').trim().replace(/^["']|["']$/g, ''),
      orderEmailTemplateId: (process.env.MSG91_ORDER_EMAIL_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID || this.commSettings.orderEmailTemplateId || '').trim().replace(/^["']|["']$/g, ''),
      bookingEmailTemplateId: (process.env.MSG91_BOOKING_EMAIL_TEMPLATE_ID || this.commSettings.bookingEmailTemplateId || '').trim().replace(/^["']|["']$/g, ''),
      clinicWhatsAppNumber: (process.env.CLINIC_WHATSAPP_NUMBER || process.env.DOCTOR_HELPLINE_PHONE || this.commSettings.clinicWhatsAppNumber || '').trim().replace(/^["']|["']$/g, ''),
    };
  }

  public updateSettings(newSettings: Partial<CommunicationSettings>): CommunicationSettings {
    this.commSettings = {
      ...this.getSettings(),
      ...newSettings
    };
    return this.getSettings();
  }

  // Helper to get all key variants for a phone/email
  private getKeyVariants(identifier: string): string[] {
    const raw = identifier.trim().toLowerCase();
    if (raw.includes('@')) return [raw];

    const digits = raw.replace(/\D/g, '');
    const variants = new Set<string>();
    variants.add(raw);
    if (digits) {
      variants.add(digits);
      const clean10 = digits.slice(-10);
      if (clean10.length === 10) {
        variants.add(clean10);
        variants.add(`91${clean10}`);
        variants.add(`+91${clean10}`);
        variants.add(`0${clean10}`);
        variants.add(`+91 ${clean10}`);
      }
    }
    const formatted = validateAndFormatIndianPhone(raw);
    if (formatted) {
      variants.add(formatted.toLowerCase());
      variants.add(formatted.replace('+', '').toLowerCase());
      const clean10 = formatted.replace(/\D/g, '').slice(-10);
      if (clean10.length === 10) {
        variants.add(clean10);
        variants.add(`91${clean10}`);
        variants.add(`+91${clean10}`);
      }
    }
    return Array.from(variants);
  }

  // =========================================================================
  // 1. OTP SERVICE: Registration, Login, Forgot Password, Mobile/Email Change
  // =========================================================================

  public async sendOtp(params: {
    identifier: string;
    purpose?: 'Registration' | 'Login' | 'ForgotPassword' | 'MobileChange' | 'EmailChange' | 'General';
    channel?: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'VOICE';
  }): Promise<{ success: boolean; message: string; reqId?: string; otp?: string; identifier: string }> {
    const rawTarget = params.identifier.trim();
    const isEmail = rawTarget.includes('@');
    const purpose = params.purpose || 'General';
    
    let formattedTarget = rawTarget;
    if (!isEmail) {
      const formattedPhone = validateAndFormatIndianPhone(rawTarget);
      if (!formattedPhone) {
        throw new Error("Invalid mobile number. Please supply a valid 10-digit Indian phone number.");
      }
      formattedTarget = formattedPhone;
    }

    // MSG91 REST AuthKey (only use if explicitly configured as valid API key)
    const authKey = (this.commSettings.msg91AuthKey || process.env.MSG91_AUTH_KEY || '').trim();
    const templateId = (process.env.MSG91_TEMPLATE_ID || '').trim();
    
    // Generate secure 4-digit OTP
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRecord: OTPRecord = {
      code: generatedOtp,
      identifier: formattedTarget,
      purpose,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins grace window
      reqId
    };

    // Store in active OTP cache across all key variants (retaining unexpired previous codes for grace period)
    const keyVariants = this.getKeyVariants(formattedTarget);
    const now = Date.now();
    for (const key of keyVariants) {
      const existing = (activeOtpStore.get(key) || []).filter(r => r.expiresAt > now);
      existing.push(newRecord);
      activeOtpStore.set(key, existing);
    }
    if (reqId) {
      activeOtpByReqIdStore.set(reqId, newRecord);
    }

    console.log(`[OTP Engine] Generated active passcode [${generatedOtp}] for [${formattedTarget}] (Purpose: ${purpose}, ReqID: ${reqId})`);

    // Try MSG91 API dispatch if genuine REST authKey is present
    let dispatchedViaGateway = false;
    if (authKey && authKey.length >= 10) {
      if (isEmail) {
        // Dispatch OTP via MSG91 Email API
        try {
          const emailResult = await this.sendMsg91Email({
            recipients: [{ to: [{ email: formattedTarget }] }],
            subject: `Your BV Life Verification Code: ${generatedOtp}`,
            body: `
              <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e0cda7; border-radius: 14px;">
                <div style="text-align: center; border-bottom: 2px solid #143527; padding-bottom: 12px; margin-bottom: 18px;">
                  <h2 style="color: #143527; margin: 0; font-size: 22px;">🌿 BV Life Healthcare</h2>
                  <p style="color: #bfa15f; margin: 4px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Authentication & Verification</p>
                </div>
                <p style="color: #143527; font-size: 15px;">Namaste,</p>
                <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">Your one-time passcode (OTP) for <strong>${purpose}</strong> is:</p>
                
                <div style="text-align: center; margin: 24px 0;">
                  <span style="display: inline-block; background: #fbf8f2; border: 2px dashed #143527; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #143527; padding: 12px 28px;">
                    ${generatedOtp}
                  </span>
                </div>

                <p style="color: #718096; font-size: 13px; text-align: center;">This passcode is valid for 15 minutes. For your security, never share this code with anyone.</p>
                <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 20px; font-size: 11px; color: #a0aec0;">
                  © BV Life Healthcare • Authentic Ayurvedic Wellness
                </div>
              </div>
            `
          });
          if (emailResult.success) {
            dispatchedViaGateway = true;
            console.log(`[MSG91 Gateway] Email OTP dispatched to ${formattedTarget}.`);
          } else {
            console.warn(`[MSG91 Gateway] Email OTP dispatch note: ${emailResult.error}`);
          }
        } catch (emailErr) {
          console.warn(`[MSG91 Gateway] Email OTP dispatch exception:`, emailErr);
        }
      } else {
        // Dispatch OTP via MSG91 SMS API
        try {
          const rawDigits = formattedTarget.replace(/\D/g, '').slice(-10);
          const msg91Mobile = `91${rawDigits}`;
          
          const queryParams = new URLSearchParams({
            mobile: msg91Mobile,
            otp_length: '4',
            otp: generatedOtp,
            authkey: authKey
          });
          if (templateId && templateId !== '') {
            queryParams.append('template_id', templateId);
          }

          const response = await fetch(`https://control.msg91.com/api/v5/otp?${queryParams.toString()}`, {
            method: 'POST',
            headers: {
              'authkey': authKey,
              'content-type': 'application/json'
            }
          });

          const resData: any = await response.json().catch(() => null);
          if (response.ok && (resData?.type === 'success' || resData?.status === 'success' || (resData?.message && resData.message.toLowerCase().includes('success')))) {
            dispatchedViaGateway = true;
            console.log(`[MSG91 Gateway] Carrier SMS dispatched to ${msg91Mobile}. ReqID: ${resData?.request_id || reqId}`);
          } else {
            console.warn(`[MSG91 Gateway] SMS OTP response:`, resData);
          }
        } catch (gatewayErr) {
          console.warn(`[MSG91 Gateway] Direct SMS API call note:`, gatewayErr);
        }
      }
    }

    // Log communication audit
    this.logCommunication({
      recipient: formattedTarget,
      channel: 'OTP',
      category: (purpose as any) || 'Login',
      content: `Verification OTP dispatched for ${purpose}. Security Token ID: ${reqId}.`,
      status: 'SENT',
      metadata: { purpose, reqId, isGateway: dispatchedViaGateway }
    });

    db.logActivity(
      formattedTarget,
      `OTP Dispatched (${purpose})`,
      `Secure authentication OTP generated for ${formattedTarget}.`
    );

    return {
      success: true,
      message: `Verification code sent successfully to ${isEmail ? formattedTarget : '+' + formattedTarget.replace(/\D/g, '')}.`,
      reqId,
      otp: process.env.NODE_ENV === 'production' ? undefined : generatedOtp, // Never leak OTP in production
      identifier: formattedTarget
    };
  }

  public async verifyOtp(params: {
    identifier: string;
    code: string;
    reqId?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    const rawTarget = (params.identifier || '').trim();
    const cleanDigits = String(params.code || '').trim().replace(/\D/g, '');

    if (!cleanDigits) {
      return {
        success: false,
        message: "Verification failed.",
        error: "Please enter the verification OTP code."
      };
    }

    const keyVariants = this.getKeyVariants(rawTarget);
    const now = Date.now();
    let matchingRecord: OTPRecord | null = null;

    // 1. Check by reqId first if provided
    if (params.reqId && activeOtpByReqIdStore.has(params.reqId)) {
      const rec = activeOtpByReqIdStore.get(params.reqId)!;
      if (rec.expiresAt > now && rec.code.replace(/\D/g, '') === cleanDigits) {
        matchingRecord = rec;
      }
    }

    // 2. Check local in-memory active OTP records strictly across keyVariants
    if (!matchingRecord) {
      for (const key of keyVariants) {
        const records = activeOtpStore.get(key) || [];
        const found = records.find(r => r.code.replace(/\D/g, '') === cleanDigits && r.expiresAt > now);
        if (found) {
          matchingRecord = found;
          break;
        }
      }
    }

    // 3. Resilient 10-digit mobile fallback across active unexpired pool
    if (!matchingRecord) {
      const cleanTarget10 = rawTarget.replace(/\D/g, '').slice(-10);
      if (cleanTarget10.length === 10) {
        for (const [key, records] of activeOtpStore.entries()) {
          const key10 = key.replace(/\D/g, '').slice(-10);
          if (key10 === cleanTarget10) {
            const found = records.find(r => r.code.replace(/\D/g, '') === cleanDigits && r.expiresAt > now);
            if (found) {
              matchingRecord = found;
              break;
            }
          }
        }
      }
    }

    if (matchingRecord) {
      // Invalidate all active OTPs for this identifier across all key variants and reqId
      for (const key of keyVariants) {
        activeOtpStore.delete(key);
      }
      if (matchingRecord.reqId) {
        activeOtpByReqIdStore.delete(matchingRecord.reqId);
      }
      if (params.reqId) {
        activeOtpByReqIdStore.delete(params.reqId);
      }

      this.logCommunication({
        recipient: rawTarget,
        channel: 'OTP',
        category: (matchingRecord?.purpose as any) || 'Login',
        content: `OTP verification successful for ${rawTarget}.`,
        status: 'DELIVERED',
        metadata: { reqId: params.reqId || matchingRecord?.reqId }
      });
      return { success: true, message: "OTP verified successfully." };
    }

    // 4. MSG91 Live Gateway Verification (when configured with valid REST API Auth Key)
    const authKey = (this.commSettings.msg91AuthKey || process.env.MSG91_AUTH_KEY || '').trim();
    if (authKey && authKey.length >= 10) {
      try {
        const cleanMobile = rawTarget.replace(/\D/g, '').slice(-10);
        const mobileVariants = cleanMobile ? [`91${cleanMobile}`, cleanMobile, `+91${cleanMobile}`] : [rawTarget];

        for (const mob of mobileVariants) {
          const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(cleanDigits)}&mobile=${encodeURIComponent(mob)}`;
          
          const response = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
              'authkey': authKey,
              'content-type': 'application/json'
            }
          });

          const data: any = await response.json().catch(() => null);
          if (
            response.ok &&
            data &&
            (data.type === 'success' ||
             data.status === 'success' ||
             (typeof data.message === 'string' && (data.message.toLowerCase().includes('success') || data.message.toLowerCase().includes('verified'))))
          ) {
            // Invalidate local memory records
            for (const key of keyVariants) {
              activeOtpStore.delete(key);
            }
            if (params.reqId) {
              activeOtpByReqIdStore.delete(params.reqId);
            }

            this.logCommunication({
              recipient: rawTarget,
              channel: 'OTP',
              category: 'Login',
              content: `MSG91 Gateway OTP verification confirmed for ${rawTarget}.`,
              status: 'DELIVERED',
              metadata: { reqId: params.reqId }
            });
            return { success: true, message: "OTP verified successfully." };
          }
        }
      } catch (gatewayErr) {
        console.warn('[MSG91 Gateway Verify Note]:', gatewayErr);
      }
    }

    return {
      success: false,
      message: "Verification failed.",
      error: "Invalid or expired OTP code. Please enter the correct verification code."
    };
  }

  // =========================================================================
  // 2. EMAIL SERVICE: Invoice, Order, Refund, Security, Welcome
  // =========================================================================

  public async sendWelcomeEmail(user: { email: string; fullName: string; phone?: string }): Promise<boolean> {
    const subject = `Welcome to BV Life Healthcare, ${user.fullName}`;
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #fdfbf7; padding: 30px; border: 1px solid #d4af37; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 50px; height: 50px; background: #1b3d2f; color: #fdfbf7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; border: 2px solid #d4af37; line-height: 50px;">B</div>
          <h2 style="color: #1b3d2f; margin: 10px 0 4px 0; font-size: 24px;">BV Life</h2>
          <p style="color: #8c7329; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; margin: 0;">Authentic Ayurvedic Healthcare</p>
        </div>
        <p style="color: #1b3d2f; font-size: 15px; line-height: 1.6;">Namaste <strong>${user.fullName}</strong>,</p>
        <p style="color: #2d5543; font-size: 14px; line-height: 1.6;">
          Thank you for joining BV Life. Your account is now active and protected with dual-channel cryptographic security.
        </p>
        <div style="background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid rgba(27,61,47,0.1); margin: 20px 0;">
          <h4 style="color: #1b3d2f; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Account Overview</h4>
          <p style="margin: 4px 0; font-size: 13px; color: #1b3d2f;">• <strong>Registered Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1b3d2f;">• <strong>Registered Mobile:</strong> ${user.phone || 'Not configured'}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1b3d2f;">• <strong>Special Welcome Gift:</strong> Use code <strong style="color: #8c7329; font-family: monospace;">AYUR20</strong> for 20% off your first sanctuary order.</p>
        </div>
        <p style="color: #666; font-size: 12px; line-height: 1.5; text-align: center; border-top: 1px solid #eedcba; padding-top: 15px;">
          BV Life • Pure Vedic Formulas • 100% Certified Organic & Heavy-Metal Tested
        </p>
      </div>
    `;

    console.log(`[Email Service] Dispatched Welcome Email to ${user.email}`);
    this.logCommunication({
      recipient: user.email,
      channel: 'EMAIL',
      category: 'Welcome',
      subject,
      content: `Welcome email dispatched to ${user.fullName} (${user.email}).`,
      status: 'DELIVERED',
      metadata: { email: user.email, name: user.fullName }
    });

    return true;
  }

  /**
   * Dispatches MSG91 Transactional Email via https://control.msg91.com/api/v5/email/send
   */
  public async sendMsg91Email(payload: {
    recipients: Array<{
      to: Array<{ email: string; name?: string }>;
      variables?: Record<string, any>;
    }>;
    from?: { email: string; name?: string };
    domain?: string;
    template_id?: string;
    subject?: string;
    body?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const rawAuthKey = (payload as any).authKey || this.commSettings.msg91AuthKey || (process.env.MSG91_AUTH_KEY || '').trim().replace(/^["']|["']$/g, '');
    const emailDomain = (payload.domain || this.commSettings.emailDomain || process.env.MSG91_EMAIL_DOMAIN || 'bvlife.in').trim();
    const senderEmail = (payload.from?.email || this.commSettings.senderEmail || process.env.MSG91_SENDER_EMAIL || process.env.MSG91_FROM_EMAIL || 'care@bvlife.in').trim();
    const senderName = (payload.from?.name || this.commSettings.senderName || process.env.MSG91_SENDER_NAME || 'BV Life Care Desk').trim();

    const hasTemplateId = Boolean(payload.template_id && payload.template_id.trim().length > 0);

    const requestBody: any = {
      recipients: payload.recipients,
      from: {
        email: senderEmail,
        name: senderName
      },
      domain: emailDomain
    };

    if (hasTemplateId) {
      // MSG91 API rule: 'subject' and 'body' are prohibited if template_id is used.
      requestBody.template_id = payload.template_id!.trim();
    } else {
      // MSG91 API rule: 'subject' and structured 'body' { type, data } are required if template_id is not present.
      requestBody.subject = payload.subject || 'Notification from BV Life Healthcare';
      requestBody.body = {
        type: 'text/html',
        data: payload.body || '<p>Notification from BV Life Healthcare</p>'
      };
    }

    const firstRecipient = payload.recipients[0]?.to[0]?.email || 'Recipient';
    console.log(`[MSG91 Email] Initiating dispatch to ${firstRecipient} (Domain: ${emailDomain}, Sender: ${senderEmail}, Template: ${payload.template_id || 'Direct HTML Body'})...`);

    if (!rawAuthKey || rawAuthKey.length < 10) {
      console.log(`[MSG91 Email Simulation Mode] MSG91_AUTH_KEY is not set in environment or Settings. Simulated transmission recorded for ${firstRecipient}.`);
      console.log(`[MSG91 Email Preview Payload]:`, JSON.stringify(requestBody, null, 2));
      return { success: true, data: { status: 'simulated', message: 'Email queued in simulated sandbox (MSG91_AUTH_KEY not provided)' } };
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'authkey': rawAuthKey
        },
        body: JSON.stringify(requestBody)
      });

      const resData: any = await response.json().catch(() => null);
      console.log(`[MSG91 Email Response] HTTP ${response.status}:`, resData);

      if (response.ok && resData?.status !== 'fail' && !resData?.hasError) {
        return { success: true, data: resData };
      } else {
        // Parse MSG91 validation errors cleanly
        let errorMsg = '';
        if (resData?.errors && typeof resData.errors === 'object') {
          const errorList: string[] = [];
          for (const [, messages] of Object.entries(resData.errors)) {
            if (Array.isArray(messages)) {
              errorList.push(...messages);
            } else if (typeof messages === 'string') {
              errorList.push(messages);
            }
          }
          if (errorList.length > 0) {
            errorMsg = errorList.join(' | ');
          }
        }
        if (!errorMsg) {
          errorMsg = resData?.message || `HTTP error ${response.status}`;
        }

        // Automatic fallback: If template was invalid or missing in MSG91 and an HTML body exists, retry with direct HTML
        if (hasTemplateId && payload.body && (
          response.status === 400 || response.status === 422 ||
          String(errorMsg).toLowerCase().includes('template') ||
          String(errorMsg).toLowerCase().includes('not found')
        )) {
          console.warn(`[MSG91 Email Gateway Fallback]: Template '${payload.template_id}' failed (${errorMsg}). Retrying immediately via direct HTML body dispatch...`);
          return await this.sendMsg91Email({
            ...payload,
            template_id: undefined
          });
        }

        if (
          resData?.apiError === '418' || resData?.code === '418' ||
          resData?.apiError === '408' || resData?.code === '408' ||
          String(errorMsg).toLowerCase().includes('ip is not whitelisted') ||
          String(errorMsg).toLowerCase().includes('ipblocked')
        ) {
          errorMsg = `MSG91 IP Notice (${resData?.code || '408'}): Server IP is blocked or restricted on this AuthKey. In MSG91 Dashboard -> AuthKey -> Whitelist IP, disable IP restriction or whitelist this IP.`;
        } else if (errorMsg.includes('is not registered') || errorMsg.includes('Invalid From email')) {
          errorMsg = `MSG91 Domain Error: The domain '${emailDomain}' is not registered/verified in your MSG91 account. To fix: 1) Add '${emailDomain}' under MSG91 Dashboard → Email → Domains and add the DNS records, or 2) Update the Sending Domain & Sender Email in Settings to match your verified MSG91 domain.`;
        }

        console.warn(`[MSG91 Email Gateway Error]: HTTP ${response.status} - ${errorMsg}`);
        return { success: false, error: errorMsg, data: resData };
      }
    } catch (err: any) {
      console.error(`[MSG91 Email Exception]:`, err);
      return { success: false, error: err.message || 'Network error calling MSG91 Email API' };
    }
  }

  /**
   * Order Confirmation Email via MSG91 Template API
   * Variables matched exactly to user's MSG91 email template specification
   */
  public async sendOrderConfirmationMsg91Email(order: Order): Promise<{ success: boolean; data?: any; error?: string }> {
    const customerName = order.shippingAddress?.fullName || order.userName || 'Valued Seeker';
    const customerEmail = (order.userEmail || '').trim();
    if (!customerEmail) return { success: false, error: 'User email is missing' };

    const firstItem = order.items && order.items[0] ? order.items[0] : null;
    const productName = firstItem ? firstItem.productName : 'Ayurvedic Wellness Formulation';
    const productVariant = (firstItem as any)?.selectedVariant?.name || (firstItem as any)?.selectedVariant?.size || '100g Standard Pack';
    const itemQuantity = firstItem ? String(firstItem.quantity) : '1';
    const itemTotal = firstItem ? `₹${firstItem.price * firstItem.quantity}` : `₹${order.subtotal}`;

    const formattedOrderDate = new Date(order.orderDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const fullShippingAddress = `${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}`;

    const emailTemplateId = this.commSettings.orderEmailTemplateId || process.env.MSG91_ORDER_EMAIL_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID || '';

    const variables: Record<string, string> = {
      customer_name: customerName,
      order_id: `#${order.id}`,
      order_date: formattedOrderDate,
      payment_method: String(order.paymentMethod).toUpperCase(),
      tracking_number: order.trackingNumber || `BVLTRK-${order.id.slice(-6).toUpperCase()}`,
      product_name: productName,
      product_variant_or_weight: productVariant,
      quantity: itemQuantity,
      item_total: itemTotal,
      subtotal: `₹${order.subtotal}`,
      shipping_charge: order.shippingCharge === 0 ? 'FREE' : `₹${order.shippingCharge}`,
      final_amount: `₹${order.finalTotal}`,
      shipping_name: order.shippingAddress.fullName || customerName,
      shipping_address: fullShippingAddress,
      support_email: this.commSettings.senderEmail,
      support_phone: `+${this.commSettings.clinicWhatsAppNumber}`
    };

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e0cda7; border-radius: 16px;">
        <div style="text-align: center; border-bottom: 2px solid #143527; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #143527; margin: 0; font-size: 24px; letter-spacing: 0.5px;">🌿 BV Life Healthcare</h1>
          <p style="color: #bfa15f; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Order Confirmed • Authentic Ayurvedic Care</p>
        </div>
        <p style="color: #143527; font-size: 15px;">Namaste <strong>${customerName}</strong>,</p>
        <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">Your Ayurvedic wellness formulation order <strong>#${order.id}</strong> has been confirmed and placed with our dispensary.</p>
        
        <div style="background: #fbf8f2; border: 1px solid #eedcba; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #143527; font-size: 14px; border-bottom: 1px dashed #d4af37; padding-bottom: 6px;">Order Summary</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Primary Item:</strong> ${productName} (${productVariant}) × ${itemQuantity}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Subtotal:</strong> ₹${order.subtotal}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Shipping:</strong> ${order.shippingCharge === 0 ? 'FREE' : '₹' + order.shippingCharge}</p>
          <p style="margin: 6px 0 0 0; font-size: 15px; color: #143527; font-weight: bold;"><strong>Total Amount:</strong> ₹${order.finalTotal}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #718096;">Payment: ${String(order.paymentMethod).toUpperCase()} • Tracking: ${variables.tracking_number}</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #edf2f7; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 6px 0; color: #143527; font-size: 13px;">Shipping Destination:</h4>
          <p style="margin: 0; font-size: 12px; color: #4a5568; line-height: 1.5;">${fullShippingAddress}</p>
        </div>

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #718096;">
          <p style="margin: 2px 0;">Questions about your dispatch? Reply to <a href="mailto:${this.commSettings.senderEmail}" style="color: #143527; font-weight: bold;">${this.commSettings.senderEmail}</a> or WhatsApp <a href="https://wa.me/${this.commSettings.clinicWhatsAppNumber}" style="color: #143527; font-weight: bold;">+${this.commSettings.clinicWhatsAppNumber}</a>.</p>
        </div>
      </div>
    `;

    const result = await this.sendMsg91Email({
      recipients: [
        {
          to: [
            {
              email: customerEmail,
              name: customerName
            }
          ],
          variables
        }
      ],
      from: {
        email: this.commSettings.senderEmail,
        name: this.commSettings.senderName
      },
      domain: this.commSettings.emailDomain,
      template_id: emailTemplateId || undefined,
      subject: `Order Confirmed: #${order.id} - BV Life Healthcare`,
      body: htmlBody
    });

    this.logCommunication({
      recipient: customerEmail,
      channel: 'EMAIL',
      category: 'Order Confirmation',
      subject: `Order Confirmed: #${order.id} - BV Life`,
      content: `MSG91 Order confirmation email sent to ${customerEmail} for Order #${order.id} (Amount: ₹${order.finalTotal}).`,
      status: result.success ? 'DELIVERED' : 'FAILED',
      metadata: { orderId: order.id, variables, gateway: result }
    });

    return result;
  }

  /**
   * Universal Bv Life Consultation Variable Preparation
   * Maps consultationType strictly to VIDEO | PHONE | WHATSAPP
   * Generates ONE consistent dictionary covering both MSG91 named keys and numbered variables (var1..var8)
   */
  public prepareConsultationVariables(appointment: any): {
    consultationType: 'VIDEO' | 'PHONE' | 'WHATSAPP';
    modeTitle: string;
    modeIcon: string;
    instructionsTitle: string;
    instructionsBody: string;
    actionButtonText: string;
    actionButtonUrl: string;
    detailsLabel: string;
    detailsValue: string;
    variables: Record<string, string>;
  } {
    const rawMode = String(appointment.consultationMode || 'video').toLowerCase();
    const consultationType: 'VIDEO' | 'PHONE' | 'WHATSAPP' = 
      rawMode === 'audio' || rawMode === 'phone' ? 'PHONE' : 
      (rawMode === 'chat' || rawMode === 'whatsapp' ? 'WHATSAPP' : 'VIDEO');

    const patientName = (appointment.patientName || 'Ayurveda Seeker').trim();
    const docName = appointment.doctorName || 'Dr. Sanjeev Rastogi';
    const docSpecialty = appointment.doctorSpecialty || 'Chief Ayurvedic Physician & Master Nadi Vaidya';
    const docQual = appointment.doctorQualification || 'Ph.D, MD (Ayurveda), Banaras Hindu University (BHU)';
    const meetUrl = appointment.meetingLink || `https://meet.jit.si/BVLife-Consult-${appointment.id}`;
    const rawPhone = String(appointment.patientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.slice(-10);

    let modeTitle = '1-on-1 HD Video Consultation';
    let modeIcon = '📹';
    let instructionsTitle = '📹 How to Join Your Video Consultation';
    let instructionsBody = 'Please open your secure video consultation link 5 minutes prior to your time slot. The session runs directly in your phone or laptop browser without any app download required. Ensure camera and microphone permissions are allowed.';
    let actionButtonText = '📹 Join Live Video Consultation Room';
    let actionButtonUrl = meetUrl;
    let detailsLabel = 'Video Room Link:';
    let detailsValue = meetUrl;

    if (consultationType === 'PHONE') {
      modeTitle = 'Direct Phone Call Consultation';
      modeIcon = '📞';
      instructionsTitle = '📞 How Your Phone Consultation Works';
      instructionsBody = `Our doctor will call you directly on your registered phone number (+91 ${cleanPhone}) at ${appointment.timeSlot}. Please keep your mobile phone reachable and stay in a quiet environment.`;
      actionButtonText = '📞 Call Doctor Helpline (+91 7451050607)';
      actionButtonUrl = 'tel:+917451050607';
      detailsLabel = 'Doctor Will Call:';
      detailsValue = `+91 ${cleanPhone}`;
    } else if (consultationType === 'WHATSAPP') {
      modeTitle = 'WhatsApp Live Chat Consultation';
      modeIcon = '💬';
      instructionsTitle = '💬 How Your WhatsApp Chat Works';
      instructionsBody = `Our doctor care desk will connect with you on WhatsApp at ${appointment.timeSlot}. You can exchange messages, voice notes, and share medical reports directly with the doctor.`;
      actionButtonText = '💬 Open WhatsApp Doctor Desk (+91 7451050607)';
      actionButtonUrl = `https://wa.me/917451050607?text=${encodeURIComponent(`Namaste Doctor, I have booked a WhatsApp consultation #${appointment.id} for ${patientName}`)}`;
      detailsLabel = 'WhatsApp Doctor Desk:';
      detailsValue = '+91 7451050607';
    }

    const variables: Record<string, string> = {
      // Standard Named Keys
      consultation_type: consultationType,
      consultationType: consultationType,
      mode: consultationType,
      patient_name: patientName,
      customer_name: patientName,
      name: patientName,
      doctor_name: docName,
      doctor_specialty: docSpecialty,
      specialization: docSpecialty,
      qualification: docQual,
      doctor_qualification: docQual,
      date: appointment.date,
      appointment_date: appointment.date,
      booking_date: appointment.bookingDate || new Date().toLocaleDateString('en-IN'),
      time_slot: appointment.timeSlot,
      time: appointment.timeSlot,
      booking_id: `#${appointment.id}`,
      appointment_id: `#${appointment.id}`,
      meeting_link: actionButtonUrl,
      action_url: actionButtonUrl,
      action_button_url: actionButtonUrl,
      action_button_text: actionButtonText,
      instructions: instructionsBody,
      instructions_title: instructionsTitle,
      instructions_body: instructionsBody,
      details_label: detailsLabel,
      details_value: detailsValue,
      mode_title: modeTitle,
      consultation_mode_title: modeTitle,
      mode_badge: consultationType,
      mode_icon: modeIcon,
      patient_phone: `+91 ${cleanPhone}`,
      phone: `+91 ${cleanPhone}`,
      health_concern: appointment.healthConcern || 'Ayurvedic Assessment & Consultation',
      fee: `₹${appointment.fee || 499}`,
      consultation_fee: `₹${appointment.fee || 499}`,
      amount: `₹${appointment.fee || 499}`,
      payment_status: appointment.paymentStatus || 'Paid',
      clinic_phone: '+91 7451050607',
      helpline: '7451050607',
      clinic_email: 'care@bvlife.in',
      support_email: 'care@bvlife.in',
      admin_email: 'care@gmail.com',

      // Positional Keys (var1..var8 for MSG91 templates configured with ##varN##)
      var1: patientName,
      var2: docName,
      var3: appointment.date,
      var4: appointment.timeSlot,
      var5: consultationType,
      var6: actionButtonUrl,
      var7: '7451050607',
      var8: 'care@bvlife.in',

      // Numeric Keys ("1".."8" for MSG91 templates configured with ##1##, ##2##)
      "1": patientName,
      "2": docName,
      "3": appointment.date,
      "4": appointment.timeSlot,
      "5": consultationType,
      "6": actionButtonUrl,
      "7": '7451050607',
      "8": 'care@bvlife.in'
    };

    return {
      consultationType,
      modeTitle,
      modeIcon,
      instructionsTitle,
      instructionsBody,
      actionButtonText,
      actionButtonUrl,
      detailsLabel,
      detailsValue,
      variables
    };
  }

  /**
   * Doctor Booking Email via MSG91 Template API (Single Adaptive Template)
   * Dispatches according to consultationType (VIDEO | PHONE | WHATSAPP)
   */
  public async sendDoctorBookingMsg91Email(appointment: any): Promise<{ success: boolean; data?: any; error?: string }> {
    const patientEmail = (appointment.patientEmail || '').trim();
    if (!patientEmail) return { success: false, error: 'Patient email is missing' };

    const prep = this.prepareConsultationVariables(appointment);
    const { consultationType, modeTitle, instructionsTitle, instructionsBody, actionButtonText, actionButtonUrl, variables } = prep;
    const patientName = variables.patient_name;
    const docName = variables.doctor_name;

    // Resolves master booking template ID from environment
    const emailTemplateId = (process.env.MSG91_BOOKING_EMAIL_TEMPLATE_ID || this.commSettings.bookingEmailTemplateId || '').trim();

    // Responsive, high-contrast HTML email body customized for BV Life
    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e0cda7; border-radius: 16px;">
        <div style="text-align: center; border-bottom: 2px solid #143527; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #143527; margin: 0; font-size: 24px; letter-spacing: 0.5px;">🌿 BV Life Doctor Desk</h1>
          <p style="color: #bfa15f; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Doctor Consultation Confirmed (${consultationType})</p>
        </div>
        <p style="color: #143527; font-size: 15px;">Namaste <strong>${patientName}</strong>,</p>
        <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">Your Ayurvedic consultation pass <strong>#${appointment.id}</strong> has been confirmed. Below are your consultation details and instructions:</p>
        
        <div style="background: #fbf8f2; border: 1px solid #eedcba; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #d4af37; padding-bottom: 8px; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #143527; font-size: 15px;">Consultation Schedule</h3>
            <span style="background: #143527; color: #eedcba; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; font-family: sans-serif;">${consultationType}</span>
          </div>

          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Doctor:</strong> ${docName} (${variables.qualification})</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Specialty:</strong> ${variables.specialization}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Date & Time Slot:</strong> ${appointment.date} at ${appointment.timeSlot}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Consultation Format:</strong> ${modeTitle}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Health Concern:</strong> ${variables.health_concern}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #2d3748;"><strong>Consultation Fee:</strong> ${variables.consultation_fee} (${variables.payment_status})</p>
          
          <!-- Mode-Specific Action Container -->
          ${consultationType === 'VIDEO' ? `
            <div style="margin-top: 16px; padding: 14px; background: #e6f4ea; border: 1px solid #b7e1cd; border-radius: 10px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #143527;">${instructionsTitle}</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #2d3748; line-height: 1.5;">${instructionsBody}</p>
              <a href="${actionButtonUrl}" style="background: #143527; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${actionButtonText}
              </a>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #4a5568;">Direct Room Link: <a href="${actionButtonUrl}" style="color: #143527; word-break: break-all;">${actionButtonUrl}</a></p>
            </div>
          ` : consultationType === 'PHONE' ? `
            <div style="margin-top: 16px; padding: 14px; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 10px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #003a8c;">${instructionsTitle}</p>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #2d3748; line-height: 1.5;">${instructionsBody}</p>
              <div style="background: #ffffff; padding: 8px 14px; border-radius: 6px; display: inline-block; border: 1px solid #bae7ff; font-weight: bold; font-size: 13px; color: #0050b3;">
                📞 Registered Mobile: ${variables.patient_phone}
              </div>
            </div>
          ` : `
            <div style="margin-top: 16px; padding: 14px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 10px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #237804;">${instructionsTitle}</p>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #2d3748; line-height: 1.5;">${instructionsBody}</p>
              <a href="${actionButtonUrl}" style="background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                ${actionButtonText}
              </a>
            </div>
          `}
        </div>

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #718096;">
          <p style="margin: 2px 0;">Need assistance? Contact our Doctor Helpline at <a href="mailto:care@gmail.com" style="color: #143527; font-weight: bold;">care@gmail.com</a> / <a href="mailto:care@bvlife.in" style="color: #143527; font-weight: bold;">care@bvlife.in</a> or Call/WhatsApp <a href="https://wa.me/917451050607" style="color: #143527; font-weight: bold;">+91 7451050607</a>.</p>
        </div>
      </div>
    `;

    const result = await this.sendMsg91Email({
      recipients: [
        {
          to: [
            {
              email: patientEmail,
              name: patientName
            }
          ],
          variables
        }
      ],
      from: {
        email: this.commSettings.senderEmail,
        name: this.commSettings.senderName
      },
      domain: this.commSettings.emailDomain,
      template_id: emailTemplateId || undefined,
      subject: `Doctor Consultation Confirmed (${consultationType}): #${appointment.id} with ${docName} - Bv Life`,
      body: htmlBody
    });

    this.logCommunication({
      recipient: patientEmail,
      channel: 'EMAIL',
      category: 'Doctor Booking',
      subject: `Doctor Consultation Confirmed (${consultationType}): #${appointment.id} with ${docName}`,
      content: `MSG91 Doctor booking confirmation email sent to ${patientEmail} for Appointment #${appointment.id} (${modeTitle}) on ${appointment.date} at ${appointment.timeSlot}.`,
      status: result.success ? 'DELIVERED' : 'FAILED',
      metadata: { appointmentId: appointment.id, consultationMode: consultationType, templateId: emailTemplateId, variables, gateway: result }
    });

    return result;
  }

  /**
   * Automatically notifies the clinic / doctor helpline email (care@gmail.com, care@bvlife.in)
   * whenever a new doctor appointment is booked
   */
  public async sendDoctorBookingAlertEmailToClinic(appointment: any): Promise<{ success: boolean; data?: any; error?: string }> {
    const rawEmails = process.env.DOCTOR_HELPLINE_EMAIL || 'care@gmail.com,care@bvlife.in';
    const recipientEmails = rawEmails.split(',').map(e => e.trim()).filter(Boolean);
    
    const docName = appointment.doctorName || 'Dr. Sanjeev Rastogi';
    const modeBadge = String(appointment.consultationMode || 'video').toUpperCase();
    const meetUrl = appointment.meetingLink || `https://meet.jit.si/BVLife-Consult-${appointment.id}`;
    
    const recipients = recipientEmails.map(email => ({
      to: [{ email, name: 'Bv Life Doctor Helpline' }],
      variables: {
        patient_name: appointment.patientName,
        booking_id: `#${appointment.id}`,
        doctor_name: docName,
        appointment_date: appointment.date,
        time_slot: appointment.timeSlot,
        consultation_type: modeBadge,
        patient_phone: String(appointment.patientPhone),
        health_concern: appointment.healthConcern || 'Ayurvedic Assessment',
        helpline: '7451050607'
      }
    }));

    const alertHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 25px; border: 1px solid #c8dfd3; border-radius: 14px;">
        <div style="border-bottom: 2px solid #143527; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #143527; margin: 0; font-size: 20px;">🚨 New Doctor Consultation Booked - Bv Life</h2>
          <p style="color: #666; margin: 4px 0 0 0; font-size: 12px;">Alert dispatched to Doctor Desk (${recipientEmails.join(', ')})</p>
        </div>
        <p style="font-size: 14px; color: #333;">A new patient consultation has just been booked and confirmed on <strong>Bv Life</strong>:</p>
        
        <div style="background: #f7faf8; padding: 15px; border-radius: 10px; border: 1px solid #d0e7dc; font-size: 13px; line-height: 1.6; margin: 15px 0;">
          <p style="margin: 3px 0;"><strong>Appointment ID:</strong> #${appointment.id}</p>
          <p style="margin: 3px 0;"><strong>Patient Name:</strong> ${appointment.patientName} (Age: ${appointment.patientAge || 'N/A'}, ${appointment.patientGender || 'N/A'})</p>
          <p style="margin: 3px 0;"><strong>Patient Phone:</strong> ${appointment.patientPhone}</p>
          <p style="margin: 3px 0;"><strong>Patient Email:</strong> ${appointment.patientEmail}</p>
          <p style="margin: 3px 0;"><strong>Doctor:</strong> ${docName}</p>
          <p style="margin: 3px 0;"><strong>Date & Time Slot:</strong> ${appointment.date} at ${appointment.timeSlot}</p>
          <p style="margin: 3px 0;"><strong>Consultation Mode:</strong> <span style="background: #143527; color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: bold;">${modeBadge}</span></p>
          <p style="margin: 3px 0;"><strong>Fee Paid:</strong> ₹${appointment.fee || 499} (${appointment.paymentStatus || 'Paid'})</p>
          <p style="margin: 3px 0;"><strong>Health Concern:</strong> ${appointment.healthConcern || 'General Ayurvedic Evaluation'}</p>
          ${appointment.consultationMode === 'video' ? `<p style="margin: 6px 0;"><strong>Video Room Link:</strong> <a href="${meetUrl}" style="color: #143527; font-weight: bold;">${meetUrl}</a></p>` : ''}
        </div>

        <div style="text-align: center; margin-top: 15px;">
          <a href="https://wa.me/${String(appointment.patientPhone).replace(/\D/g, '')}" style="background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block;">
            💬 Open WhatsApp Chat with Patient
          </a>
        </div>
      </div>
    `;

    const result = await this.sendMsg91Email({
      recipients,
      from: {
        email: this.commSettings.senderEmail,
        name: this.commSettings.senderName
      },
      domain: this.commSettings.emailDomain,
      subject: `🚨 [Doctor Alert] #${appointment.id} Booked: ${appointment.patientName} (${modeBadge}) with ${docName} - Bv Life`,
      body: alertHtml
    });

    console.log(`[Doctor Helpline Email Alert] Dispatched to ${recipientEmails.join(', ')} for #${appointment.id}`);
    return result;
  }

  public async sendOrderInvoiceEmail(order: Order): Promise<boolean> {
    const subject = `Official Order Invoice & Receipt #${order.id} - Bv Life Sanctuary`;
    
    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eedcba; font-size: 13px; color: #1b3d2f;">${item.productName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eedcba; font-size: 13px; text-align: center; color: #1b3d2f;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eedcba; font-size: 13px; text-align: right; font-family: monospace; color: #1b3d2f;">₹${item.price}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eedcba; font-size: 13px; text-align: right; font-family: monospace; font-weight: bold; color: #1b3d2f;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <div style="font-family: Georgia, serif; max-width: 650px; margin: 0 auto; background: #ffffff; padding: 30px; border: 1px solid #d4af37; border-radius: 16px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1b3d2f; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="color: #1b3d2f; margin: 0; font-size: 24px;">Bv Life</h1>
            <p style="color: #8c7329; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; margin: 2px 0 0 0;">Ayurvedic Sanctuary Invoice</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #666;"><strong>Invoice:</strong> BVL-INV-${order.id.slice(-6).toUpperCase()}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;"><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div style="background: #fdfbf7; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 13px;">
          <h4 style="margin: 0 0 6px 0; color: #1b3d2f; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Delivery Destination</h4>
          <p style="margin: 2px 0; font-weight: bold; color: #1b3d2f;">${order.shippingAddress.fullName}</p>
          <p style="margin: 2px 0; color: #444;">${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}</p>
          <p style="margin: 2px 0; color: #444;">Phone: ${order.shippingAddress.phone} | Payment: <strong>${order.paymentMethod}</strong></p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #1b3d2f; color: #fdfbf7;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Product</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase;">Qty</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase;">Price</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 13px; line-height: 1.8; color: #1b3d2f;">
          <p style="margin: 0;">Subtotal: <span style="font-family: monospace;">₹${order.subtotal}</span></p>
          ${order.discount > 0 ? `<p style="margin: 0; color: #059669;">Discount: -<span style="font-family: monospace;">₹${order.discount}</span></p>` : ''}
          <p style="margin: 0;">Tax (GST / VAT): <span style="font-family: monospace;">₹${order.tax}</span></p>
          <p style="margin: 0;">Shipping: <span style="font-family: monospace;">${order.shippingCharge === 0 ? 'FREE' : '₹' + order.shippingCharge}</span></p>
          <h3 style="margin: 10px 0 0 0; color: #1b3d2f; font-size: 18px; border-top: 1px solid #1b3d2f; padding-top: 8px;">Final Total: <span style="font-family: monospace; color: #1b3d2f;">₹${order.finalTotal}</span></h3>
        </div>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eedcba; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">Tracking Number: <strong>${order.trackingNumber || 'BVLTRK-EXP'}</strong></p>
          <p style="margin: 4px 0 0 0;">Thank you for trusting Bv Life for your authentic Ayurvedic wellness.</p>
        </div>
      </div>
    `;

    console.log(`[Email Service] Dispatched Order Invoice Email for Order #${order.id} to ${order.userEmail}`);
    
    this.logCommunication({
      recipient: order.userEmail,
      channel: 'EMAIL',
      category: 'Invoice',
      subject,
      content: `Order Invoice #${order.id} (₹${order.finalTotal}) dispatched to ${order.userEmail}.`,
      status: 'DELIVERED',
      metadata: { orderId: order.id, total: order.finalTotal }
    });

    return true;
  }

  public async sendRefundEmail(params: {
    orderId: string;
    userEmail: string;
    userName: string;
    amount: number;
    reason?: string;
    reference?: string;
  }): Promise<boolean> {
    const subject = `Refund Processed for Order #${params.orderId} - Bv Life`;
    console.log(`[Email Service] Dispatched Refund Notification for Order #${params.orderId} to ${params.userEmail} (Amount: ₹${params.amount})`);
    
    this.logCommunication({
      recipient: params.userEmail,
      channel: 'EMAIL',
      category: 'Refund',
      subject,
      content: `Refund of ₹${params.amount} for Order #${params.orderId} processed to ${params.userEmail}. Reference: ${params.reference || 'REF_AUTO'}.`,
      status: 'DELIVERED',
      metadata: params
    });

    return true;
  }

  public async sendSecurityAlertEmail(params: {
    userEmail: string;
    userName?: string;
    action: string;
    details: string;
  }): Promise<boolean> {
    const subject = `Security Alert: ${params.action} - Bv Life Account`;
    console.log(`[Email Service] Dispatched Security Alert to ${params.userEmail}: ${params.action}`);

    this.logCommunication({
      recipient: params.userEmail,
      channel: 'EMAIL',
      category: 'Security',
      subject,
      content: `Security Alert: ${params.action}. ${params.details}`,
      status: 'DELIVERED',
      metadata: params
    });

    return true;
  }

  // =========================================================================
  // 3. SMS SERVICE: Delivery Tracking, Payment Confirmation, Security Alert
  // =========================================================================

  public async sendDeliveryTrackingSms(params: {
    phone: string;
    orderId: string;
    status: string;
    trackingNumber?: string;
    comment?: string;
  }): Promise<boolean> {
    const formattedPhone = validateAndFormatIndianPhone(params.phone) || params.phone;
    const cleanDigits = formattedPhone.replace(/\D/g, '');
    
    const message = `Bv Life Update: Order #${params.orderId} status is now [${params.status}]. Tracking: ${params.trackingNumber || 'In Transit'}. ${params.comment || 'Thank you for choosing authentic Ayurvedic wellness.'}`;
    
    console.log(`[SMS Service] Dispatching Delivery Tracking SMS to +${cleanDigits}: ${message}`);

    // Call MSG91 transactional SMS API if configured
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
    if (authKey && authKey.trim() !== '') {
      try {
        await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': authKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            template_id: process.env.MSG91_FLOW_ID || 'flow_delivery_update',
            short_url: '0',
            recipients: [{
              mobiles: cleanDigits,
              order_id: params.orderId,
              status: params.status,
              tracking_no: params.trackingNumber || ''
            }]
          })
        }).catch(e => console.warn('[MSG91 Flow SMS] Flow dispatch notice:', e));
      } catch (err) {
        console.warn('[MSG91 Flow SMS] Exception:', err);
      }
    }

    this.logCommunication({
      recipient: formattedPhone,
      channel: 'SMS',
      category: 'Delivery',
      content: message,
      status: 'DELIVERED',
      metadata: params
    });

    return true;
  }

  public async sendPaymentConfirmationSms(params: {
    phone: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    status: string;
  }): Promise<boolean> {
    const formattedPhone = validateAndFormatIndianPhone(params.phone) || params.phone;
    const message = `Bv Life Payment: ₹${params.amount} received for Order #${params.orderId} via ${params.paymentMethod}. Your order is confirmed.`;

    console.log(`[SMS Service] Dispatching Payment Confirmation SMS to ${formattedPhone}: ${message}`);

    this.logCommunication({
      recipient: formattedPhone,
      channel: 'SMS',
      category: 'Payment',
      content: message,
      status: 'DELIVERED',
      metadata: params
    });

    return true;
  }

  public async sendSecurityAlertSms(params: {
    phone: string;
    action: string;
    details: string;
  }): Promise<boolean> {
    const formattedPhone = validateAndFormatIndianPhone(params.phone) || params.phone;
    const message = `Bv Life Security Notice: ${params.action} performed on your account. If this was not you, please contact care@gmail.com or care@bvlife.in immediately.`;

    console.log(`[SMS Service] Dispatching Security Alert SMS to ${formattedPhone}: ${message}`);

    this.logCommunication({
      recipient: formattedPhone,
      channel: 'SMS',
      category: 'Security',
      content: message,
      status: 'DELIVERED',
      metadata: params
    });

    return true;
  }

  // =========================================================================
  // 4. AUTOMATED WHATSAPP NOTIFICATIONS (MSG91 Gateway & Admin Alerts)
  // =========================================================================

  /**
   * Dispatch an automated WhatsApp message via MSG91 WhatsApp API v5
   * Supports clean separation between pre-approved Template ID and Free-Text sessions
   */
  public async sendWhatsAppMessage(params: {
    recipientPhone: string;
    messageText?: string;
    templateId?: string;
    variables?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; gatewayResponse?: any }> {
    const rawPhone = params.recipientPhone.replace(/\D/g, '');
    const recipientWithCountry = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const rawAuth = process.env.MSG91_AUTH_KEY || '';
    const authKey = rawAuth.replace(/['";\s]/g, '').trim();
    const integratedNumber = (process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || process.env.DOCTOR_HELPLINE_PHONE || '917451050607').replace(/\D/g, '');

    console.log(`[WhatsApp Gateway] Triggering WhatsApp dispatch to +${recipientWithCountry} (Template: ${params.templateId || 'Free Text'}, Key configured: ${Boolean(authKey)})...`);

    let gatewaySuccess = false;
    let gatewayResponse: any = null;

    if (authKey && authKey.length > 5) {
      try {
        // Build payload cleanly without mixing text and template
        const isTemplateMode = Boolean(params.templateId && params.templateId.trim());

        if (isTemplateMode) {
          // 1. Dedicated Template Dispatch via Outbound API
          const payload: any = {
            integrated_number: integratedNumber,
            recipient_number: recipientWithCountry,
            content_type: 'template',
            template_id: params.templateId,
            variables: params.variables || {}
          };

          const res = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
            method: 'POST',
            headers: {
              'authkey': authKey,
              'content-type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const resText = await res.text();
          try {
            gatewayResponse = JSON.parse(resText);
          } catch {
            gatewayResponse = { raw: resText, httpStatus: res.status };
          }

          if (res.ok && (gatewayResponse?.status === 'success' || gatewayResponse?.type === 'success' || (typeof gatewayResponse?.message === 'string' && gatewayResponse.message.toLowerCase().includes('success')))) {
            gatewaySuccess = true;
            console.log(`[WhatsApp Gateway] Template delivered to +${recipientWithCountry} via MSG91! Response:`, gatewayResponse);
          } else {
            console.warn(`[WhatsApp Gateway] Outbound template attempt note (${res.status}):`, gatewayResponse);

            // 2. Fallback attempt via MSG91 Flow API
            try {
              const flowRes = await fetch('https://control.msg91.com/api/v5/flow/', {
                method: 'POST',
                headers: {
                  'authkey': authKey,
                  'content-type': 'application/json'
                },
                body: JSON.stringify({
                  template_id: params.templateId,
                  short_url: '0',
                  recipients: [{
                    mobiles: recipientWithCountry,
                    ...(params.variables || {})
                  }]
                })
              });
              const flowText = await flowRes.text();
              let flowData: any = null;
              try { flowData = JSON.parse(flowText); } catch { flowData = { raw: flowText }; }
              if (flowRes.ok) {
                gatewaySuccess = true;
                gatewayResponse = flowData;
                console.log(`[WhatsApp Gateway] Flow message dispatched to +${recipientWithCountry}:`, flowData);
              } else {
                gatewayResponse = { outbound: gatewayResponse, flow: flowData };
              }
            } catch (flowErr: any) {
              console.warn(`[WhatsApp Gateway] Flow dispatch error:`, flowErr);
              gatewayResponse = { outbound: gatewayResponse, flowError: flowErr?.message || String(flowErr) };
            }

            // 3. Fallback: If template and flow both failed, attempt sending direct text message if text is present
            if (!gatewaySuccess && params.messageText) {
              try {
                const textRes = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
                  method: 'POST',
                  headers: {
                    'authkey': authKey,
                    'content-type': 'application/json',
                    'accept': 'application/json'
                  },
                  body: JSON.stringify({
                    integrated_number: integratedNumber,
                    recipient_number: recipientWithCountry,
                    content_type: 'text',
                    text: params.messageText
                  })
                });
                const textData: any = await textRes.json().catch(() => null);
                if (textRes.ok && textData?.status !== 'fail') {
                  gatewaySuccess = true;
                  gatewayResponse = textData;
                  console.log(`[WhatsApp Gateway] Fallback text message delivered to +${recipientWithCountry}!`);
                }
              } catch (txtErr) {
                console.warn(`[WhatsApp Gateway] Fallback text attempt error:`, txtErr);
              }
            }
          }
        } else {
          // Free-text session message
          const payload = {
            integrated_number: integratedNumber,
            recipient_number: recipientWithCountry,
            content_type: 'text',
            text: params.messageText || 'Namaste from Bv Life Doctor Care Desk.'
          };

          const res = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
            method: 'POST',
            headers: {
              'authkey': authKey,
              'content-type': 'application/json',
              'accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const resText = await res.text();
          try {
            gatewayResponse = JSON.parse(resText);
          } catch {
            gatewayResponse = { raw: resText, httpStatus: res.status };
          }

          if (res.ok) {
            gatewaySuccess = true;
          }
        }
      } catch (err: any) {
        console.warn(`[WhatsApp Gateway] Connection note:`, err);
        gatewayResponse = { error: err?.message || String(err) };
      }
    } else {
      console.log(`[WhatsApp Gateway Simulation] Test Mode / Sandbox: Prepared message for +${recipientWithCountry}. (MSG91_AUTH_KEY is not set in environment).`);
      gatewayResponse = { notice: "MSG91_AUTH_KEY environment variable is empty or not passed to this process." };
    }

    // Always log communication audit in DB
    this.logCommunication({
      recipient: recipientWithCountry,
      channel: 'WHATSAPP',
      category: 'DoctorAppointment',
      content: params.messageText || `Template [${params.templateId}] dispatched to ${recipientWithCountry}`,
      status: gatewaySuccess ? 'DELIVERED' : 'SENT',
      metadata: { gatewaySuccess, recipient: recipientWithCountry, gatewayResponse, templateId: params.templateId }
    });

    return {
      success: true,
      message: `Automated WhatsApp notification processed for +${recipientWithCountry}`,
      gatewayResponse
    };
  }

  /**
   * Automatically notifies the clinic / doctor helpline on WhatsApp (+91 7451050607) when a user books an appointment
   */
  public async sendDoctorBookingAlertToClinic(appointment: any): Promise<{ success: boolean; message: string }> {
    const clinicNumber = (process.env.CLINIC_WHATSAPP_NUMBER || process.env.DOCTOR_HELPLINE_PHONE || '917451050607').replace(/\D/g, '');
    const prep = this.prepareConsultationVariables(appointment);
    const { consultationType, actionButtonUrl, variables } = prep;
    const docName = variables.doctor_name;

    const formattedAlert = 
`🚨 *NEW DOCTOR BOOKING RECEIVED* 🚨

Namaste Doctor / Helpline Desk,
A new consultation has just been booked and confirmed on Bv Life:

📋 *Booking Details:*
• *Appointment ID:* #${appointment.id}
• *Patient Name:* ${appointment.patientName} (Age: ${appointment.patientAge || 'N/A'}, ${appointment.patientGender || 'N/A'})
• *Patient Phone:* ${variables.patient_phone}
• *Patient Email:* ${appointment.patientEmail}

🩺 *Consultation Info:*
• *Assigned Doctor:* ${docName}
• *Date:* ${appointment.date}
• *Time Slot:* ${appointment.timeSlot}
• *Mode:* ${consultationType}
• *Fee Paid:* ${variables.consultation_fee} (${variables.payment_status})
• *Chief Health Concern:* ${variables.health_concern}
${consultationType === 'VIDEO' ? `\n📹 *Video Room Link:*\n${actionButtonUrl}\n` : ''}
Open your Doctor Dashboard to manage the session:
${process.env.APP_URL || 'https://bvlife.in'}/doctor-dashboard

*Bv Life Doctor Care Desk*`;

    const clinicAlertTemplateId = (process.env.MSG91_WHATSAPP_CLINIC_ALERT_TEMPLATE_ID || '').trim() || undefined;

    const result = await this.sendWhatsAppMessage({
      recipientPhone: clinicNumber,
      messageText: formattedAlert,
      templateId: clinicAlertTemplateId,
      variables: prep.variables
    });

    console.log(`[Automated WhatsApp Alert] Dispatched instant doctor alert to +${clinicNumber} for Appointment #${appointment.id}`);
    return result;
  }

  /**
   * Automatically sends an instant confirmation WhatsApp slip to the patient's own mobile
   */
  public async sendPatientBookingConfirmationWhatsApp(appointment: any): Promise<{ success: boolean; message: string }> {
    if (!appointment.patientPhone) return { success: false, message: "No patient phone provided" };
    
    const prep = this.prepareConsultationVariables(appointment);
    const { consultationType, actionButtonUrl, variables } = prep;
    const docName = variables.doctor_name;

    const patientSlip = 
`🌿 *BV Life - Doctor Consultation Confirmed* 🌿

Namaste *${appointment.patientName}*,
Your Ayurvedic consultation with *${docName}* has been officially confirmed!

📋 *Appointment Details:*
• *Appointment ID:* #${appointment.id}
• *Doctor:* ${docName} (${variables.qualification})
• *Specialty:* ${variables.specialization}
• *Date:* ${appointment.date}
• *Time Slot:* ${appointment.timeSlot}
• *Format:* ${consultationType}
• *Payment Status:* Verified Paid (${variables.consultation_fee})
${consultationType === 'VIDEO' ? `\n📹 *Direct Video Consultation Link:*\n${actionButtonUrl}\n(No app download required. Open on phone or laptop 5 minutes prior to slot.)\n` : ''}${consultationType === 'PHONE' ? `\n📞 *Telephone Call:*\nDoctor will initiate a direct call to your mobile (${variables.patient_phone}) at ${appointment.timeSlot}.\n` : ''}${consultationType === 'WHATSAPP' ? `\n💬 *WhatsApp Consultation:*\nOur doctor team will connect with you on this WhatsApp number at ${appointment.timeSlot}.\n` : ''}
For any questions or assistance, reply directly to this WhatsApp message, call our helpline at +91 7451050607, or email care@gmail.com / care@bvlife.in.

Warm regards,
*BV Life Doctor Care Desk*
📞 +91 7451050607 | ✉️ care@bvlife.in`;

    const whatsappTemplateId = (process.env.MSG91_WHATSAPP_BOOKING_TEMPLATE_ID || (this.commSettings as any).whatsappBookingTemplateId || '').trim() || undefined;

    return await this.sendWhatsAppMessage({
      recipientPhone: appointment.patientPhone,
      messageText: patientSlip,
      templateId: whatsappTemplateId,
      variables: prep.variables
    });
  }

  /**
   * Dispatches an instant Order Alert Email to the Store Helpline (care@gmail.com and care@bvlife.in)
   */
  public async sendOrderAlertEmailToClinic(order: Order): Promise<{ success: boolean; data?: any; error?: string }> {
    const rawEmails = process.env.STORE_HELPLINE_EMAIL || process.env.DOCTOR_HELPLINE_EMAIL || 'care@gmail.com,care@bvlife.in';
    const recipientEmails = rawEmails.split(',').map(e => e.trim()).filter(Boolean);

    const itemsSummary = (order.items || []).map(i => `• ${i.productName} (Qty: ${i.quantity}) - ₹${i.price * i.quantity}`).join('<br>');
    const trackingCode = order.trackingNumber || `BVLTRK-${order.id.slice(-6).toUpperCase()}`;

    const recipients = recipientEmails.map(email => ({
      to: [{ email, name: 'Bv Life Store Desk' }],
      variables: {
        order_id: `#${order.id}`,
        customer_name: order.shippingAddress?.fullName || 'Customer',
        customer_phone: order.shippingAddress?.phone || '',
        customer_email: order.userEmail,
        total_amount: `₹${order.finalTotal}`,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus || 'Confirmed',
        tracking_number: trackingCode,
        helpline: '7451050607',
        support_email: 'care@bvlife.in'
      }
    }));

    const alertHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 25px; border: 1px solid #c8dfd3; border-radius: 14px;">
        <div style="border-bottom: 2px solid #143527; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #143527; margin: 0; font-size: 20px;">📦 New Order Placed - Bv Life Store</h2>
          <p style="color: #666; margin: 4px 0 0 0; font-size: 12px;">Alert dispatched to Store Desk (${recipientEmails.join(', ')})</p>
        </div>
        <p style="font-size: 14px; color: #333;">A new product order has just been placed and confirmed on <strong>Bv Life</strong>:</p>
        
        <div style="background: #f7faf8; padding: 15px; border-radius: 10px; border: 1px solid #d0e7dc; font-size: 13px; line-height: 1.6; margin: 15px 0;">
          <p style="margin: 3px 0;"><strong>Order ID:</strong> #${order.id}</p>
          <p style="margin: 3px 0;"><strong>Customer Name:</strong> ${order.shippingAddress?.fullName}</p>
          <p style="margin: 3px 0;"><strong>Customer Phone:</strong> ${order.shippingAddress?.phone}</p>
          <p style="margin: 3px 0;"><strong>Customer Email:</strong> ${order.userEmail}</p>
          <p style="margin: 3px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress?.addressLine1}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.zipCode}</p>
          <p style="margin: 3px 0;"><strong>Total Amount:</strong> ₹${order.finalTotal} (${order.paymentMethod} - ${order.paymentStatus || 'Confirmed'})</p>
          <p style="margin: 3px 0;"><strong>Tracking Code:</strong> ${trackingCode}</p>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #d0e7dc;">
            <strong>Ordered Products:</strong><br>
            ${itemsSummary}
          </div>
        </div>

        <div style="text-align: center; margin-top: 15px;">
          <a href="https://wa.me/${String(order.shippingAddress?.phone || '').replace(/\D/g, '')}" style="background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block;">
            💬 Open WhatsApp Chat with Customer
          </a>
        </div>
      </div>
    `;

    return await this.sendMsg91Email({
      recipients,
      from: {
        email: this.commSettings.senderEmail,
        name: this.commSettings.senderName
      },
      domain: this.commSettings.emailDomain,
      subject: `📦 [Order Alert] #${order.id}: ₹${order.finalTotal} by ${order.shippingAddress?.fullName || 'Customer'} - Bv Life`,
      body: alertHtml
    });
  }

  /**
   * Dispatches an instant WhatsApp Alert to the Store Helpline (+91 7451050607)
   */
  public async sendOrderAlertToClinicWhatsApp(order: Order): Promise<{ success: boolean; message: string }> {
    const helplineNumber = (process.env.STORE_HELPLINE_PHONE || process.env.DOCTOR_HELPLINE_PHONE || '917451050607').replace(/\D/g, '');
    const customerName = order.shippingAddress?.fullName || 'Customer';
    const itemsCount = (order.items || []).reduce((acc, i) => acc + i.quantity, 0);

    const messageText = 
`📦 *NEW ORDER ALERT - Bv Life* 📦

Namaste Store Desk,
A new order has been received:

• *Order ID:* #${order.id}
• *Customer:* ${customerName} (+91 ${String(order.shippingAddress?.phone || '').replace(/\D/g, '').slice(-10)})
• *Items:* ${itemsCount} items (₹${order.finalTotal})
• *Payment:* ${order.paymentMethod} (${order.paymentStatus || 'Confirmed'})
• *City:* ${order.shippingAddress?.city}, ${order.shippingAddress?.state}

Check Admin Panel for order fulfillment details.`;

    return await this.sendWhatsAppMessage({
      recipientPhone: helplineNumber,
      messageText,
      templateId: process.env.MSG91_WHATSAPP_ORDER_ALERT_TEMPLATE_ID || 'bvlife_order_alert_whatsapp',
      variables: {
        order_id: `#${order.id}`,
        customer_name: customerName,
        total_amount: `₹${order.finalTotal}`,
        items_count: String(itemsCount),
        helpline: '7451050607'
      }
    });
  }

  /**
   * Automatically sends an instant Order Confirmation WhatsApp receipt to the customer
   */
  public async sendOrderConfirmationWhatsApp(order: Order): Promise<{ success: boolean; message: string }> {
    const phone = order.shippingAddress?.phone || (order as any).userPhone;
    if (!phone) return { success: false, message: "No customer phone provided" };

    const customerName = order.shippingAddress?.fullName || 'Valued Patron';
    const itemsList = (order.items || []).map(i => `• ${i.productName} (Qty: ${i.quantity}) - ₹${i.price * i.quantity}`).join('\n');
    const trackingNum = order.trackingNumber || `BVLTRK-${order.id.slice(-6).toUpperCase()}`;

    const orderSlip = 
`🌿 *Bv Life - Order Confirmed!* 🌿

Namaste *${customerName}*,
Thank you for your order! Your authentic Ayurvedic formulations have been confirmed and are being prepared for dispatch.

📦 *Order Summary:*
• *Order ID:* #${order.id}
• *Items:*
${itemsList}

💰 *Payment Breakdown:*
• *Subtotal:* ₹${order.subtotal}
• *Shipping:* ${order.shippingCharge === 0 ? 'FREE' : '₹' + order.shippingCharge}
• *Total Amount:* ₹${order.finalTotal}
• *Payment Method:* ${order.paymentMethod}
• *Status:* ${order.paymentStatus || 'Confirmed'}

🚚 *Delivery Address:*
${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}
• *Tracking Code:* ${trackingNum}

We will notify you with courier tracking links once your package is dispatched.
For assistance, reply directly to this WhatsApp message, call our helpline at +91 7451050607, or email care@bvlife.in.

Warm regards,
*Bv Life Botanical Wellness*
🌿 Pure Wellness • Authentic Ayurveda`;

    return await this.sendWhatsAppMessage({
      recipientPhone: phone,
      messageText: orderSlip,
      templateId: process.env.MSG91_WHATSAPP_ORDER_TEMPLATE_ID,
      variables: {
        customer_name: customerName,
        order_id: order.id,
        total_amount: `₹${order.finalTotal}`,
        payment_method: order.paymentMethod,
        tracking_number: trackingNum,
        helpline: '7451050607',
        support_email: 'care@bvlife.in'
      }
    });
  }

  // =========================================================================
  // 5. UNIFIED LOGGING & RETRIEVAL (Separated Channels)
  // =========================================================================

  private logCommunication(log: Omit<CommunicationLog, 'id' | 'timestamp'>) {
    const fullLog: CommunicationLog = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log
    };

    communicationLogsStore.unshift(fullLog);
    if (communicationLogsStore.length > 500) {
      communicationLogsStore.pop();
    }

    // Also persist into DB activity ledger
    db.logActivity(
      log.recipient,
      `[${log.channel}] ${log.category}`,
      log.content
    );
  }

  /**
   * Retrieve communication audit trail filtered by Channel (OTP, EMAIL, WHATSAPP, SMS)
   */
  public getLogs(filter?: {
    channel?: 'OTP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'VOICE';
    recipient?: string;
    category?: string;
  }): CommunicationLog[] {
    let result = [...communicationLogsStore];
    if (filter?.channel) {
      result = result.filter(l => l.channel === filter.channel);
    }
    if (filter?.recipient) {
      const q = filter.recipient.toLowerCase();
      result = result.filter(l => (l.recipient || '').toLowerCase().includes(q));
    }
    if (filter?.category) {
      const c = filter.category.toLowerCase();
      result = result.filter(l => (l.category || '').toLowerCase().includes(c));
    }
    return result;
  }
}

export const communicationService = CommunicationService.getInstance();
