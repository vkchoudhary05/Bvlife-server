import { Router } from 'express';
import { affiliateService } from '../services/affiliateService.js';
import { rateLimiter } from '../middleware/rateLimitMiddleware.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { db } from '../dbManager.js';

export const affiliateRouter = Router();

affiliateRouter.post('/api/affiliate/register', rateLimiter(10), async (req, res) => {
  try { res.status(201).json(await affiliateService.register(req.body)); } catch (err: any) { res.status(err.status || 500).json({ error: err.message || 'Registration failed.' }); }
});
affiliateRouter.post('/api/affiliate/login', rateLimiter(20), async (req, res) => {
  try { res.json(await affiliateService.login(req.body)); } catch (err: any) { res.status(err.status || 500).json({ error: err.message || 'Login failed.' }); }
});
affiliateRouter.get('/api/affiliate/dashboard', authenticateToken, (req: AuthenticatedRequest, res) => {
  try { res.json(affiliateService.dashboard(req.user!.email)); } catch (err: any) { res.status(err.status || 500).json({ error: err.message }); }
});
affiliateRouter.get('/api/affiliate/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  try { res.json({ affiliate: affiliateService.getOwned(req.user!.email) }); } catch (err: any) { res.status(err.status || 500).json({ error: err.message }); }
});
affiliateRouter.put('/api/affiliate/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  try { res.json({ affiliate: affiliateService.updateProfile(req.user!.email, req.body) }); } catch (err: any) { res.status(err.status || 500).json({ error: err.message }); }
});
affiliateRouter.post('/api/affiliate/payout-request', authenticateToken, (req: AuthenticatedRequest, res) => {
  try { res.json({ payout: affiliateService.requestPayout(req.user!.email) }); } catch (err: any) { res.status(err.status || 500).json({ error: err.message }); }
});
affiliateRouter.get('/api/affiliate/marketing', (_req, res) => res.json([]));

affiliateRouter.get('/api/admin/affiliates', authenticateToken, requireAdmin, (_req, res) => res.json(affiliateService.listAdmin()));
affiliateRouter.put('/api/admin/affiliates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json({ affiliate: await affiliateService.updateAdmin(req.params.id, req.body) }); } catch (err: any) { res.status(err.status || 500).json({ error: err.message }); }
});
affiliateRouter.get('/api/admin/affiliate-commissions', authenticateToken, requireAdmin, (_req, res) => res.json(db.getAffiliateCommissions()));
affiliateRouter.put('/api/admin/affiliate-commissions/:id', authenticateToken, requireAdmin, (req, res) => {
  const commission = db.getAffiliateCommissions().find(c => c.id === req.params.id); if (!commission) return res.status(404).json({ error:'Commission not found.' });
  if (!['pending','approved','paid','rejected','cancelled','returned','refunded'].includes(req.body.status)) return res.status(400).json({ error:'Invalid commission status.' });
  commission.status = req.body.status; if (commission.status === 'paid') commission.paidAt = new Date().toISOString(); db.saveAffiliateCommission(commission); res.json({ commission });
});
affiliateRouter.get('/api/admin/affiliate-payouts', authenticateToken, requireAdmin, (_req, res) => res.json(db.getAffiliatePayouts()));
affiliateRouter.put('/api/admin/affiliate-payouts/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  const payout = db.getAffiliatePayouts().find(p => p.id === req.params.id); if (!payout) return res.status(404).json({ error:'Payout not found.' });
  Object.assign(payout, { status: req.body.status || payout.status, paymentMethod: req.body.paymentMethod || payout.paymentMethod, transactionReference: req.body.transactionReference || payout.transactionReference, processedBy:req.user!.email, paidAt:req.body.status === 'paid' ? new Date().toISOString() : payout.paidAt }); db.saveAffiliatePayout(payout);
  if (payout.status === 'paid') payout.commissionIds.forEach(id => { const c = db.getAffiliateCommissions().find(x=>x.id===id); if (c) { c.status='paid'; c.paidAt=payout.paidAt; db.saveAffiliateCommission(c); } }); res.json({ payout });
});
affiliateRouter.get('/api/admin/affiliate-settings', authenticateToken, requireAdmin, (_req, res) => res.json(db.getAffiliateSettings()));
affiliateRouter.put('/api/admin/affiliate-settings', authenticateToken, requireAdmin, (req, res) => { const old = db.getAffiliateSettings(); const settings = { ...old, ...req.body }; res.json(db.saveAffiliateSettings(settings)); });

// Same-origin API endpoint used by Vite during local development. The production
// server also exposes /r/:code below for the shareable public URL.
affiliateRouter.get('/api/affiliate/referral/:code', rateLimiter(60), (req, res) => {
  try {
    const result = affiliateService.trackReferral(req.params.code, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      source: typeof req.query.source === 'string' ? req.query.source : undefined
    });
    res.setHeader('Set-Cookie', affiliateService.referralCookie(result.token, process.env.NODE_ENV === 'production'));
    res.json({ success: true, code: result.affiliate.code, redirectTo: '/' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Unable to apply affiliate referral.' });
  }
});
