/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { 
  getProducts, 
  getProductById, 
  getProductVariant,
  switchProductFormulation,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getReviews, 
  createReview, 
  updateReview, 
  deleteReview, 
  getBlogs, 
  createBlog, 
  deleteBlog, 
  getFAQs, 
  createFAQ, 
  deleteFAQ, 
  getCoupons, 
  createCoupon, 
  deleteCoupon, 
  getSettings, 
  updateSettings, 
  getActivityLogs 
} from "../controllers/productController.js";
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
productRouter.put("/api/products/:id", authenticateToken, requireAdmin, validateProduct, updateProduct);
productRouter.delete("/api/products/:id", authenticateToken, requireAdmin, deleteProduct);

// Reviews (Public read/write, Admin edit/delete)
productRouter.get("/api/reviews", getReviews);
productRouter.post("/api/reviews", optionalAuthenticateToken, createReview);
productRouter.put("/api/reviews/:id", authenticateToken, requireAdmin, updateReview);
productRouter.delete("/api/reviews/:id", authenticateToken, requireAdmin, deleteReview);

// Blogs (Public read, Admin write)
productRouter.get("/api/blogs", getBlogs);
productRouter.post("/api/blogs", authenticateToken, requireAdmin, createBlog);
productRouter.delete("/api/blogs/:id", authenticateToken, requireAdmin, deleteBlog);

// FAQs (Public read, Admin write)
productRouter.get("/api/faqs", getFAQs);
productRouter.post("/api/faqs", authenticateToken, requireAdmin, createFAQ);
productRouter.delete("/api/faqs/:id", authenticateToken, requireAdmin, deleteFAQ);

// Coupons (Public list, Admin create/delete)
productRouter.get("/api/coupons", getCoupons);
productRouter.post("/api/coupons", authenticateToken, requireAdmin, createCoupon);
productRouter.delete("/api/coupons/:code", authenticateToken, requireAdmin, deleteCoupon);

// Store Settings (Public read, Admin update)
productRouter.get("/api/settings", getSettings);
productRouter.post("/api/settings", authenticateToken, requireAdmin, updateSettings);
productRouter.put("/api/settings", authenticateToken, requireAdmin, updateSettings);

// Activity Audit Logs (Admin only)
productRouter.get("/api/logs", authenticateToken, requireAdmin, getActivityLogs);
