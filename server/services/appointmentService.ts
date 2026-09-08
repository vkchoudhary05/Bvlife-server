/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../dbManager.js";

export class AppointmentService {
  /**
   * Get all doctor appointments
   */
  getAppointments() {
    return db.getDoctorAppointments();
  }

  /**
   * Get appointments for a specific user email
   */
  getAppointmentsByUser(email: string) {
    if (!email) {
      throw { status: 400, message: "Patient email is required" };
    }
    return db.getDoctorAppointmentsByUser(email);
  }

  /**
   * Book a doctor appointment
   */
  bookAppointment(data: any) {
    const {
      doctorId,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientEmail,
      date,
      timeSlot,
      consultationMode,
      healthConcern,
      previousHistory,
      medicalReports,
      fee
    } = data;

    if (!patientName || !patientPhone || !patientEmail || !date || !timeSlot) {
      throw {
        status: 400,
        message: "Please provide all required booking details (Name, Phone, Email, Date, and Time Slot)"
      };
    }

    const doctor = doctorId ? db.getDoctorById(doctorId) : undefined;

    const appointment = db.bookDoctorAppointment({
      doctorId: doctor?.id || doctorId || 'doc-1',
      doctorName: doctor?.name || data.doctorName || 'Dr. Rajeshwar Sharma',
      doctorSpecialty: doctor?.specialties?.[0] || data.doctorSpecialty || 'Senior Ayurvedic Specialist',
      doctorImage: doctor?.image || data.doctorImage,
      doctorQualification: doctor?.qualification || data.doctorQualification,
      patientName,
      patientAge: Number(patientAge) || 30,
      patientGender: patientGender || 'Other',
      patientPhone,
      patientEmail,
      date,
      timeSlot,
      consultationMode: consultationMode || 'video',
      healthConcern: healthConcern || 'Holistic Ayurvedic Assessment',
      previousHistory: previousHistory || '',
      medicalReports: Array.isArray(medicalReports) ? medicalReports : [],
      fee: Number(fee) || doctor?.fee || 499
    });

    db.logActivity(
      patientEmail,
      "Booked Doctor Appointment",
      `Booked appointment ${appointment.id} with ${appointment.doctorName} for ${appointment.date} at ${appointment.timeSlot}`
    );

    return appointment;
  }

  /**
   * Update appointment status
   */
  updateAppointmentStatus(id: string, status: string) {
    if (!['Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      throw { status: 400, message: "Invalid status value. Must be Confirmed, Completed, or Cancelled." };
    }

    const updated = db.updateDoctorAppointmentStatus(id, status as 'Confirmed' | 'Completed' | 'Cancelled');
    if (!updated) {
      throw { status: 404, message: "Appointment not found" };
    }
    return updated;
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string) {
    const cancelled = db.cancelDoctorAppointment(id);
    if (!cancelled) {
      throw { status: 404, message: "Appointment not found or already cancelled" };
    }
    return true;
  }

  /**
   * Save doctor's digital prescription
   */
  savePrescription(id: string, prescriptionData: any) {
    if (!prescriptionData || !prescriptionData.diagnosis) {
      throw { status: 400, message: "Diagnosis and prescription details are required" };
    }
    const updated = db.saveDoctorPrescription(id, prescriptionData);
    if (!updated) {
      throw { status: 404, message: "Appointment not found" };
    }
    return updated;
  }

  /**
   * Update video meeting link & platform (Option B: Google Meet / Jitsi)
   */
  updateMeetingLink(id: string, meetingLink: string, meetingPlatform?: 'jitsi' | 'google-meet') {
    if (!meetingLink) {
      throw { status: 400, message: "Meeting link is required" };
    }
    const updated = db.updateAppointmentMeetingLink(id, meetingLink, meetingPlatform);
    if (!updated) {
      throw { status: 404, message: "Appointment not found" };
    }
    return updated;
  }

  /**
   * Update live room status
   */
  updateRoomStatus(id: string, roomStatus: 'waiting' | 'in-progress' | 'completed') {
    const updated = db.updateAppointmentRoomStatus(id, roomStatus);
    if (!updated) {
      throw { status: 404, message: "Appointment not found" };
    }
    return updated;
  }
}

export const appointmentService = new AppointmentService();
