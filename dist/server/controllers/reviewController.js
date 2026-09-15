/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { reviewService } from "../services/reviewService.js";
export const getReviews = (req, res) => {
    try {
        const reviews = reviewService.getReviews();
        res.json(reviews);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch reviews." });
    }
};
export const createReview = (req, res) => {
    try {
        const activeEmail = req.body.userEmail || req.user?.email || "customer@Bvlife.com";
        const activeName = req.body.userName || req.user?.fullName || "Verified Customer";
        const review = reviewService.createReview({
            ...req.body,
            userEmail: activeEmail,
            userName: activeName
        });
        res.json({ message: "Review posted successfully!", review });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to post review." });
    }
};
export const updateReview = (req, res) => {
    try {
        const review = reviewService.updateReview(req.params.id, req.body.isApproved);
        res.json({ message: "Review status updated.", review });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update review." });
    }
};
export const deleteReview = (req, res) => {
    try {
        reviewService.deleteReview(req.params.id);
        res.json({ message: "Review deleted successfully." });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete review." });
    }
};
