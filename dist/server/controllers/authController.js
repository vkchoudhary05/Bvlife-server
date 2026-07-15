import { db } from "../dbManager.js";
import twilio from "twilio";
import { validateAndFormatIndianPhone } from "../utils.js";
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
export const register = (req, res) => {
    const { email, fullName, phone, role, password } = req.body;
    if (!email || !fullName) {
        return res.status(400).json({ error: "Email and Full Name are required." });
    }
    const existingEmail = db.getUserByEmail(email);
    if (existingEmail) {
        return res.status(400).json({ error: "User with this email already exists." });
    }
    // Format and validate the phone number
    const formattedPhone = validateAndFormatIndianPhone(phone) || phone;
    if (phone) {
        const existingPhone = db.getUsers().find(u => {
            const uPhone = u.phone
                ? (validateAndFormatIndianPhone(u.phone) || u.phone)
                : "";
            return uPhone && uPhone === formattedPhone;
        });
        if (existingPhone) {
            return res.status(400).json({ error: "An account with this mobile number already exists." });
        }
    }
    const newUser = {
        email: email.toLowerCase(),
        fullName,
        role: role || "customer",
        phone: formattedPhone || "",
        addresses: [],
        password: password || "password123"
    };
    db.saveUser(newUser);
    db.logActivity(newUser.email, "User Registration", `Created account for ${fullName} with phone ${formattedPhone}`);
    res.json({ message: "Registration successful!", user: newUser, token: newUser.email });
};
export const login = (req, res) => {
    const { email, password } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Email or Phone Number is required." });
    }
    let user = db.getUserByEmail(email);
    if (!user) {
        // Attempt lookup by phone (clean the input format to compare)
        const formattedPhoneInput = validateAndFormatIndianPhone(email);
        user = db.getUsers().find(u => {
            const dbPhone = u.phone
                ? (validateAndFormatIndianPhone(u.phone) || u.phone)
                : "";
            return dbPhone && (dbPhone === email || dbPhone === formattedPhoneInput);
        });
    }
    if (!user) {
        return res.status(401).json({ error: "No account found with this email or mobile number. Please register first." });
    }
    // Support password123 as the fallback for pre-seeded database users without a password field
    const userPassword = user.password || "password123";
    if (password !== userPassword) {
        return res.status(401).json({ error: "Incorrect password. Please verify and try again." });
    }
    db.logActivity(user.email, "User Login", "Logged in successfully.");
    res.json({ user, token: user.email });
};
export const getMe = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    const user = db.getUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ user });
};
export const updateMe = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    const user = db.getUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
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
            // Fallback gracefully to simulated code on Twilio failure or configuration error
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
        // Simulated sandbox flow (No valid Auth Token provided)
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
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
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
