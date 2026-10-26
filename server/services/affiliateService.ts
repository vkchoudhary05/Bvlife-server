import crypto from 'crypto';
import { db } from '../dbManager.js';
import { hashPassword, comparePassword } from '../passwordUtils.js';
import { generateToken } from '../jwtUtils.js';
import { Affiliate, AffiliateCommission, AffiliatePayout, AffiliateUser } from '../types.js';
import { communicationService } from './communicationService.js';

const REFERRAL_COOKIE = 'bvl_affiliate_ref';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const escapeCookie = (value: string) => encodeURIComponent(value);

export class AffiliateService {
  async register(input: any) {
    const email = String(input.email || '').trim().toLowerCase();
    const fullName = String(input.fullName || '').trim();
    const password = String(input.password || '');
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || !input.termsAccepted) {
      throw { status: 400, message: 'Name, valid email, password (6+ characters), and acceptance of terms are required.' };
    }
    if (db.getUserByEmail(email) || db.getAffiliateUserByEmail(email) || db.getAffiliateByEmail(email)) throw { status: 409, message: 'An account with this email already exists.' };
    const user: AffiliateUser = { id: `affu_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, email, fullName, phone: String(input.phone || '').trim(), password: await hashPassword(password), createdAt: new Date().toISOString() };
    const affiliate: Affiliate = {
      id: `aff_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, userEmail: email, fullName, phone: user.phone,
      status: 'pending', commissionRate: db.getAffiliateSettings().defaultCommissionRate,
      instagramUsername: String(input.instagramUsername || '').trim(), instagramProfileUrl: String(input.instagramProfileUrl || '').trim(),
      city: String(input.city || '').trim(), upiId: String(input.upiId || '').trim(), payoutDetails: String(input.bankDetails || '').trim(),
      termsAcceptedAt: new Date().toISOString(), createdAt: new Date().toISOString()
    };
    db.saveAffiliateUser(user); db.saveAffiliate(affiliate); db.logActivity(email, 'Affiliate registration', 'Submitted affiliate application.');
    return { message: 'Application submitted. Your account is pending approval.', affiliate: this.publicAffiliate(affiliate) };
  }

  async login(input: any) {
    const email = String(input.email || '').trim().toLowerCase();
    const user = db.getAffiliateUserByEmail(email);
    const affiliate = db.getAffiliateByEmail(email);
    if (!user || !affiliate || !(await comparePassword(String(input.password || ''), user.password))) throw { status: 401, message: 'Invalid affiliate email or password.' };
    if (affiliate.status === 'pending') throw { status: 403, message: 'Your BV Life Partner application is awaiting approval. We will email you when your account is ready.' };
    if (affiliate.status === 'rejected') throw { status: 403, message: 'This affiliate application was not approved. Please contact BV Life support for assistance.' };
    if (affiliate.status === 'suspended') throw { status: 403, message: 'This affiliate account is currently suspended. Please contact BV Life support.' };
    return { token: generateToken({ ...user, role: 'affiliate' }), user: { email: user.email, fullName: user.fullName, role: 'affiliate', addresses: [] }, affiliate: this.publicAffiliate(affiliate) };
  }

  private baseCode(name: string) { return (name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'BVLIFE').slice(0, 10); }
  generateCode(name: string) {
    const base = this.baseCode(name); let code = base; let index = 1;
    while (db.getAffiliateByCode(code)) { code = `${base.slice(0, Math.max(1, 10 - String(index).length))}${index++}`; }
    return code;
  }
  listAdmin() { return db.getAffiliates().map(a => ({ ...this.publicAffiliate(a), stats: this.stats(a.id) })); }
  publicAffiliate(affiliate: Affiliate) { const { payoutDetails: _bank, upiId: _upi, ...safe } = affiliate; return safe; }
  getOwned(email: string) { const item = db.getAffiliateByEmail(email); if (!item) throw { status: 404, message: 'Affiliate account not found.' }; return item; }
  updateProfile(email: string, input: any) {
    const affiliate = this.getOwned(email);
    ['fullName', 'phone', 'instagramUsername', 'instagramProfileUrl', 'city', 'upiId', 'payoutDetails'].forEach(key => { if (input[key] !== undefined) (affiliate as any)[key] = String(input[key]).trim(); });
    db.saveAffiliate(affiliate); const user = db.getAffiliateUserByEmail(email); if (user) { user.fullName = affiliate.fullName; user.phone = affiliate.phone; db.saveAffiliateUser(user); }
    return this.publicAffiliate(affiliate);
  }
  async updateAdmin(id: string, input: any) {
    const affiliate = db.getAffiliates().find(a => a.id === id); if (!affiliate) throw { status: 404, message: 'Affiliate not found.' };
    const wasActive = affiliate.status === 'active';
    if (input.status !== undefined) {
      if (!['pending','active','suspended','rejected'].includes(input.status)) throw { status: 400, message: 'Invalid status.' };
      affiliate.status = input.status;
      if (affiliate.status === 'active' && !affiliate.code) affiliate.code = this.generateCode(affiliate.fullName);
    }
    if (input.code !== undefined) {
      const code = String(input.code).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
      const used = db.getAffiliateByCode(code); if (!code || (used && used.id !== affiliate.id)) throw { status: 409, message: 'Affiliate code is already in use.' }; affiliate.code = code;
    }
    if (input.commissionRate !== undefined) { const rate = Number(input.commissionRate); if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw { status: 400, message: 'Commission must be between 0 and 100.' }; affiliate.commissionRate = rate; }
    db.saveAffiliate(affiliate);
    if (!wasActive && affiliate.status === 'active') {
      const portalUrl = `${process.env.PUBLIC_SITE_URL || 'https://bvlife.in'}/affiliate/login`;
      const result = await communicationService.sendMsg91Email({
        recipients: [{ to: [{ email: affiliate.userEmail, name: affiliate.fullName }] }],
        subject: 'Your BV Life Partner application has been approved',
        body: `<div style="max-width:600px;margin:auto;padding:32px;background:#f9f7f2;font-family:Arial,sans-serif;color:#143326"><div style="padding:24px;background:#143326;border-radius:18px;color:#fff"><p style="margin:0;color:#dfc593;font-size:11px;letter-spacing:2px;font-weight:bold">BV LIFE PARTNERS</p><h1 style="margin:10px 0 0;font-size:28px">You are approved!</h1></div><div style="padding:24px;background:#fff;border-radius:18px;margin-top:16px"><p>Namaste ${affiliate.fullName},</p><p>Your BV Life Partner application has been approved. Your personal referral link and commission dashboard are ready.</p><p style="margin:24px 0"><a href="${portalUrl}" style="display:inline-block;background:#1b4332;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Open partner portal</a></p><p style="font-size:13px;color:#5a6355">Sign in with the email and password used for your application. Questions? Reply to this email and our team will help.</p></div></div>`
      });
      db.logActivity(affiliate.userEmail, 'Affiliate approved', `Partner application approved. Approval email ${result.success ? 'sent' : 'could not be sent'}.`);
    }
    return this.publicAffiliate(affiliate);
  }
  trackReferral(rawCode: string, request: { ip?: string; userAgent?: string; source?: string }) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) {
      throw { status: 404, message: 'Affiliate link is invalid.' };
    }

    const affiliate = db.getAffiliateByCode(code);
    if (!affiliate || affiliate.status !== 'active' || !affiliate.code) {
      throw { status: 404, message: 'This affiliate link is inactive or unavailable.' };
    }

    const visitorHash = crypto
      .createHash('sha256')
      .update(`${request.ip || ''}|${request.userAgent || ''}|${new Date().toISOString().slice(0, 10)}`)
      .digest('hex')
      .slice(0, 32);
    const settings = db.getAffiliateSettings();
    const prior = db.getAffiliateClicks().find(c => c.affiliateId === affiliate.id && c.visitorHash === visitorHash && Date.now() - new Date(c.createdAt).getTime() < 60_000);
    const click = prior || db.saveAffiliateClick({
      id: `acl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      createdAt: new Date().toISOString(),
      visitorHash,
      source: request.source || 'referral_link'
    });

    // Signed compact payload prevents clients from substituting another code.
    const payload = `${affiliate.id}.${affiliate.code}.${click.id}.${Date.now()}`;
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'local-dev').update(payload).digest('base64url');
    return { affiliate, click, token: `${payload}.${signature}` };
  }

  referralCookie(token: string, secure: boolean) {
    return `${REFERRAL_COOKIE}=${escapeCookie(token)}; Max-Age=${db.getAffiliateSettings().cookieDays * 86400 || MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  }
  resolveReferral(cookieHeader?: string) {
    const raw = cookieHeader?.split(';').map(v => v.trim()).find(v => v.startsWith(`${REFERRAL_COOKIE}=`))?.slice(`${REFERRAL_COOKIE}=`.length);
    if (!raw) return null;
    const value = decodeURIComponent(raw); const parts = value.split('.'); if (parts.length < 5) return null;
    const signature = parts.pop()!; const payload = parts.join('.'); const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'local-dev').update(payload).digest('base64url');
    if (signature !== expected) return null;
    const [affiliateId, code, clickId, timestamp] = parts; if (Date.now() - Number(timestamp) > db.getAffiliateSettings().cookieDays * 86400_000) return null;
    const affiliate = db.getAffiliateByCode(code); return affiliate?.id === affiliateId && affiliate.status === 'active' ? { affiliate, clickId } : null;
  }
  createCommission(order: any, referral: { affiliate: Affiliate; clickId: string } | null) {
    if (!referral || order.userEmail.toLowerCase() === referral.affiliate.userEmail.toLowerCase()) return null;
    const eligibleValue = Math.max(0, Number(order.subtotal) - Number(order.discount)); const amount = Number((eligibleValue * referral.affiliate.commissionRate / 100).toFixed(2));
    const commission: AffiliateCommission = { id: `acm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, affiliateId: referral.affiliate.id, affiliateCode: referral.affiliate.code || '', orderId: order.id, orderTotal: order.finalTotal, eligibleValue, commissionRate: referral.affiliate.commissionRate, amount, status: 'pending', createdAt: new Date().toISOString() };
    db.saveAffiliateCommission(commission);
    Object.assign(order, { affiliateId: referral.affiliate.id, affiliateCode: referral.affiliate.code, referralSource: 'affiliate_referral', referralClickId: referral.clickId, commissionRate: commission.commissionRate, commissionAmount: commission.amount, affiliateCommissionStatus: commission.status });
    return commission;
  }
  syncOrderCommission(order: any) {
    const commission = db.getAffiliateCommissions().find(c => c.orderId === order.id); if (!commission) return;
    const map: any = { Cancelled: 'cancelled', Returned: 'returned' }; if (map[order.status]) { commission.status = map[order.status]; order.affiliateCommissionStatus = commission.status; db.saveAffiliateCommission(commission); }
  }
  stats(affiliateId: string) { const clicks = db.getAffiliateClicks().filter(c => c.affiliateId === affiliateId); const commissions = db.getAffiliateCommissions().filter(c => c.affiliateId === affiliateId); const orders = commissions.length; const totalSales = commissions.reduce((sum, c) => sum + c.orderTotal, 0); const by = (statuses: string[]) => commissions.filter(c => statuses.includes(c.status)).reduce((sum,c) => sum + c.amount, 0); return { clicks: clicks.length, uniqueVisitors: new Set(clicks.map(c => c.visitorHash)).size, orders, totalSales, conversionRate: clicks.length ? Number((orders / clicks.length * 100).toFixed(2)) : 0, earned: by(['pending','approved','paid']), pending: by(['pending']), approved: by(['approved']), paid: by(['paid']) }; }
  dashboard(email: string) { const affiliate = this.getOwned(email); const commissions = db.getAffiliateCommissions().filter(c => c.affiliateId === affiliate.id); const orders = db.getOrders().filter(o => o.affiliateId === affiliate.id).map(o => ({ id:o.id, orderDate:o.orderDate, finalTotal:o.finalTotal, status:o.status, commission: commissions.find(c => c.orderId === o.id) })); return { affiliate: this.publicAffiliate(affiliate), stats: this.stats(affiliate.id), orders, commissions, settings: db.getAffiliateSettings(), payouts: db.getAffiliatePayouts().filter(p => p.affiliateId === affiliate.id) }; }
  requestPayout(email: string) { const affiliate = this.getOwned(email); const approved = db.getAffiliateCommissions().filter(c => c.affiliateId === affiliate.id && c.status === 'approved'); const amount = approved.reduce((s,c) => s+c.amount,0); if (amount < db.getAffiliateSettings().minimumPayout) throw { status:400, message:'Approved balance is below the minimum payout.' }; const payout: AffiliatePayout = { id:`apo_${Date.now()}`, affiliateId: affiliate.id, amount, status:'requested', requestedAt:new Date().toISOString(), commissionIds:approved.map(c=>c.id) }; db.saveAffiliatePayout(payout); return payout; }
}

export const affiliateService = new AffiliateService();
