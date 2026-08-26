import { db } from "../dbManager.js";
import { getVariantImage, getVariantGalleryImages, detectFormulationType } from "../varientImage.js";
// Formulation Label Helper
function getFormLabel(form) {
    const f = (form || '').toLowerCase();
    if (f.includes('tablet') || f.includes('vati') || f.includes('gutika'))
        return 'Tablets / Vati';
    if (f.includes('hair oil') || f.includes('bhringraj'))
        return 'Hair Taila / Scalp Oil';
    if (f.includes('oil') || f.includes('taila') || f.includes('tailam') || f.includes('serum'))
        return 'Taila / Herbal Oil';
    if (f.includes('churna') || f.includes('powder') || f.includes('bhasma'))
        return 'Churna / Herbal Powder';
    if (f.includes('capsule') || f.includes('cap'))
        return 'Vegetarian Capsules';
    if (f.includes('syrup') || f.includes('liquid') || f.includes('juice') || f.includes('arishta') || f.includes('asava') || f.includes('kadha'))
        return 'Juice / Syrup / Kadha';
    if (f.includes('paste') || f.includes('avaleha') || f.includes('chyawanprash'))
        return 'Avaleha / Herbal Paste';
    if (f.includes('cream') || f.includes('lepa') || f.includes('gel'))
        return 'Lepa / Herbal Cream';
    if (f.includes('resin') || f.includes('shilajit'))
        return 'Pure Resin';
    return 'Ayurvedic Formulation';
}
function getFormIcon(form) {
    const f = (form || '').toLowerCase();
    if (f.includes('tablet') || f.includes('vati'))
        return 'tablet';
    if (f.includes('oil') || f.includes('taila'))
        return 'droplet';
    if (f.includes('churna') || f.includes('powder'))
        return 'jar';
    if (f.includes('capsule'))
        return 'capsule';
    if (f.includes('syrup') || f.includes('liquid') || f.includes('juice'))
        return 'bottle';
    return 'herbal';
}
export function enrichProductWithFamily(prod, allProducts) {
    const familyGroup = prod.familyGroup || '';
    const baseHerb = prod.baseHerb || (prod.name.toLowerCase().includes('amla') ? 'Amla' :
        prod.name.toLowerCase().includes('ashwagandha') ? 'Ashwagandha' :
            prod.name.toLowerCase().includes('triphala') ? 'Triphala' :
                prod.name.toLowerCase().includes('brahmi') ? 'Brahmi' :
                    prod.name.toLowerCase().includes('kumkumadi') ? 'Kumkumadi' :
                        prod.name.toLowerCase().includes('shatavari') ? 'Shatavari' :
                            prod.name.toLowerCase().includes('madhunashini') ? 'Madhunashini' :
                                prod.name.toLowerCase().includes('nirgundi') ? 'Nirgundi' :
                                    prod.name.toLowerCase().includes('shilajit') ? 'Shilajit' : '');
    // 1. Sibling Products in the same family / herb group
    const siblingProducts = allProducts.filter(p => {
        if (familyGroup && p.familyGroup === familyGroup)
            return true;
        if (baseHerb && (p.baseHerb?.toLowerCase() === baseHerb.toLowerCase() || p.name.toLowerCase().includes(baseHerb.toLowerCase())))
            return true;
        return false;
    });
    const relatedFormulations = [];
    if (siblingProducts.length > 1) {
        siblingProducts.forEach(sp => {
            const spForm = sp.formulation || detectFormulationType(sp.variants?.[0], sp);
            const label = sp.formLabel || getFormLabel(spForm);
            const primaryVariant = sp.variants?.find(v => v.isDefault) || sp.variants?.[0];
            const img = primaryVariant?.image || sp.mainImage;
            const allSizes = sp.variants ? sp.variants.map(v => v.size || v.name).filter(Boolean) : [];
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
    }
    else if (prod.variants && prod.variants.length > 0) {
        // If a single product contains variants of distinct formulation types
        const variantFormMap = new Map();
        prod.variants.forEach(v => {
            const vForm = v.form || v.formType || detectFormulationType(v, prod);
            if (!variantFormMap.has(vForm))
                variantFormMap.set(vForm, []);
            variantFormMap.get(vForm).push(v);
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
                    sizes: vList.map(v => v.size || v.name).filter(Boolean),
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
// Get all products
export const getProducts = (req, res) => {
    const allProds = db.getProducts();
    const enriched = allProds.map(p => enrichProductWithFamily(p, allProds));
    res.json(enriched);
};
// Get single product (with full server-side variant and family resolution)
export const getProductById = (req, res) => {
    const allProds = db.getProducts();
    const rawProd = db.getProductById(req.params.id);
    if (!rawProd)
        return res.status(404).json({ error: "Product not found." });
    const prod = enrichProductWithFamily(rawProd, allProds);
    const variantId = req.query.variantId;
    if (variantId && Array.isArray(prod.variants) && prod.variants.length > 0) {
        const variant = prod.variants.find(v => v.id === variantId);
        if (variant) {
            const resolvedHeroImage = getVariantImage(variant, prod);
            const resolvedGallery = getVariantGalleryImages(variant, prod);
            const formType = detectFormulationType(variant, prod);
            return res.json({
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
            });
        }
    }
    res.json(prod);
};
// Switch product formulation endpoint: returns sibling product or specific variant
export const switchProductFormulation = (req, res) => {
    const { id, formType } = req.params;
    const allProds = db.getProducts();
    const currentProd = db.getProductById(id);
    if (!currentProd)
        return res.status(404).json({ error: "Product not found." });
    const enriched = enrichProductWithFamily(currentProd, allProds);
    const targetForm = (formType || '').toLowerCase();
    // 1. Check if there's a sibling product with this formulation
    const sibling = (enriched.relatedFormulations || []).find(f => f.form.toLowerCase() === targetForm ||
        f.formLabel.toLowerCase().includes(targetForm) ||
        f.name.toLowerCase().includes(targetForm));
    if (sibling && sibling.productId !== currentProd.id) {
        const siblingProd = db.getProductById(sibling.productId);
        if (siblingProd) {
            const enrichedSibling = enrichProductWithFamily(siblingProd, allProds);
            return res.json({
                switchedTo: "product",
                productId: siblingProd.id,
                product: enrichedSibling,
                defaultVariantId: siblingProd.variants?.[0]?.id
            });
        }
    }
    // 2. Check if the current product has a variant of this formulation
    if (currentProd.variants && currentProd.variants.length > 0) {
        const matchingVariant = currentProd.variants.find(v => {
            const vForm = (v.form || v.formType || detectFormulationType(v, currentProd)).toLowerCase();
            return vForm === targetForm || v.name.toLowerCase().includes(targetForm);
        });
        if (matchingVariant) {
            return res.json({
                switchedTo: "variant",
                productId: currentProd.id,
                variantId: matchingVariant.id,
                variant: matchingVariant
            });
        }
    }
    res.status(404).json({ error: `Formulation '${formType}' not found in this product family.` });
};
// Get specific variant details from backend with rich image gallery
export const getProductVariant = (req, res) => {
    const { id, variantId } = req.params;
    const prod = db.getProductById(id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    const variant = prod.variants?.find(v => v.id === variantId);
    if (!variant)
        return res.status(404).json({ error: "Variant not found on this product." });
    const resolvedHeroImage = getVariantImage(variant, prod);
    const resolvedGallery = getVariantGalleryImages(variant, prod);
    const formType = detectFormulationType(variant, prod);
    res.json({
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
    });
};
// Update a specific variant on a product (Admin)
export const updateProductVariant = (req, res) => {
    const { id, variantId } = req.params;
    const prod = db.getProductById(id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    if (!prod.variants || !Array.isArray(prod.variants)) {
        return res.status(404).json({ error: "No variants found on this product." });
    }
    const variantIndex = prod.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) {
        return res.status(404).json({ error: "Variant not found." });
    }
    const existingVariant = prod.variants[variantIndex];
    const updatedVariant = {
        ...existingVariant,
        ...req.body,
        price: req.body.price !== undefined ? Number(req.body.price) : existingVariant.price,
        originalPrice: req.body.originalPrice !== undefined ? Number(req.body.originalPrice) : existingVariant.originalPrice,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : existingVariant.stock
    };
    const updatedVariants = [...prod.variants];
    updatedVariants[variantIndex] = updatedVariant;
    // Recalculate total product stock from variants
    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const updatedProd = {
        ...prod,
        stock: totalStock,
        variants: updatedVariants
    };
    db.saveProduct(updatedProd);
    db.logActivity("admin", "Update Variant", `Updated variant ${updatedVariant.name} for ${prod.name}`);
    res.json({
        message: "Variant updated successfully.",
        variant: updatedVariant,
        product: updatedProd
    });
};
// Create a new variant on a product (Admin)
export const createProductVariant = (req, res) => {
    const { id } = req.params;
    const prod = db.getProductById(id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    const existingVariants = Array.isArray(prod.variants) ? prod.variants : [];
    const newVariantId = req.body.id || `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newVariant = {
        id: newVariantId,
        name: req.body.name || `${req.body.size || 'Standard'} ${req.body.form || 'Pack'}`,
        size: req.body.size || '100g',
        form: req.body.form || 'tablet',
        formType: req.body.formType || req.body.form || 'tablet',
        price: Number(req.body.price || prod.price),
        originalPrice: Number(req.body.originalPrice || req.body.price || prod.originalPrice),
        stock: Number(req.body.stock || 50),
        sku: req.body.sku || `${prod.sku || 'AYUR'}-${existingVariants.length + 1}`,
        image: req.body.image || undefined,
        images: Array.isArray(req.body.images) ? req.body.images : undefined,
        netQuantity: req.body.netQuantity || req.body.size,
        dosage: req.body.dosage,
        usageInstructions: req.body.usageInstructions,
        description: req.body.description,
        benefits: req.body.benefits,
        isDefault: req.body.isDefault || existingVariants.length === 0
    };
    const updatedVariants = [...existingVariants, newVariant];
    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const updatedProd = {
        ...prod,
        stock: totalStock,
        variants: updatedVariants
    };
    db.saveProduct(updatedProd);
    db.logActivity("admin", "Add Variant", `Added variant ${newVariant.name} to ${prod.name}`);
    res.json({
        message: "Variant added successfully.",
        variant: newVariant,
        product: updatedProd
    });
};
// Delete a variant from a product (Admin)
export const deleteProductVariant = (req, res) => {
    const { id, variantId } = req.params;
    const prod = db.getProductById(id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    if (!prod.variants || !Array.isArray(prod.variants)) {
        return res.status(404).json({ error: "No variants found on this product." });
    }
    const updatedVariants = prod.variants.filter(v => v.id !== variantId);
    const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const updatedProd = {
        ...prod,
        stock: totalStock,
        variants: updatedVariants
    };
    db.saveProduct(updatedProd);
    db.logActivity("admin", "Delete Variant", `Deleted variant ${variantId} from ${prod.name}`);
    res.json({
        message: "Variant deleted successfully.",
        product: updatedProd
    });
};
// Add new product (Admin)
export const createProduct = (req, res) => {
    const userSku = typeof req.body.sku === 'string' ? req.body.sku.trim() : '';
    const variants = Array.isArray(req.body.variants) ? req.body.variants : [];
    // If variants provided and stock not explicitly set, calculate from variants
    let stockValue = Number(req.body.stock || 0);
    if (variants.length > 0 && req.body.stock === undefined) {
        stockValue = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
    const newProd = {
        id: `prod-${Date.now()}`,
        name: req.body.name,
        sku: userSku || `AYUR-${Math.floor(100 + Math.random() * 900)}`,
        price: Number(req.body.price),
        originalPrice: Number(req.body.originalPrice || req.body.price),
        stock: stockValue,
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
        createdDate: new Date().toISOString().split('T')[0],
        variants: variants
    };
    db.saveProduct(newProd);
    db.logActivity("admin", "Create Product", `Added product ${newProd.name}`);
    res.json({ message: "Product created successfully.", product: newProd });
};
// Update product (Admin)
export const updateProduct = (req, res) => {
    const prod = db.getProductById(req.params.id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    const updatedSku = typeof req.body.sku === 'string' && req.body.sku.trim() !== '' ? req.body.sku.trim() : prod.sku;
    const updatedVariants = req.body.variants !== undefined ? req.body.variants : prod.variants;
    const updated = {
        ...prod,
        ...req.body,
        sku: updatedSku,
        price: Number(req.body.price !== undefined ? req.body.price : prod.price),
        originalPrice: Number(req.body.originalPrice !== undefined ? req.body.originalPrice : prod.originalPrice),
        stock: Number(req.body.stock !== undefined ? req.body.stock : prod.stock),
        variants: updatedVariants,
        rating: Number(prod.rating) // keep original rating
    };
    db.saveProduct(updated);
    db.logActivity("admin", "Update Product", `Updated product details for ${prod.name}`);
    res.json({ message: "Product updated successfully.", product: updated });
};
// Delete product (Admin)
export const deleteProduct = (req, res) => {
    const prod = db.getProductById(req.params.id);
    if (!prod)
        return res.status(404).json({ error: "Product not found." });
    db.deleteProduct(req.params.id);
    db.logActivity("admin", "Delete Product", `Removed product: ${prod.name}`);
    res.json({ message: "Product deleted successfully." });
};
// Reviews
export const getReviews = (req, res) => {
    res.json(db.getReviews());
};
export const createReview = (req, res) => {
    const { productId, productName, userName, userEmail, rating, comment } = req.body;
    const activeEmail = userEmail || req.user?.email || "customer@gramslife.com";
    if (!productId || !rating) {
        return res.status(400).json({ error: "Product ID and Rating are required." });
    }
    const newReview = {
        id: `rev-${Date.now()}`,
        productId,
        productName: productName || "Ayurvedic Product",
        userName: userName || req.user?.fullName || "Verified Customer",
        userEmail: activeEmail.toLowerCase(),
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
export const updateReview = (req, res) => {
    const reviews = db.getReviews();
    const rev = reviews.find(r => r.id === req.params.id);
    if (!rev)
        return res.status(404).json({ error: "Review not found." });
    if (req.body.isApproved !== undefined)
        rev.isApproved = req.body.isApproved;
    db.saveReview(rev);
    res.json({ message: "Review status updated.", review: rev });
};
// Delete Review
export const deleteReview = (req, res) => {
    db.deleteReview(req.params.id);
    res.json({ message: "Review deleted successfully." });
};
// Blogs
export const getBlogs = (req, res) => {
    res.json(db.getBlogs());
};
export const createBlog = (req, res) => {
    const blog = {
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
export const deleteBlog = (req, res) => {
    db.deleteBlog(req.params.id);
    res.json({ message: "Blog deleted." });
};
// FAQs
export const getFAQs = (req, res) => {
    res.json(db.getFAQs());
};
export const createFAQ = (req, res) => {
    const faq = {
        id: `faq-${Date.now()}`,
        category: req.body.category || "General",
        question: req.body.question,
        answer: req.body.answer
    };
    db.saveFAQ(faq);
    res.json({ message: "FAQ saved.", faq });
};
export const deleteFAQ = (req, res) => {
    db.deleteFAQ(req.params.id);
    res.json({ message: "FAQ deleted." });
};
// Coupons
export const getCoupons = (req, res) => {
    res.json(db.getCoupons());
};
export const createCoupon = (req, res) => {
    const coupon = {
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
export const deleteCoupon = (req, res) => {
    db.deleteCoupon(req.params.code);
    res.json({ message: "Coupon deleted." });
};
// Settings
export const getSettings = (req, res) => {
    res.json(db.getSettings());
};
export const updateSettings = (req, res) => {
    const updated = db.saveSettings(req.body);
    res.json({ message: "Settings updated successfully.", settings: updated });
};
// Logs
export const getActivityLogs = (req, res) => {
    res.json(db.getActivityLogs());
};
