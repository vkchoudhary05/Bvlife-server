/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { appointmentService } from "../services/appointmentService.js";

export const getDoctorAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointments = appointmentService.getAppointments();
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Failed to retrieve appointments" });
  }
};

export const getDoctorAppointmentsByUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const isAdmin = req.user?.role === 'admin';
    if (!req.user || (!isAdmin && req.user.email.toLowerCase() !== email)) {
      res.status(403).json({ error: "You may only view your own appointments." });
      return;
    }
    const appointments = appointmentService.getAppointmentsByUser(email);
    res.json(appointments);
  } catch (error: any) {
    console.error("Error fetching patient appointments:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to retrieve patient appointments" });
  }
};

export const bookDoctorAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bookingDetails = req.user ? { ...req.body, patientEmail: req.user.email } : req.body;
    const appointment = appointmentService.bookAppointment(bookingDetails);
    res.status(201).json({
      success: true,
      message: "Doctor consultation booked successfully!",
      appointment
    });
  } catch (error: any) {
    console.error("Error booking appointment:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to schedule appointment. Please try again." });
  }
};

export const updateDoctorAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = appointmentService.updateAppointmentStatus(id, status);
    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment: updated
    });
  } catch (error: any) {
    console.error("Error updating appointment status:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to update appointment status" });
  }
};

export const cancelDoctorAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    appointmentService.cancelAppointment(id);
    res.json({
      success: true,
      message: "Consultation slot successfully cancelled."
    });
  } catch (error: any) {
    console.error("Error cancelling appointment:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to cancel appointment" });
  }
};

export const saveDoctorPrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = appointmentService.savePrescription(id, req.body);
    res.json({
      success: true,
      message: "Prescription successfully generated and attached to consultation.",
      appointment: updated
    });
  } catch (error: any) {
    console.error("Error saving prescription:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to save prescription" });
  }
};

export const updateAppointmentMeetingLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { meetingLink, meetingPlatform } = req.body;
    const updated = appointmentService.updateMeetingLink(id, meetingLink, meetingPlatform);
    res.json({
      success: true,
      message: "Meeting link updated successfully",
      appointment: updated
    });
  } catch (error: any) {
    console.error("Error updating meeting link:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to update meeting link" });
  }
};

export const updateAppointmentRoomStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roomStatus } = req.body;
    const updated = appointmentService.updateRoomStatus(id, roomStatus);
    res.json({
      success: true,
      appointment: updated
    });
  } catch (error: any) {
    console.error("Error updating room status:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to update room status" });
  }
};

export const updateAppointmentWhatsAppStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { sent } = req.body;
    const updated = appointmentService.updateWhatsAppConfirmationStatus(id, sent !== false);
    res.json({
      success: true,
      message: "WhatsApp confirmation status updated",
      appointment: updated
    });
  } catch (error: any) {
    console.error("Error updating WhatsApp confirmation status:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to update WhatsApp status" });
  }
};

export const resendAppointmentWhatsAppAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = appointmentService.getAppointments().find(a => a.id === id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const clinicResult = await appointmentService.dispatchWhatsAppAlerts(appointment);
    res.json({
      success: true,
      message: "Automated WhatsApp alert triggered successfully via MSG91",
      result: clinicResult
    });
  } catch (error: any) {
    console.error("Error resending automated WhatsApp alert:", error);
    res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp alert" });
  }
};

