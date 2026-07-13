/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Ingredient {
  name: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice: number;
  stock: number;
  category: string;
  subcategory?: string;
  brand: string;
  description: string;
  mainImage: string;
  images: string[];
  ingredients: Ingredient[];
  benefits: string[];
  dosage: string;
  usageInstructions: string;
  faqs: FAQItem[];
  rating: number; // calculated average
  featured?: boolean;
  bestSeller?: boolean;
  lowStockAlertLimit: number;
  createdDate: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Address {
  id: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  mainImage: string;
}

export interface TrackingUpdate {
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
  date: string;
  comment: string;
}

export interface Order {
  id: string;
  userEmail: string;
  userName: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCharge: number;
  discount: number;
  finalTotal: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
  paymentMethod: 'Razorpay' | 'UPI' | 'Cards' | 'Net Banking' | 'Cash on Delivery';
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  orderDate: string;
  trackingNumber?: string;
  trackingUpdates: TrackingUpdate[];
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  image: string;
  author: string;
  date: string;
  categories: string[];
  readTime: string;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate: string;
  active: boolean;
}

export interface WebsiteSettings {
  logoName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  defaultTaxPercentage: number;
  baseShippingCharge: number;
  freeShippingThreshold: number;
}

export interface User {
  email: string;
  fullName: string;
  role: 'customer' | 'admin';
  phone?: string;
  addresses: Address[];
  password?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userEmail: string;
  amount: number;
  paymentMethod: string;
  transactionReference: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  createdAt: string;
}
