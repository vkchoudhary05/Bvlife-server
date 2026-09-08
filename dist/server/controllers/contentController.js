/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { contentService } from "../services/contentService.js";
// Blogs
export const getBlogs = (req, res) => {
    try {
        res.json(contentService.getBlogs());
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch blogs." });
    }
};
export const createBlog = (req, res) => {
    try {
        const blog = contentService.createBlog(req.body);
        res.json({ message: "Blog published successfully.", blog });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to create blog." });
    }
};
export const deleteBlog = (req, res) => {
    try {
        contentService.deleteBlog(req.params.id);
        res.json({ message: "Blog deleted." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete blog." });
    }
};
// FAQs
export const getFAQs = (req, res) => {
    try {
        res.json(contentService.getFAQs());
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch FAQs." });
    }
};
export const createFAQ = (req, res) => {
    try {
        const faq = contentService.createFAQ(req.body);
        res.json({ message: "FAQ saved.", faq });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to create FAQ." });
    }
};
export const deleteFAQ = (req, res) => {
    try {
        contentService.deleteFAQ(req.params.id);
        res.json({ message: "FAQ deleted." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete FAQ." });
    }
};
// Settings
export const getSettings = (req, res) => {
    try {
        res.json(contentService.getSettings());
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch settings." });
    }
};
export const updateSettings = (req, res) => {
    try {
        const updated = contentService.updateSettings(req.body);
        res.json({ message: "Settings updated successfully.", settings: updated });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update settings." });
    }
};
// Activity Logs
export const getActivityLogs = (req, res) => {
    try {
        res.json(contentService.getActivityLogs());
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch activity logs." });
    }
};
