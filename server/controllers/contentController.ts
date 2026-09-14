/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { contentService } from "../services/contentService.js";
import { communicationService } from "../services/communicationService.js";

// Blogs
export const getBlogs = (req: Request, res: Response) => {
  try {
    res.json(contentService.getBlogs());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch blogs." });
  }
};

export const createBlog = (req: Request, res: Response) => {
  try {
    const blog = contentService.createBlog(req.body);
    res.json({ message: "Blog published successfully.", blog });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create blog." });
  }
};

export const deleteBlog = (req: Request, res: Response) => {
  try {
    contentService.deleteBlog(req.params.id);
    res.json({ message: "Blog deleted." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete blog." });
  }
};

// FAQs
export const getFAQs = (req: Request, res: Response) => {
  try {
    res.json(contentService.getFAQs());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch FAQs." });
  }
};

export const createFAQ = (req: Request, res: Response) => {
  try {
    const faq = contentService.createFAQ(req.body);
    res.json({ message: "FAQ saved.", faq });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create FAQ." });
  }
};

export const deleteFAQ = (req: Request, res: Response) => {
  try {
    contentService.deleteFAQ(req.params.id);
    res.json({ message: "FAQ deleted." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete FAQ." });
  }
};

// Settings
export const getSettings = (req: Request, res: Response) => {
  try {
    res.json(contentService.getSettings());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch settings." });
  }
};

export const updateSettings = (req: Request, res: Response) => {
  try {
    const updated = contentService.updateSettings(req.body);
    res.json({ message: "Settings updated successfully.", settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update settings." });
  }
};

// Activity Logs
export const getActivityLogs = (req: Request, res: Response) => {
  try {
    res.json(contentService.getActivityLogs());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch activity logs." });
  }
};

// Separated Communication Channels Logs (OTP, Email, WhatsApp, SMS)
export const getCommunicationLogs = (req: Request, res: Response) => {
  try {
    const { channel, recipient, category } = req.query;
    const logs = communicationService.getLogs({
      channel: channel as any,
      recipient: recipient as string,
      category: category as string
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch communication logs." });
  }
};

// Admin Test Dispatch for MSG91 Email Templates
export const testMsg91EmailDispatch = async (req: Request, res: Response) => {
  try {
    const { templateType, targetEmail, targetName } = req.body;
    const recipientEmail = targetEmail || 'care@bvlife.in';
    const recipientName = targetName || 'Valued Seeker';

    if (templateType === 'order') {
      const dummyOrder: any = {
        id: `TEST-${Date.now().toString().slice(-6)}`,
        userEmail: recipientEmail,
        userName: recipientName,
        orderDate: new Date().toISOString(),
        items: [{ productName: 'Authentic Ashwagandha Rasayana', quantity: 2, price: 499 }],
        subtotal: 998,
        tax: 49,
        shippingCharge: 0,
        discount: 100,
        finalTotal: 947,
        paymentMethod: 'Razorpay UPI',
        trackingNumber: `GLTRK-${Date.now().toString().slice(-6)}`,
        shippingAddress: {
          fullName: recipientName,
          addressLine1: 'Vedic Care Bhavan, Ayur Marg',
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110001',
          phone: '9425011088'
        }
      };
      const result = await communicationService.sendOrderConfirmationMsg91Email(dummyOrder);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error || 'Failed to dispatch Order confirmation email via MSG91', result });
      }
      return res.json({ success: true, message: 'MSG91 Order confirmation email dispatched successfully', result });
    } else if (templateType === 'booking') {
      const dummyBooking: any = {
        id: `APT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: recipientName,
        patientEmail: recipientEmail,
        patientPhone: '9425011088',
        doctorName: 'Dr. Arundhati Sharma',
        doctorSpecialty: 'Senior Ayurvedic Specialist',
        doctorQualification: 'BAMS, MD (Ayurveda)',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '11:00 AM',
        consultationMode: 'video',
        healthConcern: 'Holistic Ayurvedic Assessment',
        fee: 499,
        paymentStatus: 'Paid',
        bookingDate: new Date().toLocaleDateString('en-IN')
      };
      const result = await communicationService.sendDoctorBookingMsg91Email(dummyBooking);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error || 'Failed to dispatch Doctor booking email via MSG91', result });
      }
      return res.json({ success: true, message: 'MSG91 Doctor booking confirmation email dispatched successfully', result });
    } else {
      return res.status(400).json({ error: "Invalid templateType. Must be 'order' or 'booking'." });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch test email' });
  }
};
