/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";
import { Doctor } from "../types.js";

export class DoctorService {
  /**
   * Get all active doctors
   */
  getDoctors() {
    return db.getDoctors();
  }

  /**
   * Get doctor by ID
   */
  getDoctorById(id: string) {
    const doctor = db.getDoctorById(id);
    if (!doctor) {
      throw { status: 404, message: "Doctor not found" };
    }
    return doctor;
  }

  /**
   * Create a new doctor profile
   */
  createDoctor(data: any) {
    if (!data.name || (!data.specialty && !data.specialties)) {
      throw { status: 400, message: "Doctor Name and Specialty are required" };
    }

    const newDoctor: Doctor = {
      id: data.id || `doc-${Date.now()}`,
      name: data.name,
      title: data.title || "Ayurvedic Physician",
      qualification: data.qualification || "BAMS, MD (Ayurveda)",
      specialties: Array.isArray(data.specialties) ? data.specialties : [data.specialty || "Ayurveda"],
      experienceYears: Number(data.experienceYears || data.experience || 5),
      image: data.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
      fee: Number(data.fee || data.consultationFee || 499),
      originalFee: data.originalFee ? Number(data.originalFee) : undefined,
      bio: data.bio || "Dedicated Ayurvedic practitioner focusing on holistic mind-body rejuvenation.",
      availableDays: Array.isArray(data.availableDays) ? data.availableDays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
      nextAvailable: data.nextAvailable || "Today, 04:30 PM",
      rating: Number(data.rating || 4.9),
      reviewsCount: Number(data.reviewsCount || 1),
      languages: Array.isArray(data.languages) ? data.languages : ["Hindi", "English"]
    };

    db.saveDoctor(newDoctor);
    db.logActivity("admin", "Create Doctor", `Registered Ayurvedic Doctor ${newDoctor.name}`);
    return newDoctor;
  }

  /**
   * Update doctor profile
   */
  updateDoctor(id: string, updates: any) {
    const existing = db.getDoctorById(id);
    if (!existing) {
      throw { status: 404, message: "Doctor not found" };
    }

    const updatedDoctor: Doctor = {
      ...existing,
      ...updates,
      experienceYears: updates.experienceYears !== undefined 
        ? Number(updates.experienceYears) 
        : (updates.experience !== undefined ? Number(updates.experience) : existing.experienceYears),
      fee: updates.fee !== undefined 
        ? Number(updates.fee) 
        : (updates.consultationFee !== undefined ? Number(updates.consultationFee) : existing.fee),
      rating: updates.rating !== undefined ? Number(updates.rating) : existing.rating
    };

    db.saveDoctor(updatedDoctor);
    db.logActivity("admin", "Update Doctor", `Updated profile of Doctor ${existing.name}`);
    return updatedDoctor;
  }

  /**
   * Delete doctor profile
   */
  deleteDoctor(id: string) {
    const existing = db.getDoctorById(id);
    if (!existing) {
      throw { status: 404, message: "Doctor not found" };
    }

    db.deleteDoctor(id);
    db.logActivity("admin", "Delete Doctor", `Removed Doctor ${existing.name}`);
    return true;
  }
}

export const doctorService = new DoctorService();
