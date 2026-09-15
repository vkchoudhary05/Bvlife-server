/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { reviewService } from "../services/reviewService.js";

export const getReviews = (req: Request, res: Response) => {
  try {
    const reviews = reviewService.getReviews();
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

export const createReview = (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeEmail = req.body.userEmail || req.user?.email || "customer@Bvlife.com";
    const activeName = req.body.userName || req.user?.fullName || "Verified Customer";
    const review = reviewService.createReview({
      ...req.body,
      userEmail: activeEmail,
      userName: activeName
    });
    res.json({ message: "Review posted successfully!", review });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to post review." });
  }
};

export const updateReview = (req: Request, res: Response) => {
  try {
    const review = reviewService.updateReview(req.params.id, req.body.isApproved);
    res.json({ message: "Review status updated.", review });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update review." });
  }
};

export const deleteReview = (req: Request, res: Response) => {
  try {
    reviewService.deleteReview(req.params.id);
    res.json({ message: "Review deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete review." });
  }
};
