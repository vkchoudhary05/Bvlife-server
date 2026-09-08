/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { aiService } from "../services/aiService.js";
/**
 * Ayurvedic Consultation generator
 */
export const consult = async (req, res) => {
    try {
        const result = await aiService.consult(req.body);
        res.json(result);
    }
    catch (error) {
        console.error("Consultation error:", error);
        res.status(error.status || 500).json({ error: error.message || "Our digital Guide is meditating. Please try again in a few moments." });
    }
};
/**
 * Interactive Conversational AI Chat
 */
export const chat = async (req, res) => {
    try {
        const { messages, lang } = req.body;
        const authHeader = req.headers.authorization;
        let userEmail = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            userEmail = authHeader.split(" ")[1]?.toLowerCase();
        }
        const result = await aiService.chat(messages, lang, userEmail);
        res.json(result);
    }
    catch (error) {
        console.error("Gemini Chat API call failed:", error);
        res.status(error.status || 500).json({ error: error.message || "Our BV Life Guide is currently silent in deep meditation. Please check back shortly." });
    }
};
/**
 * Get chat history for user
 */
export const getHistory = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    const messages = aiService.getChatHistory(email);
    res.json({ messages });
};
/**
 * Clear chat history for user
 */
export const clearHistory = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    aiService.clearChatHistory(email);
    res.json({ message: "Chat history cleared successfully." });
};
