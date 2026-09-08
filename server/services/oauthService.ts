/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { hashPassword } from "../passwordUtils.js";
import { generateToken } from "../jwtUtils.js";

export class OAuthService {
  /**
   * Helper to determine base URL
   */
  getBaseUrl(protocol: string, host: string): string {
    if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    return `${protocol}://${host || 'localhost:3000'}`;
  }

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl(baseUrl: string) {
    const redirectUri = `${baseUrl}/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        access_type: 'offline',
        prompt: 'select_account',
      });
      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        configured: true,
        redirectUri
      };
    }

    return {
      url: `${baseUrl}/auth/google/callback?simulated=true`,
      configured: false,
      redirectUri,
      message: "GOOGLE_CLIENT_ID environment variable is not configured."
    };
  }

  /**
   * Handle Google OAuth callback exchange
   */
  async handleGoogleCallback(baseUrl: string, query: { code?: any; simulated?: any; email?: any; name?: any }) {
    const redirectUri = `${baseUrl}/auth/google/callback`;
    const { code, simulated, email: simEmail, name: simName } = query;

    let googleUser = {
      email: '',
      name: '',
      picture: '',
      id: ''
    };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (code && clientId && clientSecret) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Google token exchange failed: ${errText}`);
      }

      const tokenData = (await tokenRes.json()) as any;
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userRes.ok) {
        throw new Error('Failed to fetch user profile from Google UserInfo API');
      }

      const userInfo = (await userRes.json()) as any;
      googleUser = {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture || '',
        id: userInfo.id
      };
    } else if (simulated === 'true' || simEmail) {
      const emailVal = simEmail ? String(simEmail) : 'vkchoudhary050607@gmail.com';
      const nameVal = simName ? String(simName) : 'Vipin Choudhary';
      googleUser = {
        email: emailVal,
        name: nameVal,
        picture: '',
        id: 'google_sim_' + Date.now()
      };
    } else {
      return { needsSetup: true, redirectUri };
    }

    let user = db.getUserByEmail(googleUser.email);
    if (!user) {
      const defaultPass = await hashPassword("google_oauth_user");
      user = {
        email: googleUser.email.toLowerCase(),
        fullName: googleUser.name,
        role: "customer",
        phone: "",
        addresses: [],
        password: defaultPass
      };
      db.saveUser(user);
      db.logActivity(user.email, "Google OAuth Registration", `Created account for ${googleUser.name}`);
    } else {
      db.logActivity(user.email, "Google OAuth Login", `Logged in via Google OAuth`);
    }

    const token = generateToken(user);
    return { needsSetup: false, user, token, googleUser };
  }

  /**
   * Get Facebook OAuth authorization URL
   */
  getFacebookAuthUrl(baseUrl: string) {
    const redirectUri = `${baseUrl}/auth/facebook/callback`;
    const appId = process.env.FACEBOOK_APP_ID;

    if (appId) {
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: 'email,public_profile',
        response_type: 'code',
      });
      return {
        url: `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`,
        configured: true,
        redirectUri
      };
    }

    return {
      url: `${baseUrl}/auth/facebook/callback?simulated=true`,
      configured: false,
      redirectUri,
      message: "FACEBOOK_APP_ID environment variable is not configured."
    };
  }

  /**
   * Handle Facebook OAuth callback exchange
   */
  async handleFacebookCallback(baseUrl: string, query: { code?: any; simulated?: any; email?: any; name?: any }) {
    const redirectUri = `${baseUrl}/auth/facebook/callback`;
    const { code, simulated, email: simEmail, name: simName } = query;

    let fbUser = {
      email: '',
      name: '',
      picture: '',
      id: ''
    };

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (code && appId && appSecret) {
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Facebook token exchange failed: ${errText}`);
      }

      const tokenData = (await tokenRes.json()) as any;
      const meUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`;
      const userRes = await fetch(meUrl);

      if (!userRes.ok) {
        throw new Error('Failed to fetch user profile from Facebook Graph API');
      }

      const userInfo = (await userRes.json()) as any;
      fbUser = {
        email: userInfo.email || `${userInfo.id}@facebook.user`,
        name: userInfo.name || 'Facebook User',
        picture: userInfo.picture?.data?.url || '',
        id: userInfo.id
      };
    } else if (simulated === 'true' || simEmail) {
      const emailVal = simEmail ? String(simEmail) : 'facebook.user@example.com';
      const nameVal = simName ? String(simName) : 'Facebook Seeker';
      fbUser = {
        email: emailVal,
        name: nameVal,
        picture: '',
        id: 'fb_sim_' + Date.now()
      };
    } else {
      return { needsSetup: true, redirectUri };
    }

    let user = db.getUserByEmail(fbUser.email);
    if (!user) {
      const defaultPass = await hashPassword("facebook_oauth_user");
      user = {
        email: fbUser.email.toLowerCase(),
        fullName: fbUser.name,
        role: "customer",
        phone: "",
        addresses: [],
        password: defaultPass
      };
      db.saveUser(user);
      db.logActivity(user.email, "Facebook OAuth Registration", `Created account for ${fbUser.name}`);
    } else {
      db.logActivity(user.email, "Facebook OAuth Login", `Logged in via Facebook OAuth`);
    }

    const token = generateToken(user);
    return { needsSetup: false, user, token, fbUser };
  }
}

export const oauthService = new OAuthService();
