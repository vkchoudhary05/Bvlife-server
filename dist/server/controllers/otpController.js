/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { otpService } from "../services/otpService.js";
/**
 * Dispatch verification OTP
 */
export const sendOtp = async (req, res) => {
    const { phone, identifier, purpose, channel } = req.body;
    const target = phone || identifier;
    try {
        const result = await otpService.sendOtp({
            identifier: target,
            purpose,
            channel
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({
            success: false,
            error: err.message || "Failed to dispatch verification code."
        });
    }
};
/**
 * Verify verification OTP or MSG91 token
 */
export const verifyOtp = async (req, res) => {
    const { phone, identifier, code, reqId, accessToken, jwtToken } = req.body;
    const widgetToken = accessToken || jwtToken;
    if (widgetToken) {
        return verifyMsg91Token(req, res);
    }
    const target = phone || identifier;
    try {
        const result = await otpService.verifyOtp({ identifier: target, code, reqId });
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "OTP verification failed." });
    }
};
/**
 * Verify MSG91 Widget Access Token
 */
export const verifyMsg91Token = async (req, res) => {
    const { accessToken, jwtToken, token } = req.body;
    const tokenToVerify = (accessToken || jwtToken || token || '').trim();
    try {
        const result = await otpService.verifyMsg91Token(tokenToVerify, req.body.authKey);
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 400).json({ error: err.message || "Token verification failed.", ...err });
    }
};
/**
 * Get MSG91 Widget Configuration
 */
export const getMsg91Config = (req, res) => {
    res.json({
        widgetId: process.env.MSG91_WIDGET_ID || "366745687850303433373438",
        tokenAuth: process.env.MSG91_TOKEN_AUTH || "555226TgzLN8cZ6a698ec8P1",
        exposeMethods: true
    });
};
/**
 * Unified OTP Login
 */
export const otpLogin = async (req, res) => {
    try {
        const result = await otpService.otpLogin(req.body);
        return res.json(result);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "OTP Login failed." });
    }
};
/**
 * Change mobile number with OTP
 */
export const changeMobile = async (req, res) => {
    try {
        const email = req.user?.email;
        if (!email)
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        const user = await otpService.changeMobile(email, req.body);
        return res.json({ message: "Mobile number updated successfully!", user });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update mobile number." });
    }
};
/**
 * Change email address with OTP
 */
export const changeEmail = async (req, res) => {
    try {
        const currentEmail = req.user?.email;
        if (!currentEmail)
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        const { user, token } = await otpService.changeEmail(currentEmail, req.body);
        return res.json({ message: "Email address updated successfully!", user, token });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to update email address." });
    }
};
