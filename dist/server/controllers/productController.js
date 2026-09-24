/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { productService } from "../services/productService.js";
/**
 * Get all products
 */
export const getProducts = (req, res) => {
    try {
        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        if (isPaginated) {
            const pageValue = Number(req.query.page ?? 1);
            const limitValue = Number(req.query.limit ?? 24);
            if (!Number.isFinite(pageValue) || !Number.isFinite(limitValue) || pageValue < 1 || limitValue < 1) {
                return res.status(400).json({ error: "Page and limit must be positive numbers." });
            }
            const page = Math.floor(pageValue);
            const limit = Math.min(Math.floor(limitValue), 100);
            const result = productService.getProductsPage({
                page,
                limit,
                category: typeof req.query.category === "string" ? req.query.category : undefined,
                featured: req.query.featured === "true",
                bestSeller: req.query.bestSeller === "true",
                search: typeof req.query.search === "string" ? req.query.search : undefined,
                sort: typeof req.query.sort === "string" ? req.query.sort : undefined
            });
            return res.json(result);
        }
        const products = productService.getAllProducts();
        return res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch products." });
    }
};
/**
 * Get single product by ID (with variant resolution)
 */
export const getProductById = (req, res) => {
    try {
        const variantId = req.query.variantId;
        const prod = productService.getProductById(req.params.id, variantId);
        res.json(prod);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to fetch product." });
    }
};
/**
 * Switch product formulation
 */
export const switchProductFormulation = (req, res) => {
    try {
        const { id, formType } = req.params;
        const result = productService.switchFormulation(id, formType);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Formulation switch failed." });
    }
};
/**
 * Get specific variant details
 */
export const getProductVariant = (req, res) => {
    try {
        const { id, variantId } = req.params;
        const result = productService.getProductVariant(id, variantId);
        res.json(result);
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Variant not found." });
    }
};
/**
 * Create a new variant on a product (Admin)
 */
export const createProductVariant = (req, res) => {
    try {
        const { id } = req.params;
        const result = productService.createVariant(id, req.body);
        res.json({ message: "Variant added successfully.", ...result });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to add variant." });
    }
};
/**
 * Update a specific variant on a product (Admin)
 */
export const updateProductVariant = (req, res) => {
    try {
        const { id, variantId } = req.params;
        const result = productService.updateVariant(id, variantId, req.body);
        res.json({ message: "Variant updated successfully.", ...result });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update variant." });
    }
};
/**
 * Delete a variant from a product (Admin)
 */
export const deleteProductVariant = (req, res) => {
    try {
        const { id, variantId } = req.params;
        const product = productService.deleteVariant(id, variantId);
        res.json({ message: "Variant deleted successfully.", product });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to delete variant." });
    }
};
/**
 * Add new product (Admin)
 */
export const createProduct = (req, res) => {
    try {
        const product = productService.createProduct(req.body);
        res.json({ message: "Product created successfully.", product });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to create product." });
    }
};
/**
 * Update product (Admin)
 */
export const updateProduct = (req, res) => {
    try {
        const product = productService.updateProduct(req.params.id, req.body);
        res.json({ message: "Product updated successfully.", product });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to update product." });
    }
};
/**
 * Delete product (Admin)
 */
export const deleteProduct = (req, res) => {
    try {
        productService.deleteProduct(req.params.id);
        res.json({ message: "Product deleted successfully." });
    }
    catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Failed to delete product." });
    }
};
