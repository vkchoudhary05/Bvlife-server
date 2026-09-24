/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { 
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
} from "../controllers/doctorController.js";
import {
  getDoctorAppointments,
  getDoctorAppointmentsByUser,
  bookDoctorAppointment,
  updateDoctorAppointmentStatus,
  cancelDoctorAppointment,
  saveDoctorPrescription,
  updateAppointmentMeetingLink,
  updateAppointmentRoomStatus,
  updateAppointmentWhatsAppStatus,
  resendAppointmentWhatsAppAlert
} from "../controllers/appointmentController.js";
import { optionalAuthenticateToken, authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import { rateLimiter } from "../middleware/rateLimitMiddleware.js";

export const doctorRouter = Router();

// Public / Semi-public Doctor Endpoints
doctorRouter.get("/api/doctors", getDoctors);
doctorRouter.get("/api/doctors/:id", getDoctorById);
doctorRouter.post("/api/doctors", authenticateToken, requireAdmin, createDoctor);
doctorRouter.put("/api/doctors/:id", authenticateToken, requireAdmin, updateDoctor);
doctorRouter.delete("/api/doctors/:id", authenticateToken, requireAdmin, deleteDoctor);

// Appointment Endpoints
doctorRouter.get("/api/doctor-appointments", authenticateToken, requireAdmin, getDoctorAppointments);
doctorRouter.get("/api/doctor-appointments/user/:email", authenticateToken, getDoctorAppointmentsByUser);
doctorRouter.post("/api/doctor-appointments", rateLimiter(10), optionalAuthenticateToken, bookDoctorAppointment);
doctorRouter.post("/api/doctor-appointments/:id/resend-whatsapp", authenticateToken, requireAdmin, rateLimiter(3, 60_000), resendAppointmentWhatsAppAlert);
doctorRouter.put("/api/doctor-appointments/:id/status", authenticateToken, requireAdmin, updateDoctorAppointmentStatus);
doctorRouter.put("/api/doctor-appointments/:id/prescription", authenticateToken, requireAdmin, saveDoctorPrescription);
doctorRouter.put("/api/doctor-appointments/:id/meeting-link", authenticateToken, requireAdmin, updateAppointmentMeetingLink);
doctorRouter.put("/api/doctor-appointments/:id/room-status", authenticateToken, requireAdmin, updateAppointmentRoomStatus);
doctorRouter.put("/api/doctor-appointments/:id/whatsapp-confirmation", authenticateToken, requireAdmin, updateAppointmentWhatsAppStatus);
doctorRouter.delete("/api/doctor-appointments/:id", authenticateToken, requireAdmin, cancelDoctorAppointment);
