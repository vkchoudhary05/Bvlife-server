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

export interface RelatedFormulation {
  id: string;
  productId: string;
  name: string;
  form: string;
  formLabel: string;
  icon?: string;
  image: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sku?: string;
  isCurrent?: boolean;
  sizes?: string[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  formType?: string;
  form?: string;
  size?: string;
  sku?: string;
  price: number;
  originalPrice: number;
  stock: number;
  image?: string;
  images?: string[];
  allImages?: string[];
  isDefault?: boolean;
  description?: string;
  dosage?: string;
  usageInstructions?: string;
  benefits?: string[];
  netQuantity?: string;
  weight?: string;
  volume?: string;
  highlights?: string[];
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
  allImages?: string[];
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
  variants?: ProductVariant[];
  familyGroup?: string;
  baseHerb?: string;
  formulation?: string;
  formLabel?: string;
  relatedFormulations?: RelatedFormulation[];
  activeVariant?: ProductVariant;
  selectedVariantId?: string;
  currentPrice?: number;
  currentOriginalPrice?: number;
  currentStock?: number;
  currentSku?: string;
  currentImage?: string;
  currentImages?: string[];
  currentDosage?: string;
  currentUsageInstructions?: string;
  currentDescription?: string;
  currentBenefits?: string[];
  currentNetQuantity?: string;
  currentFormType?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
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
  variantId?: string;
  variantName?: string;
  variantSize?: string;
  sku?: string;
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
  paymentMethod: 'UPI' | 'Cash on Delivery' | 'Razorpay';
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
  logoUrl?: string;
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

export interface UserMembership {
  tier: '1 Year' | '3 Years' | '5 Years' | '10 Years' | 'Lifetime';
  cardNumber: string;
  startDate: string;
  expiryDate: string;
  pricePaid: number;
  discountPercentage?: number;
  status: 'active' | 'expired';
}

export interface User {
  email: string;
  fullName: string;
  role: 'customer' | 'admin';
  phone?: string;
  addresses: Address[];
  password?: string;
  createdAt?: string;
  membership?: UserMembership;
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

export interface Doctor {
  id: string;
  name: string;
  title: string;
  qualification: string;
  experienceYears: number;
  specialties: string[];
  languages: string[];
  fee: number;
  originalFee?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  bio: string;
  availableDays: string[];
  nextAvailable: string;
}

export interface MedicalReportFile {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
  uploadedAt?: string;
}

export interface PrescribedMedicine {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions?: string;
}

export interface DoctorPrescription {
  id: string;
  appointmentId: string;
  doctorId?: string;
  doctorName: string;
  doctorQualification: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  date: string;
  diagnosis: string;
  doshaPrakriti?: string;
  dietRecommendations: string[];
  lifestyleAdvice: string[];
  medicines: PrescribedMedicine[];
  doctorNotes?: string;
  followUpDate?: string;
  signedAt: string;
}

export interface DoctorAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorImage: string;
  doctorQualification: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  patientEmail: string;
  date: string;
  timeSlot: string;
  consultationMode: 'video' | 'audio' | 'clinic' | 'chat';
  healthConcern: string;
  previousHistory?: string;
  medicalReports?: MedicalReportFile[];
  patientPhoto?: string;
  fee: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  bookingDate: string;
  meetingLink?: string;
  meetingPlatform?: 'jitsi' | 'google-meet';
  prescription?: DoctorPrescription;
  doctorNotes?: string;
  roomStatus?: 'waiting' | 'in-progress' | 'completed';
  paymentMethod?: string;
  paymentStatus?: 'Pending' | 'Paid' | 'Failed';
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  whatsappConfirmationSent?: boolean;
  whatsappConfirmationSentAt?: string;
}

export interface OTPRecord {
  code: string;
  identifier: string; // phone or email
  purpose: string;
  expiresAt: number;
  reqId?: string;
}
