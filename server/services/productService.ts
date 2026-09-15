/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { Product, ProductVariant } from "../types.js";
import { getVariantImage, getVariantGalleryImages, detectFormulationType } from "../varientImage.js";

// Helper for formulation labels
function getFormLabel(form: string): string {
  const f = (form || '').toLowerCase();
  if (f.includes('tablet') || f.includes('vati') || f.includes('gutika')) return 'Tablets / Vati';
  if (f.includes('hair oil') || f.includes('bhringraj')) return 'Hair Taila / Scalp Oil';
  if (f.includes('oil') || f.includes('taila') || f.includes('tailam') || f.includes('serum')) return 'Taila / Herbal Oil';
  if (f.includes('churna') || f.includes('powder') || f.includes('bhasma')) return 'Churna / Herbal Powder';
  if (f.includes('capsule') || f.includes('cap')) return 'Vegetarian Capsules';
  if (f.includes('syrup') || f.includes('liquid') || f.includes('juice') || f.includes('arishta') || f.includes('asava') || f.includes('kadha')) return 'Juice / Syrup / Kadha';
  if (f.includes('paste') || f.includes('avaleha') || f.includes('chyawanprash')) return 'Avaleha / Herbal Paste';
  if (f.includes('cream') || f.includes('lepa') || f.includes('gel')) return 'Lepa / Herbal Cream';
  if (f.includes('resin') || f.includes('shilajit')) return 'Pure Resin';
  return 'Ayurvedic Formulation';
}

function getFormIcon(form: string): string {
  const f = (form || '').toLowerCase();
  if (f.includes('tablet') || f.includes('vati')) return 'tablet';
  if (f.includes('oil') || f.includes('taila')) return 'droplet';
  if (f.includes('churna') || f.includes('powder')) return 'jar';
  if (f.includes('capsule')) return 'capsule';
  if (f.includes('syrup') || f.includes('liquid') || f.includes('juice')) return 'bottle';
  return 'herbal';
}

export function enrichProductWithFamily(prod: Product, allProducts: Product[]): Product {
  const familyGroup = prod.familyGroup || '';
  const baseHerb = prod.baseHerb || (
    prod.name.toLowerCase().includes('amla') ? 'Amla' :
    prod.name.toLowerCase().includes('ashwagandha') ? 'Ashwagandha' :
    prod.name.toLowerCase().includes('triphala') ? 'Triphala' :
    prod.name.toLowerCase().includes('brahmi') ? 'Brahmi' :
    prod.name.toLowerCase().includes('kumkumadi') ? 'Kumkumadi' :
    prod.name.toLowerCase().includes('shatavari') ? 'Shatavari' :
    prod.name.toLowerCase().includes('madhunashini') ? 'Madhunashini' :
    prod.name.toLowerCase().includes('nirgundi') ? 'Nirgundi' :
    prod.name.toLowerCase().includes('shilajit') ? 'Shilajit' : ''
  );

  const siblingProducts = allProducts.filter(p => {
    if (familyGroup && p.familyGroup === familyGroup) return true;
    if (baseHerb && (p.baseHerb?.toLowerCase() === baseHerb.toLowerCase() || p.name.toLowerCase().includes(baseHerb.toLowerCase()))) return true;
    return false;
  });

  const relatedFormulations: any[] = [];

  if (siblingProducts.length > 1) {
    siblingProducts.forEach(sp => {
      const spForm = sp.formulation || detectFormulationType(sp.variants?.[0], sp);
      const label = sp.formLabel || getFormLabel(spForm);
      const primaryVariant = sp.variants?.find(v => v.isDefault) || sp.variants?.[0];
      const img = primaryVariant?.image || sp.mainImage;
      const allSizes = sp.variants ? sp.variants.map(v => v.size || v.name).filter(Boolean) as string[] : [];

      relatedFormulations.push({
        id: sp.id,
        productId: sp.id,
        name: sp.name,
        form: spForm,
        formLabel: label,
        icon: getFormIcon(spForm),
        image: img,
        price: primaryVariant?.price || sp.price,
        originalPrice: primaryVariant?.originalPrice || sp.originalPrice,
        stock: sp.stock,
        sku: sp.sku,
        isCurrent: sp.id === prod.id,
        sizes: allSizes,
        variants: sp.variants || []
      });
    });
  } else if (prod.variants && prod.variants.length > 0) {
    const variantFormMap = new Map<string, ProductVariant[]>();
    prod.variants.forEach(v => {
      const vForm = v.form || v.formType || detectFormulationType(v, prod);
      if (!variantFormMap.has(vForm)) variantFormMap.set(vForm, []);
      variantFormMap.get(vForm)!.push(v);
    });

    if (variantFormMap.size > 1) {
      variantFormMap.forEach((vList, vForm) => {
        const primaryV = vList.find(v => v.isDefault) || vList[0];
        relatedFormulations.push({
          id: primaryV.id,
          productId: prod.id,
          name: `${prod.name} (${getFormLabel(vForm)})`,
          form: vForm,
          formLabel: getFormLabel(vForm),
          icon: getFormIcon(vForm),
          image: getVariantImage(primaryV, prod),
          price: primaryV.price,
          originalPrice: primaryV.originalPrice,
          stock: vList.reduce((sum, v) => sum + (v.stock || 0), 0),
          sku: primaryV.sku || prod.sku,
          isCurrent: false,
          sizes: vList.map(v => v.size || v.name).filter(Boolean) as string[],
          variants: vList
        });
      });
    }
  }

  return {
    ...prod,
    familyGroup: familyGroup || (baseHerb ? `${baseHerb.toLowerCase()}-family` : undefined),
    baseHerb: baseHerb || undefined,
    formulation: prod.formulation || detectFormulationType(prod.variants?.[0], prod),
    formLabel: prod.formLabel || getFormLabel(prod.formulation || detectFormulationType(prod.variants?.[0], prod)),
    relatedFormulations: relatedFormulations.length > 0 ? relatedFormulations : undefined
  };
}

export class ProductService {
  /**
   * Get all products enriched with family groups & formulations
   */
  getAllProducts() {
    const allProds = db.getProducts();
    return allProds.map(p => enrichProductWithFamily(p, allProds));
  }

  /**
   * Get single product with variant resolution
   */
  getProductById(id: string, variantId?: string) {
    const allProds = db.getProducts();
    const rawProd = db.getProductById(id);
    if (!rawProd) {
      throw { status: 404, message: "Product not found." };
    }

    const prod = enrichProductWithFamily(rawProd, allProds);

    if (variantId && Array.isArray(prod.variants) && prod.variants.length > 0) {
      const variant = prod.variants.find(v => v.id === variantId);
      if (variant) {
        const resolvedHeroImage = getVariantImage(variant, prod);
        const resolvedGallery = getVariantGalleryImages(variant, prod);
        const formType = detectFormulationType(variant, prod);

        return {
          ...prod,
          activeVariant: variant,
          selectedVariantId: variant.id,
          currentPrice: variant.price,
          currentOriginalPrice: variant.originalPrice || variant.price,
          currentStock: variant.stock,
          currentSku: variant.sku || prod.sku,
          currentImage: resolvedHeroImage,
          currentImages: resolvedGallery,
          allImages: resolvedGallery,
          currentDosage: variant.dosage || prod.dosage,
          currentUsageInstructions: variant.usageInstructions || prod.usageInstructions,
          currentDescription: variant.description || prod.description,
          currentBenefits: (variant.benefits && variant.benefits.length > 0) ? variant.benefits : prod.benefits,
          currentNetQuantity: variant.netQuantity || variant.size,
          currentFormType: formType
        };
      }
    }

    return prod;
  }

  /**
   * Switch product formulation to a sibling product or specific variant
   */
  switchFormulation(id: string, formType: string) {
    const allProds = db.getProducts();
    const currentProd = db.getProductById(id);
    if (!currentProd) {
      throw { status: 404, message: "Product not found." };
    }

    const enriched = enrichProductWithFamily(currentProd, allProds);
    const targetForm = (formType || '').toLowerCase();

    // Check sibling product
    const sibling = (enriched.relatedFormulations || []).find(f =>
      f.form.toLowerCase() === targetForm ||
      f.formLabel.toLowerCase().includes(targetForm) ||
      f.name.toLowerCase().includes(targetForm)
    );

    if (sibling && sibling.productId !== currentProd.id) {
      const siblingProd = db.getProductById(sibling.productId);
      if (siblingProd) {
        const enrichedSibling = enrichProductWithFamily(siblingProd, allProds);
        return {
          switchedTo: "product",
          productId: siblingProd.id,
          product: enrichedSibling,
          defaultVariantId: siblingProd.variants?.[0]?.id
        };
      }
    }

    // Check variants on current product
    if (currentProd.variants && currentProd.variants.length > 0) {
      const matchingVariant = currentProd.variants.find(v => {
        const vForm = (v.form || v.formType || detectFormulationType(v, currentProd)).toLowerCase();
        return vForm === targetForm || v.name.toLowerCase().includes(targetForm);
      });

      if (matchingVariant) {
        return {
          switchedTo: "variant",
          productId: currentProd.id,
          variantId: matchingVariant.id,
          variant: matchingVariant
        };
      }
    }

    throw { status: 404, message: `Formulation '${formType}' not found in this product family.` };
  }

  /**
   * Get specific variant
   */
  getProductVariant(id: string, variantId: string) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    const variant = prod.variants?.find(v => v.id === variantId);
    if (!variant) {
      throw { status: 404, message: "Variant not found on this product." };
    }

    const resolvedHeroImage = getVariantImage(variant, prod);
    const resolvedGallery = getVariantGalleryImages(variant, prod);
    const formType = detectFormulationType(variant, prod);

    return {
      productId: prod.id,
      productName: prod.name,
      variant,
      resolvedDetails: {
        name: `${prod.name} (${variant.name})`,
        price: variant.price,
        originalPrice: variant.originalPrice || variant.price,
        stock: variant.stock,
        sku: variant.sku || prod.sku,
        image: resolvedHeroImage,
        images: resolvedGallery,
        allImages: resolvedGallery,
        dosage: variant.dosage || prod.dosage,
        usageInstructions: variant.usageInstructions || prod.usageInstructions,
        description: variant.description || prod.description,
        benefits: (variant.benefits && variant.benefits.length > 0) ? variant.benefits : prod.benefits,
        netQuantity: variant.netQuantity || variant.size,
        form: variant.form || variant.formType || formType,
        formType,
        size: variant.size
      }
    };
  }

  /**
   * Create a new variant for a product
   */
  createVariant(id: string, variantData: any) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    const existingVariants = Array.isArray(prod.variants) ? prod.variants : [];
    const newVariantId = variantData.id || `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newVariant: ProductVariant = {
      id: newVariantId,
      name: variantData.name || `${variantData.size || 'Standard'} ${variantData.form || 'Pack'}`,
      size: variantData.size || '100g',
      form: variantData.form || 'tablet',
      formType: variantData.formType || variantData.form || 'tablet',
      price: Number(variantData.price || prod.price),
      originalPrice: Number(variantData.originalPrice || variantData.price || prod.originalPrice),
      stock: Number(variantData.stock || 50),
      sku: variantData.sku || `${prod.sku || 'AYUR'}-${existingVariants.length + 1}`,
      image: variantData.image || undefined,
      images: Array.isArray(variantData.images) ? variantData.images : undefined,
      netQuantity: variantData.netQuantity || variantData.size,
      dosage: variantData.dosage,
      usageInstructions: variantData.usageInstructions,
      description: variantData.description,
      benefits: variantData.benefits,
      isDefault: variantData.isDefault || existingVariants.length === 0
    };

    const updatedVariants = [...existingVariants, newVariant];
    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    const updatedProd: Product = {
      ...prod,
      stock: totalStock,
      variants: updatedVariants
    };

    db.saveProduct(updatedProd);
    db.logActivity("admin", "Add Variant", `Added variant ${newVariant.name} to ${prod.name}`);
    return { variant: newVariant, product: updatedProd };
  }

  /**
   * Update a product variant
   */
  updateVariant(id: string, variantId: string, updates: any) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    if (!prod.variants || !Array.isArray(prod.variants)) {
      throw { status: 404, message: "No variants found on this product." };
    }

    const variantIndex = prod.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
      throw { status: 404, message: "Variant not found." };
    }

    const existingVariant = prod.variants[variantIndex];
    const updatedVariant: ProductVariant = {
      ...existingVariant,
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : existingVariant.price,
      originalPrice: updates.originalPrice !== undefined ? Number(updates.originalPrice) : existingVariant.originalPrice,
      stock: updates.stock !== undefined ? Number(updates.stock) : existingVariant.stock
    };

    const updatedVariants = [...prod.variants];
    updatedVariants[variantIndex] = updatedVariant;

    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const updatedProd: Product = {
      ...prod,
      stock: totalStock,
      variants: updatedVariants
    };

    db.saveProduct(updatedProd);
    db.logActivity("admin", "Update Variant", `Updated variant ${updatedVariant.name} for ${prod.name}`);
    return { variant: updatedVariant, product: updatedProd };
  }

  /**
   * Delete a variant
   */
  deleteVariant(id: string, variantId: string) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    if (!prod.variants || !Array.isArray(prod.variants)) {
      throw { status: 404, message: "No variants found on this product." };
    }

    const updatedVariants = prod.variants.filter(v => v.id !== variantId);
    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    const updatedProd: Product = {
      ...prod,
      stock: totalStock,
      variants: updatedVariants
    };

    db.saveProduct(updatedProd);
    db.logActivity("admin", "Delete Variant", `Deleted variant ${variantId} from ${prod.name}`);
    return updatedProd;
  }

  /**
   * Create a new product
   */
  createProduct(data: any) {
    const userSku = typeof data.sku === 'string' ? data.sku.trim() : '';
    const variants = Array.isArray(data.variants) ? data.variants : [];

    let stockValue = Number(data.stock || 0);
    if (variants.length > 0 && data.stock === undefined) {
      stockValue = variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    }

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: data.name,
      sku: userSku || `AYUR-${Math.floor(100 + Math.random() * 900)}`,
      price: Number(data.price),
      originalPrice: Number(data.originalPrice || data.price),
      stock: stockValue,
      category: data.category,
      subcategory: data.subcategory,
      brand: data.brand || "Bv Life",
      description: data.description || "",
      mainImage: data.mainImage || "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
      images: data.images || [],
      ingredients: data.ingredients || [],
      benefits: data.benefits || [],
      dosage: data.dosage || "As directed by physician",
      usageInstructions: data.usageInstructions || "As directed",
      faqs: data.faqs || [],
      rating: Number(data.rating || 5.0),
      featured: data.featured || false,
      bestSeller: data.bestSeller || false,
      lowStockAlertLimit: Number(data.lowStockAlertLimit || 5),
      createdDate: new Date().toISOString().split('T')[0],
      variants
    };

    db.saveProduct(newProd);
    db.logActivity("admin", "Create Product", `Added product ${newProd.name}`);
    return newProd;
  }

  /**
   * Update an existing product
   */
  updateProduct(id: string, updates: any) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    const updatedSku = typeof updates.sku === 'string' && updates.sku.trim() !== '' ? updates.sku.trim() : prod.sku;
    const updatedVariants = updates.variants !== undefined ? updates.variants : prod.variants;

    const updated: Product = {
      ...prod,
      ...updates,
      sku: updatedSku,
      price: Number(updates.price !== undefined ? updates.price : prod.price),
      originalPrice: Number(updates.originalPrice !== undefined ? updates.originalPrice : prod.originalPrice),
      stock: Number(updates.stock !== undefined ? updates.stock : prod.stock),
      variants: updatedVariants,
      rating: Number(prod.rating)
    };

    db.saveProduct(updated);
    db.logActivity("admin", "Update Product", `Updated product details for ${prod.name}`);
    return updated;
  }

  /**
   * Delete product
   */
  deleteProduct(id: string) {
    const prod = db.getProductById(id);
    if (!prod) {
      throw { status: 404, message: "Product not found." };
    }

    db.deleteProduct(id);
    db.logActivity("admin", "Delete Product", `Removed product: ${prod.name}`);
    return true;
  }
}

export const productService = new ProductService();
