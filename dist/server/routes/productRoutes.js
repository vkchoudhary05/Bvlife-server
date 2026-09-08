/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Router } from "express";
import { getProducts, getProductById, getProductVariant, switchProductFormulation, createProductVariant, updateProductVariant, deleteProductVariant, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { getReviews, createReview, updateReview, deleteReview } from "../controllers/reviewController.js";
import { getBlogs, createBlog, deleteBlog, getFAQs, createFAQ, deleteFAQ, getSettings, updateSettings, getActivityLogs } from "../controllers/contentController.js";
import { getCoupons, createCoupon, deleteCoupon, validateCoupon } from "../controllers/couponController.js";
import { authenticateToken, requireAdmin, optionalAuthenticateToken } from "../middleware/authMiddleware.js";
import { validateProduct } from "../middleware/validationMiddleware.js";
export const productRouter = Router();
// Products (Public read, Admin write)
productRouter.get("/api/products", getProducts);
productRouter.get("/api/products/:id", getProductById);
productRouter.get("/api/products/:id/variants/:variantId", getProductVariant);
productRouter.get("/api/products/:id/switch-formulation/:formType", switchProductFormulation);
productRouter.post("/api/products/:id/variants", authenticateToken, requireAdmin, createProductVariant);
productRouter.put("/api/products/:id/variants/:variantId", authenticateToken, requireAdmin, updateProductVariant);
productRouter.delete("/api/products/:id/variants/:variantId", authenticateToken, requireAdmin, deleteProductVariant);
productRouter.post("/api/products", authenticateToken, requireAdmin, validateProduct, createProduct);
productRouter.put("/api/products/:id", authenticateToken, requireAdmin, updateProduct);
productRouter.delete("/api/products/:id", authenticateToken, requireAdmin, deleteProduct);
// Reviews (Public read, authenticated customer write, admin moderate)
productRouter.get("/api/reviews", getReviews);
productRouter.post("/api/reviews", optionalAuthenticateToken, createReview);
productRouter.put("/api/reviews/:id", authenticateToken, requireAdmin, updateReview);
productRouter.delete("/api/reviews/:id", authenticateToken, requireAdmin, deleteReview);
// Blogs
productRouter.get("/api/blogs", getBlogs);
productRouter.post("/api/blogs", authenticateToken, requireAdmin, createBlog);
productRouter.delete("/api/blogs/:id", authenticateToken, requireAdmin, deleteBlog);
// FAQs
productRouter.get("/api/faqs", getFAQs);
productRouter.post("/api/faqs", authenticateToken, requireAdmin, createFAQ);
productRouter.delete("/api/faqs/:id", authenticateToken, requireAdmin, deleteFAQ);
// Coupons
productRouter.get("/api/coupons", getCoupons);
productRouter.post("/api/coupons", authenticateToken, requireAdmin, createCoupon);
productRouter.post("/api/coupons/validate", validateCoupon);
productRouter.delete("/api/coupons/:code", authenticateToken, requireAdmin, deleteCoupon);
// Store Settings
productRouter.get("/api/settings", getSettings);
productRouter.put("/api/settings", authenticateToken, requireAdmin, updateSettings);
productRouter.get("/api/activity-logs", authenticateToken, requireAdmin, getActivityLogs);
