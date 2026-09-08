/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { Coupon } from "../types.js";

export class CouponService {
  /**
   * Get all active coupons
   */
  getCoupons() {
    return db.getCoupons();
  }

  /**
   * Create or update coupon
   */
  createCoupon(data: any) {
    if (!data.code || !data.value) {
      throw { status: 400, message: "Coupon code and discount value are required." };
    }

    const coupon: Coupon = {
      code: data.code.toUpperCase(),
      discountType: data.discountType || 'percentage',
      value: Number(data.value),
      minOrderValue: Number(data.minOrderValue || 0),
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : undefined,
      expiryDate: data.expiryDate || "2026-12-31",
      active: data.active !== undefined ? data.active : true
    };

    db.saveCoupon(coupon);
    return coupon;
  }

  /**
   * Delete coupon by code
   */
  deleteCoupon(code: string) {
    db.deleteCoupon(code);
    return true;
  }

  /**
   * Validate coupon and calculate discount amount
   */
  validateCoupon(code: string, subtotal: number) {
    const coupon = db.getCoupons().find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (!coupon) {
      throw { status: 404, message: "Invalid or inactive coupon code." };
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      throw { status: 400, message: "This coupon code has expired." };
    }

    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      throw { status: 400, message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon.` };
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return {
      valid: true,
      coupon,
      discount: Math.min(discount, subtotal)
    };
  }
}

export const couponService = new CouponService();
