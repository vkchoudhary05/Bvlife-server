/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { Review } from "../types.js";

export class ReviewService {
  /**
   * Get all product reviews
   */
  getReviews() {
    return db.getReviews();
  }

  /**
   * Post a new review and update product average rating
   */
  createReview(params: {
    productId: string;
    productName?: string;
    userName?: string;
    userEmail?: string;
    rating: number;
    comment?: string;
  }) {
    const { productId, productName, userName, userEmail, rating, comment } = params;
    if (!productId || !rating) {
      throw { status: 400, message: "Product ID and Rating are required." };
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId,
      productName: productName || "Ayurvedic Product",
      userName: userName || "Verified Customer",
      userEmail: (userEmail || "customer@gramslife.com").toLowerCase(),
      rating: Number(rating),
      comment: comment || "",
      isApproved: true,
      date: new Date().toISOString().split('T')[0]
    };

    db.saveReview(newReview);

    // Recalculate average product rating
    const prod = db.getProductById(productId);
    if (prod) {
      const allProdReviews = db.getReviews().filter(r => r.productId === productId && r.isApproved);
      const totalRating = allProdReviews.reduce((sum, r) => sum + r.rating, 0);
      prod.rating = Number((totalRating / allProdReviews.length).toFixed(1)) || Number(rating);
      db.saveProduct(prod);
    }

    db.logActivity(newReview.userEmail, "Add Product Review", `Reviewed ${productName || productId} with ${rating} stars`);
    return newReview;
  }

  /**
   * Update review approval status
   */
  updateReview(id: string, isApproved: boolean) {
    const reviews = db.getReviews();
    const rev = reviews.find(r => r.id === id);
    if (!rev) {
      throw { status: 404, message: "Review not found." };
    }

    if (isApproved !== undefined) rev.isApproved = isApproved;
    db.saveReview(rev);
    return rev;
  }

  /**
   * Delete a review
   */
  deleteReview(id: string) {
    db.deleteReview(id);
    return true;
  }
}

export const reviewService = new ReviewService();
