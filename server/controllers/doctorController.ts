/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { db } from "../dbManager.js";

export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctors = db.getDoctors();
    res.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: "Failed to retrieve doctors list" });
  }
};

export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doctor = db.getDoctorById(id);
    if (!doctor) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }
    res.json(doctor);
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({ error: "Failed to retrieve doctor details" });
  }
};

export const getDoctorAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointments = db.getDoctorAppointments();
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Failed to retrieve appointments" });
  }
};

export const getDoctorAppointmentsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;
    if (!email) {
      res.status(400).json({ error: "Patient email is required" });
      return;
    }
    const appointments = db.getDoctorAppointmentsByUser(email);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    res.status(500).json({ error: "Failed to retrieve patient appointments" });
  }
};

export const bookDoctorAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
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
      fee
    } = req.body;

    if (!patientName || !patientPhone || !patientEmail || !date || !timeSlot) {
      res.status(400).json({ error: "Please provide all required booking details (Name, Phone, Email, Date, and Time Slot)" });
      return;
    }

    // Get doctor info if doctorId provided
    const doctor = doctorId ? db.getDoctorById(doctorId) : undefined;

    const appointment = db.bookDoctorAppointment({
      doctorId: doctor?.id || doctorId || 'doc-1',
      doctorName: doctor?.name || req.body.doctorName || 'Dr. Rajeshwar Sharma',
      doctorSpecialty: doctor?.specialties?.[0] || req.body.doctorSpecialty || 'Senior Ayurvedic Specialist',
      doctorImage: doctor?.image || req.body.doctorImage,
      doctorQualification: doctor?.qualification || req.body.doctorQualification,
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
      fee: Number(fee) || doctor?.fee || 499
    });

    db.logActivity(patientEmail, "Booked Doctor Appointment", `Booked appointment ${appointment.id} with ${appointment.doctorName} for ${appointment.date} at ${appointment.timeSlot}`);

    res.status(201).json({
      success: true,
      message: "Doctor consultation booked successfully!",
      appointment
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ error: "Failed to schedule appointment. Please try again." });
  }
};

export const updateDoctorAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      res.status(400).json({ error: "Invalid status value. Must be Confirmed, Completed, or Cancelled." });
      return;
    }

    const updated = db.updateDoctorAppointmentStatus(id, status);
    if (!updated) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment: updated
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
};

export const cancelDoctorAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cancelled = db.cancelDoctorAppointment(id);
    if (!cancelled) {
      res.status(404).json({ error: "Appointment not found or already cancelled" });
      return;
    }
    res.json({
      success: true,
      message: "Consultation slot successfully cancelled."
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
};
