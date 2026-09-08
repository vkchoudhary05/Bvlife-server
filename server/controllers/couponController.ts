/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { couponService } from "../services/couponService.js";

export const getCoupons = (req: Request, res: Response) => {
  try {
    const coupons = couponService.getCoupons();
    res.json(coupons);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch coupons." });
  }
};

export const createCoupon = (req: Request, res: Response) => {
  try {
    const coupon = couponService.createCoupon(req.body);
    res.json({ message: "Coupon saved.", coupon });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create coupon." });
  }
};

export const deleteCoupon = (req: Request, res: Response) => {
  try {
    couponService.deleteCoupon(req.params.code);
    res.json({ message: "Coupon deleted." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete coupon." });
  }
};

export const validateCoupon = (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    const result = couponService.validateCoupon(code, Number(subtotal || 0));
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Invalid coupon code." });
  }
};
