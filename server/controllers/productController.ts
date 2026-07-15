import { Request, Response } from "express";
import { db } from "../dbManager.js";
import { Product, Review, Blog, FAQ, Coupon } from "../types.js";

// Get all products
export const getProducts = (req: Request, res: Response) => {
  res.json(db.getProducts());
};

// Get single product
export const getProductById = (req: Request, res: Response) => {
  const prod = db.getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found." });
  res.json(prod);
};

// Add new product (Admin)
export const createProduct = (req: Request, res: Response) => {
  const newProd: Product = {
    id: `prod-${Date.now()}`,
    name: req.body.name,
    sku: req.body.sku || `AYUR-${Math.floor(100 + Math.random() * 900)}`,
    price: Number(req.body.price),
    originalPrice: Number(req.body.originalPrice || req.body.price),
    stock: Number(req.body.stock || 0),
    category: req.body.category,
    subcategory: req.body.subcategory,
    brand: req.body.brand || "Grams Life",
    description: req.body.description || "",
    mainImage: req.body.mainImage || "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
    images: req.body.images || [],
    ingredients: req.body.ingredients || [],
    benefits: req.body.benefits || [],
    dosage: req.body.dosage || "As directed by physician",
    usageInstructions: req.body.usageInstructions || "As directed",
    faqs: req.body.faqs || [],
    rating: Number(req.body.rating || 5.0),
    featured: req.body.featured || false,
    bestSeller: req.body.bestSeller || false,
    lowStockAlertLimit: Number(req.body.lowStockAlertLimit || 5),
    createdDate: new Date().toISOString().split('T')[0]
  };

  db.saveProduct(newProd);
  db.logActivity("admin", "Create Product", `Added product ${newProd.name}`);
  res.json({ message: "Product created successfully.", product: newProd });
};

// Update product (Admin)
export const updateProduct = (req: Request, res: Response) => {
  const prod = db.getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found." });

  const updated: Product = {
    ...prod,
    ...req.body,
    price: Number(req.body.price !== undefined ? req.body.price : prod.price),
    originalPrice: Number(req.body.originalPrice !== undefined ? req.body.originalPrice : prod.originalPrice),
    stock: Number(req.body.stock !== undefined ? req.body.stock : prod.stock),
    rating: Number(prod.rating) // keep original rating
  };

  db.saveProduct(updated);
  db.logActivity("admin", "Update Product", `Updated product details for ${prod.name}`);
  res.json({ message: "Product updated successfully.", product: updated });
};

// Delete product (Admin)
export const deleteProduct = (req: Request, res: Response) => {
  const prod = db.getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found." });

  db.deleteProduct(req.params.id);
  db.logActivity("admin", "Delete Product", `Removed product: ${prod.name}`);
  res.json({ message: "Product deleted successfully." });
};

// Reviews
export const getReviews = (req: Request, res: Response) => {
  res.json(db.getReviews());
};

export const createReview = (req: Request, res: Response) => {
  const { productId, productName, userName, userEmail, rating, comment } = req.body;
  if (!productId || !userEmail || !rating) {
    return res.status(400).json({ error: "Product, Email and Rating are required." });
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    productId,
    productName,
    userName: userName || "Verified Customer",
    userEmail: userEmail.toLowerCase(),
    rating: Number(rating),
    comment: comment || "",
    isApproved: true, // Auto-approve in showcase sandbox for quick feedback, admin can delete/unapprove
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

  db.logActivity(userEmail, "Add Product Review", `Reviewed ${productName} with ${rating} stars`);
  res.json({ message: "Review posted successfully!", review: newReview });
};

// Update Review
export const updateReview = (req: Request, res: Response) => {
  const reviews = db.getReviews();
  const rev = reviews.find(r => r.id === req.params.id);
  if (!rev) return res.status(404).json({ error: "Review not found." });

  if (req.body.isApproved !== undefined) rev.isApproved = req.body.isApproved;
  db.saveReview(rev);

  res.json({ message: "Review status updated.", review: rev });
};

// Delete Review
export const deleteReview = (req: Request, res: Response) => {
  db.deleteReview(req.params.id);
  res.json({ message: "Review deleted successfully." });
};

// Blogs
export const getBlogs = (req: Request, res: Response) => {
  res.json(db.getBlogs());
};

export const createBlog = (req: Request, res: Response) => {
  const blog: Blog = {
    id: `blog-${Date.now()}`,
    title: req.body.title,
    slug: (req.body.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    summary: req.body.summary || "",
    content: req.body.content || "",
    image: req.body.image || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
    author: req.body.author || "Grams Life Aacharya",
    date: new Date().toISOString().split('T')[0],
    categories: req.body.categories || ["Ayurveda"],
    readTime: req.body.readTime || "5 mins read"
  };
  db.saveBlog(blog);
  res.json({ message: "Blog published successfully.", blog });
};

export const deleteBlog = (req: Request, res: Response) => {
  db.deleteBlog(req.params.id);
  res.json({ message: "Blog deleted." });
};

// FAQs
export const getFAQs = (req: Request, res: Response) => {
  res.json(db.getFAQs());
};

export const createFAQ = (req: Request, res: Response) => {
  const faq: FAQ = {
    id: `faq-${Date.now()}`,
    category: req.body.category || "General",
    question: req.body.question,
    answer: req.body.answer
  };
  db.saveFAQ(faq);
  res.json({ message: "FAQ saved.", faq });
};

export const deleteFAQ = (req: Request, res: Response) => {
  db.deleteFAQ(req.params.id);
  res.json({ message: "FAQ deleted." });
};

// Coupons
export const getCoupons = (req: Request, res: Response) => {
  res.json(db.getCoupons());
};

export const createCoupon = (req: Request, res: Response) => {
  const coupon: Coupon = {
    code: req.body.code.toUpperCase(),
    discountType: req.body.discountType,
    value: Number(req.body.value),
    minOrderValue: Number(req.body.minOrderValue || 0),
    maxDiscount: req.body.maxDiscount ? Number(req.body.maxDiscount) : undefined,
    expiryDate: req.body.expiryDate || "2026-12-31",
    active: req.body.active !== undefined ? req.body.active : true
  };
  db.saveCoupon(coupon);
  res.json({ message: "Coupon saved.", coupon });
};

export const deleteCoupon = (req: Request, res: Response) => {
  db.deleteCoupon(req.params.code);
  res.json({ message: "Coupon deleted." });
};

// Settings
export const getSettings = (req: Request, res: Response) => {
  res.json(db.getSettings());
};

export const updateSettings = (req: Request, res: Response) => {
  const updated = db.saveSettings(req.body);
  res.json({ message: "Settings updated successfully.", settings: updated });
};

// Logs
export const getActivityLogs = (req: Request, res: Response) => {
  res.json(db.getActivityLogs());
};
