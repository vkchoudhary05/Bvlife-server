/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { productService } from "../services/productService.js";

/**
 * Get all products
 */
export const getProducts = (req: Request, res: Response) => {
  try {
    const products = productService.getAllProducts();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch products." });
  }
};

/**
 * Get single product by ID (with variant resolution)
 */
export const getProductById = (req: Request, res: Response) => {
  try {
    const variantId = req.query.variantId as string | undefined;
    const prod = productService.getProductById(req.params.id, variantId);
    res.json(prod);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch product." });
  }
};

/**
 * Switch product formulation
 */
export const switchProductFormulation = (req: Request, res: Response) => {
  try {
    const { id, formType } = req.params;
    const result = productService.switchFormulation(id, formType);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Formulation switch failed." });
  }
};

/**
 * Get specific variant details
 */
export const getProductVariant = (req: Request, res: Response) => {
  try {
    const { id, variantId } = req.params;
    const result = productService.getProductVariant(id, variantId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Variant not found." });
  }
};

/**
 * Create a new variant on a product (Admin)
 */
export const createProductVariant = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = productService.createVariant(id, req.body);
    res.json({ message: "Variant added successfully.", ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to add variant." });
  }
};

/**
 * Update a specific variant on a product (Admin)
 */
export const updateProductVariant = (req: Request, res: Response) => {
  try {
    const { id, variantId } = req.params;
    const result = productService.updateVariant(id, variantId, req.body);
    res.json({ message: "Variant updated successfully.", ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update variant." });
  }
};

/**
 * Delete a variant from a product (Admin)
 */
export const deleteProductVariant = (req: Request, res: Response) => {
  try {
    const { id, variantId } = req.params;
    const product = productService.deleteVariant(id, variantId);
    res.json({ message: "Variant deleted successfully.", product });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to delete variant." });
  }
};

/**
 * Add new product (Admin)
 */
export const createProduct = (req: Request, res: Response) => {
  try {
    const product = productService.createProduct(req.body);
    res.json({ message: "Product created successfully.", product });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create product." });
  }
};

/**
 * Update product (Admin)
 */
export const updateProduct = (req: Request, res: Response) => {
  try {
    const product = productService.updateProduct(req.params.id, req.body);
    res.json({ message: "Product updated successfully.", product });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to update product." });
  }
};

/**
 * Delete product (Admin)
 */
export const deleteProduct = (req: Request, res: Response) => {
  try {
    productService.deleteProduct(req.params.id);
    res.json({ message: "Product deleted successfully." });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to delete product." });
  }
};
