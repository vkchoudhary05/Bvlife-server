/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { oauthService } from "../services/oauthService.js";

/**
 * Get Google OAuth Authorization URL
 */
export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = oauthService.getBaseUrl(String(protocol), String(host));

  const result = oauthService.getGoogleAuthUrl(baseUrl);
  res.json(result);
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = async (req: Request, res: Response) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = oauthService.getBaseUrl(String(protocol), String(host));

  try {
    const result = await oauthService.handleGoogleCallback(baseUrl, req.query);

    if (result.needsSetup) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Google OAuth Setup Required</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fdfbf7; color: #1e3a1e;">
          <div style="max-width: 520px; padding: 32px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e8e3d9; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 16px;">🌿</div>
            <h2 style="margin: 0 0 8px; color: #1a331e; font-size: 20px;">Grams Life Google Sign-In</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
              To enable real Google OAuth, configure <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in the project settings.
            </p>
            <div style="background: #f8f6f0; padding: 14px; border-radius: 8px; text-align: left; font-size: 12px; margin-bottom: 20px; border: 1px solid #e0dbce; word-break: break-all;">
              <strong>Authorized Redirect URI:</strong><br/>
              <code>${result.redirectUri}</code>
            </div>
            <a href="/auth/google/callback?simulated=true" style="display: inline-block; padding: 12px 24px; background: #2d5a27; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
              Continue with Simulated Google Login &rarr;
            </a>
          </div>
        </body>
        </html>
      `);
    }

    const { user, token } = result;
    const authPayload = JSON.stringify({
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || ""
      }
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Grams Life - Authenticating...</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fdfbf7;">
        <div style="text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px;">🌿</div>
          <p style="font-size: 16px; color: #2d5a27; font-weight: 600;">Welcome back, ${user.fullName}!</p>
          <p style="font-size: 13px; color: #777;">Redirecting securely to your wellness journey...</p>
        </div>
        <script>
          (function() {
            var payload = ${authPayload};
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', payload: payload }, '*');
              setTimeout(function() { window.close(); }, 500);
            } else {
              localStorage.setItem('token', payload.token);
              localStorage.setItem('user', JSON.stringify(payload.user));
              window.location.href = '/profile';
            }
          })();
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <div style="padding: 30px; font-family: sans-serif; text-align: center;">
        <h3 style="color: #c0392b;">Google Authentication Error</h3>
        <p style="color: #666;">${err.message || 'An unexpected error occurred during Google Sign-In.'}</p>
        <a href="/login" style="color: #2d5a27; font-weight: bold;">Return to Login</a>
      </div>
    `);
  }
};

/**
 * Get Facebook OAuth Authorization URL
 */
export const getFacebookAuthUrl = (req: Request, res: Response) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = oauthService.getBaseUrl(String(protocol), String(host));

  const result = oauthService.getFacebookAuthUrl(baseUrl);
  res.json(result);
};

/**
 * Handle Facebook OAuth callback
 */
export const handleFacebookCallback = async (req: Request, res: Response) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = oauthService.getBaseUrl(String(protocol), String(host));

  try {
    const result = await oauthService.handleFacebookCallback(baseUrl, req.query);

    if (result.needsSetup) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Facebook OAuth Setup Required</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fdfbf7; color: #1e3a1e;">
          <div style="max-width: 520px; padding: 32px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e8e3d9; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 16px;">🌿</div>
            <h2 style="margin: 0 0 8px; color: #1a331e; font-size: 20px;">Grams Life Facebook Sign-In</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
              To enable real Facebook OAuth, configure <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_APP_SECRET</code> in the project settings.
            </p>
            <div style="background: #f8f6f0; padding: 14px; border-radius: 8px; text-align: left; font-size: 12px; margin-bottom: 20px; border: 1px solid #e0dbce; word-break: break-all;">
              <strong>Authorized Redirect URI:</strong><br/>
              <code>${result.redirectUri}</code>
            </div>
            <a href="/auth/facebook/callback?simulated=true" style="display: inline-block; padding: 12px 24px; background: #1877f2; color: white; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
              Continue with Simulated Facebook Login &rarr;
            </a>
          </div>
        </body>
        </html>
      `);
    }

    const { user, token } = result;
    const authPayload = JSON.stringify({
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || ""
      }
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Grams Life - Authenticating with Facebook...</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fdfbf7;">
        <div style="text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px;">🌿</div>
          <p style="font-size: 16px; color: #2d5a27; font-weight: 600;">Welcome, ${user.fullName}!</p>
          <p style="font-size: 13px; color: #777;">Logging in through Facebook secure connection...</p>
        </div>
        <script>
          (function() {
            var payload = ${authPayload};
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', payload: payload }, '*');
              setTimeout(function() { window.close(); }, 500);
            } else {
              localStorage.setItem('token', payload.token);
              localStorage.setItem('user', JSON.stringify(payload.user));
              window.location.href = '/profile';
            }
          })();
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <div style="padding: 30px; font-family: sans-serif; text-align: center;">
        <h3 style="color: #c0392b;">Facebook Authentication Error</h3>
        <p style="color: #666;">${err.message || 'An unexpected error occurred during Facebook Sign-In.'}</p>
        <a href="/login" style="color: #2d5a27; font-weight: bold;">Return to Login</a>
      </div>
    `);
  }
};
