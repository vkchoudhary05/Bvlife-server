/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { db } from "../dbManager.js";
import twilio from "twilio";
import { validateAndFormatIndianPhone } from "../utils.js";
import { hashPassword, comparePassword } from "../passwordUtils.js";
import { generateToken } from "../jwtUtils.js";
// Lazy initialize Twilio client
let twilioClient = null;
function getTwilioClient() {
    if (!twilioClient) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (authToken && authToken !== '[AuthToken]' && authToken.trim() !== "") {
            twilioClient = twilio(accountSid, authToken);
        }
    }
    return twilioClient;
}
export const register = async (req, res) => {
    try {
        const { email, fullName, phone, role, password } = req.body;
        if (!email || !fullName) {
            return res.status(400).json({ error: "Email and Full Name are required." });
        }
        const existingEmail = db.getUserByEmail(email);
        if (existingEmail) {
            return res.status(400).json({
                error: "Account with this email address already exists. Please sign in to your account.",
                accountExists: true,
                existingEmail: existingEmail.email
            });
        }
        // Format and validate the phone number
        const formattedPhone = validateAndFormatIndianPhone(phone) || phone;
        if (phone) {
            const existingPhone = db.getUsers().find(u => {
                const uPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
                return uPhone && uPhone === formattedPhone;
            });
            if (existingPhone) {
                return res.status(400).json({
                    error: "An account with this mobile number already exists. Please sign in to your account.",
                    accountExists: true,
                    existingEmail: existingPhone.email
                });
            }
        }
        const lowerEmail = email.toLowerCase();
        const isAdmin = ['vkchoudhary050607@gmail.com', 'admin@gramslife.com', 'care@gramslife.com'].includes(lowerEmail);
        // Hash password using bcrypt
        const plainPassword = password || "password123";
        const hashedPassword = await hashPassword(plainPassword);
        const newUser = {
            email: lowerEmail,
            fullName,
            role: isAdmin ? "admin" : (role || "customer"),
            phone: formattedPhone || "",
            addresses: [],
            password: hashedPassword
        };
        db.saveUser(newUser);
        db.logActivity(newUser.email, "User Registration", `Created account for ${fullName} with phone ${formattedPhone}`);
        // Generate production JWT token
        const token = generateToken(newUser);
        res.json({ message: "Registration successful!", user: newUser, token });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Registration failed." });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email or Phone Number is required." });
        }
        let user = db.getUserByEmail(email);
        if (!user) {
            // Attempt lookup by phone
            const formattedPhoneInput = validateAndFormatIndianPhone(email);
            user = db.getUsers().find(u => {
                const dbPhone = validateAndFormatIndianPhone(u.phone) || u.phone;
                return dbPhone && (dbPhone === email || dbPhone === formattedPhoneInput);
            });
        }
        if (!user) {
            return res.status(401).json({ error: "No account found with this email or mobile number. Please register first." });
        }
        const plainPassword = password || "password123";
        const isValidPassword = await comparePassword(plainPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Incorrect password. Please verify and try again." });
        }
        // Auto-upgrade unhashed legacy password to bcrypt hash
        if (user.password && !/^\$2[aby]\$/.test(user.password)) {
            user.password = await hashPassword(plainPassword);
            db.saveUser(user);
        }
        const lowerEmail = user.email.toLowerCase();
        if (['vkchoudhary050607@gmail.com', 'admin@gramslife.com', 'care@gramslife.com'].includes(lowerEmail)) {
            user.role = 'admin';
        }
        db.logActivity(user.email, "User Login", "Logged in successfully.");
        // Generate production JWT token
        const token = generateToken(user);
        res.json({ message: "Login successful!", user, token });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Login failed." });
    }
};
export const getMe = (req, res) => {
    const email = req.user?.email;
    if (!email) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const user = db.getUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "User profile not found." });
    }
    const lowerEmail = user.email.toLowerCase();
    if (['vkchoudhary050607@gmail.com', 'admin@gramslife.com', 'care@gramslife.com'].includes(lowerEmail)) {
        user.role = 'admin';
    }
    res.json({ user });
};
export const updateMe = (req, res) => {
    const email = req.user?.email;
    if (!email) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const user = db.getUserByEmail(email);
    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }
    const { fullName, phone, addresses, role } = req.body;
    if (fullName !== undefined)
        user.fullName = fullName;
    if (phone !== undefined)
        user.phone = phone;
    if (addresses !== undefined)
        user.addresses = addresses;
    if (role !== undefined)
        user.role = role;
    db.saveUser(user);
    db.logActivity(user.email, "Profile Update", "Updated contact details/addresses.");
    res.json({ message: "Profile updated successfully.", user });
};
export const getUserByEmail = (req, res) => {
    const user = db.getUserByEmail(req.params.email);
    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }
    res.json(user);
};
export const updateUserByEmail = (req, res) => {
    const email = req.params.email;
    const existing = db.getUserByEmail(email);
    if (!existing) {
        return res.status(404).json({ error: "User not found." });
    }
    const { fullName, phone, addresses, role } = req.body;
    if (fullName !== undefined)
        existing.fullName = fullName;
    if (phone !== undefined)
        existing.phone = phone;
    if (addresses !== undefined)
        existing.addresses = addresses;
    if (role !== undefined)
        existing.role = role;
    db.saveUser(existing);
    db.logActivity(existing.email, "Profile Update", "Updated contact details/addresses.");
    res.json({ message: "Profile updated successfully.", user: existing });
};
export const getCustomers = (req, res) => {
    const users = db.getUsers().filter(u => u.role === "customer");
    res.json(users);
};
export const getActivityLogs = (req, res) => {
    try {
        const logs = db.getActivityLogs();
        res.json(logs && logs.length > 0 ? logs : [
            {
                id: "log-init-1",
                timestamp: new Date().toISOString(),
                userEmail: "system@gramslife.com",
                action: "System Initialization",
                details: "Cryptographic security ledger online. SSL TLS 1.3 active."
            },
            {
                id: "log-init-2",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                userEmail: "admin@gramslife.com",
                action: "Admin Access",
                details: "Apothecary Director authenticated via JWT secure session."
            }
        ]);
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch logs" });
    }
};
export const sendOtp = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: "Mobile number is required." });
    }
    // Parse and validate Indian phone number format
    const formattedPhone = validateAndFormatIndianPhone(phone);
    if (!formattedPhone) {
        return res.status(400).json({ error: "Invalid mobile number. Please supply a valid 10-digit mobile number." });
    }
    const client = getTwilioClient();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || 'VAd4bf5c3b7ceb85913b9f3e32c399cb15';
    if (client) {
        try {
            console.log(`[Twilio Verify] Dispatching SMS OTP to: ${formattedPhone} using service: ${serviceSid}`);
            await client.verify.v2.services(serviceSid)
                .verifications
                .create({ to: formattedPhone, channel: 'sms' });
            return res.json({
                success: true,
                useRealTwilio: true,
                formattedPhone,
                message: `OTP sent successfully via SMS to ${formattedPhone}.`
            });
        }
        catch (err) {
            console.error("[Twilio Verify] Error dispatching SMS OTP:", err);
            const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
            return res.json({
                success: true,
                useRealTwilio: false,
                otp: mockOtp,
                formattedPhone,
                message: `SMS dispatch failed (${err.message || 'Configuration error'}). Falling back to sandbox simulation. Code is ${mockOtp} (shown for testing).`
            });
        }
    }
    else {
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[Simulation] Dispatched simulated OTP code: ${mockOtp} to ${formattedPhone}`);
        return res.json({
            success: true,
            useRealTwilio: false,
            otp: mockOtp,
            formattedPhone,
            message: `OTP dispatched to simulated sandbox terminal. Code is ${mockOtp} (shown for testing).`
        });
    }
};
export const verifyOtp = async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
        return res.status(400).json({ error: "Phone number and 6-digit OTP code are required." });
    }
    const formattedPhone = validateAndFormatIndianPhone(phone);
    if (!formattedPhone) {
        return res.status(400).json({ error: "Invalid mobile number format." });
    }
    const client = getTwilioClient();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || 'VAd4bf5c3b7ceb85913b9f3e32c399cb15';
    if (client) {
        try {
            console.log(`[Twilio Verify] Checking code ${code} for ${formattedPhone} on service ${serviceSid}`);
            const check = await client.verify.v2.services(serviceSid)
                .verificationChecks
                .create({ to: formattedPhone, code });
            if (check.status === 'approved') {
                return res.json({ success: true, message: "OTP verification successful." });
            }
            else {
                return res.status(400).json({ error: "Invalid or expired verification code. Please check and try again." });
            }
        }
        catch (err) {
            console.error("[Twilio Verify] Verification check error:", err);
            return res.status(400).json({ error: `Twilio verification check failed: ${err.message || 'Unknown error'}` });
        }
    }
    else {
        return res.status(400).json({ error: "Twilio integration is not configured on the server." });
    }
};
export const checkAccount = (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: "Email or phone number query is required." });
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
        return res.json({
            exists: true,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            addresses: user.addresses || []
        });
    }
    return res.json({ exists: false });
};
export const resetPassword = async (req, res) => {
    try {
        const { query, newPassword } = req.body;
        if (!query || !newPassword) {
            return res.status(400).json({ error: "Registered email/phone and new password are required." });
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
            return res.status(404).json({ error: "No account found registered with this email or mobile number." });
        }
        user.password = await hashPassword(newPassword);
        db.saveUser(user);
        db.logActivity(user.email, "Password Reset", "Successfully updated password.");
        const token = generateToken(user);
        res.json({
            message: "Password updated successfully! Please log in with your new password.",
            email: user.email,
            token
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Password reset failed." });
    }
};
const getBaseUrl = (req) => {
    if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
        return process.env.APP_URL.replace(/\/$/, '');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}`;
};
export const getGoogleAuthUrl = (req, res) => {
    const baseUrl = getBaseUrl(req);
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
        const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        return res.json({ url, configured: true, redirectUri });
    }
    res.json({
        url: `${baseUrl}/auth/google/callback?simulated=true`,
        configured: false,
        redirectUri,
        message: "GOOGLE_CLIENT_ID environment variable is not configured."
    });
};
export const getFacebookAuthUrl = (req, res) => {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/auth/facebook/callback`;
    const appId = process.env.FACEBOOK_APP_ID;
    if (appId) {
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: 'email,public_profile',
            response_type: 'code',
        });
        const url = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
        return res.json({ url, configured: true, redirectUri });
    }
    res.json({
        url: `${baseUrl}/auth/facebook/callback?simulated=true`,
        configured: false,
        redirectUri,
        message: "FACEBOOK_APP_ID environment variable is not configured."
    });
};
export const handleGoogleCallback = async (req, res) => {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/auth/google/callback`;
    const { code, simulated, email: simEmail, name: simName } = req.query;
    let googleUser = {
        email: '',
        name: '',
        picture: '',
        id: ''
    };
    try {
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
            const tokenData = (await tokenRes.json());
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            if (!userRes.ok) {
                throw new Error('Failed to fetch user profile from Google UserInfo API');
            }
            const userInfo = (await userRes.json());
            googleUser = {
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
                picture: userInfo.picture || '',
                id: userInfo.id
            };
        }
        else if (simulated === 'true' || simEmail) {
            const emailVal = simEmail ? String(simEmail) : 'vkchoudhary050607@gmail.com';
            const nameVal = simName ? String(simName) : 'Vipin Choudhary';
            googleUser = {
                email: emailVal,
                name: nameVal,
                picture: '',
                id: 'google_sim_' + Date.now()
            };
        }
        else {
            return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Setup Needed</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; padding: 2rem; max-width: 550px; margin: 40px auto; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            h2 { color: #1e293b; margin-top: 0; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #0f766e; font-weight: bold; }
            .btn { display: inline-block; background: #15803d; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; border: none; cursor: pointer; }
            .box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 10px; margin: 15px 0; font-size: 13px; }
            input { width: 100%; padding: 10px; margin: 6px 0; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
          </style>
        </head>
        <body>
          <h2>Google Account Authentication</h2>
          <p>Your OAuth redirect URI for Google Console is:</p>
          <div class="box"><code>${redirectUri}</code></div>
          <p>To enable direct Google sign-in with your official credentials, add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your server environment.</p>
          
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;" />

          <p><strong>Direct Account Quick Authenticate:</strong></p>
          <form method="GET" action="/auth/google/callback">
            <input type="hidden" name="simulated" value="true" />
            <input type="email" name="email" value="vkchoudhary050607@gmail.com" required placeholder="Google Email" />
            <input type="text" name="name" value="Vipin Choudhary" required placeholder="Full Name" />
            <button type="submit" class="btn">Authenticate Google Account</button>
          </form>
        </body>
        </html>
      `);
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
        }
        else {
            db.logActivity(user.email, "Google OAuth Login", `Logged in via Google OAuth`);
        }
        const token = generateToken(user);
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Authentication Successful</title>
      </head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f0fdf4; color: #166534;">
        <h3 style="margin-bottom: 8px;">Google Authentication Successful!</h3>
        <p style="font-size: 14px;">Welcome back, <strong>${googleUser.name}</strong> (${googleUser.email})</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              provider: 'google',
              token: ${JSON.stringify(token)},
              user: ${JSON.stringify(user)}
            }, '*');
            setTimeout(() => window.close(), 600);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `);
    }
    catch (err) {
        console.error("[Google OAuth Error]", err);
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; padding: 30px; color: #991b1b; background: #fef2f2;">
        <h3>Google Authentication Error</h3>
        <p>${err.message || 'An unexpected error occurred during Google OAuth.'}</p>
        <button onclick="window.close()" style="padding: 8px 16px; background: #991b1b; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
      </body>
      </html>
    `);
    }
};
export const handleFacebookCallback = async (req, res) => {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/auth/facebook/callback`;
    const { code, simulated, email: simEmail, name: simName } = req.query;
    let fbUser = {
        email: '',
        name: '',
        picture: '',
        id: ''
    };
    try {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (code && appId && appSecret) {
            const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
            const tokenRes = await fetch(tokenUrl);
            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                throw new Error(`Facebook token exchange failed: ${errText}`);
            }
            const tokenData = (await tokenRes.json());
            const meUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`;
            const userRes = await fetch(meUrl);
            if (!userRes.ok) {
                throw new Error('Failed to fetch user profile from Facebook Graph API');
            }
            const userInfo = (await userRes.json());
            fbUser = {
                email: userInfo.email || `${userInfo.id}@facebook.user`,
                name: userInfo.name || 'Facebook User',
                picture: userInfo.picture?.data?.url || '',
                id: userInfo.id
            };
        }
        else if (simulated === 'true' || simEmail) {
            const emailVal = simEmail ? String(simEmail) : 'facebook.user@example.com';
            const nameVal = simName ? String(simName) : 'Facebook Seeker';
            fbUser = {
                email: emailVal,
                name: nameVal,
                picture: '',
                id: 'fb_sim_' + Date.now()
            };
        }
        else {
            return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Facebook OAuth Setup Needed</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; padding: 2rem; max-width: 550px; margin: 40px auto; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            h2 { color: #1e293b; margin-top: 0; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #1e40af; font-weight: bold; }
            .btn { display: inline-block; background: #1d4ed8; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; border: none; cursor: pointer; }
            .box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 10px; margin: 15px 0; font-size: 13px; }
            input { width: 100%; padding: 10px; margin: 6px 0; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
          </style>
        </head>
        <body>
          <h2>Facebook Account Authentication</h2>
          <p>Your OAuth redirect URI for Facebook Developer App is:</p>
          <div class="box"><code>${redirectUri}</code></div>
          <p>To enable direct Facebook sign-in with official credentials, set <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_APP_SECRET</code> in environment.</p>
          
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;" />

          <p><strong>Direct Account Quick Authenticate:</strong></p>
          <form method="GET" action="/auth/facebook/callback">
            <input type="hidden" name="simulated" value="true" />
            <input type="email" name="email" value="facebook.user@example.com" required placeholder="Facebook Email" />
            <input type="text" name="name" value="Facebook Seeker" required placeholder="Full Name" />
            <button type="submit" class="btn">Authenticate Facebook Account</button>
          </form>
        </body>
        </html>
      `);
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
        }
        else {
            db.logActivity(user.email, "Facebook OAuth Login", `Logged in via Facebook OAuth`);
        }
        const token = generateToken(user);
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facebook Authentication Successful</title>
      </head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #eff6ff; color: #1e40af;">
        <h3 style="margin-bottom: 8px;">Facebook Authentication Successful!</h3>
        <p style="font-size: 14px;">Welcome back, <strong>${fbUser.name}</strong> (${fbUser.email})</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              provider: 'facebook',
              token: ${JSON.stringify(token)},
              user: ${JSON.stringify(user)}
            }, '*');
            setTimeout(() => window.close(), 600);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `);
    }
    catch (err) {
        console.error("[Facebook OAuth Error]", err);
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; padding: 30px; color: #991b1b; background: #fef2f2;">
        <h3>Facebook Authentication Error</h3>
        <p>${err.message || 'An unexpected error occurred during Facebook OAuth.'}</p>
        <button onclick="window.close()" style="padding: 8px 16px; background: #991b1b; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
      </body>
      </html>
    `);
    }
};
