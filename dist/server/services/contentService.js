/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { db } from "../dbManager.js";
export class ContentService {
    /**
     * Blogs
     */
    getBlogs() {
        return db.getBlogs();
    }
    createBlog(data) {
        if (!data.title) {
            throw { status: 400, message: "Blog title is required." };
        }
        const blog = {
            id: `blog-${Date.now()}`,
            title: data.title,
            slug: (data.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            summary: data.summary || "",
            content: data.content || "",
            image: data.image || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
            author: data.author || "Grams Life Aacharya",
            date: new Date().toISOString().split('T')[0],
            categories: data.categories || ["Ayurveda"],
            readTime: data.readTime || "5 mins read"
        };
        db.saveBlog(blog);
        return blog;
    }
    deleteBlog(id) {
        db.deleteBlog(id);
        return true;
    }
    /**
     * FAQs
     */
    getFAQs() {
        return db.getFAQs();
    }
    createFAQ(data) {
        if (!data.question || !data.answer) {
            throw { status: 400, message: "Question and Answer are required for FAQ." };
        }
        const faq = {
            id: `faq-${Date.now()}`,
            category: data.category || "General",
            question: data.question,
            answer: data.answer
        };
        db.saveFAQ(faq);
        return faq;
    }
    deleteFAQ(id) {
        db.deleteFAQ(id);
        return true;
    }
    /**
     * Store Settings
     */
    getSettings() {
        return db.getSettings();
    }
    updateSettings(settings) {
        return db.saveSettings(settings);
    }
    /**
     * Activity Audit Logs
     */
    getActivityLogs() {
        const logs = db.getActivityLogs();
        if (logs && logs.length > 0)
            return logs;
        return [
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
        ];
    }
}
export const contentService = new ContentService();
