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
  updateAppointmentRoomStatus
} from "../controllers/appointmentController.js";
import { optionalAuthenticateToken, authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

export const doctorRouter = Router();

// Public / Semi-public Doctor Endpoints
doctorRouter.get("/api/doctors", getDoctors);
doctorRouter.get("/api/doctors/:id", getDoctorById);
doctorRouter.post("/api/doctors", authenticateToken, requireAdmin, createDoctor);
doctorRouter.put("/api/doctors/:id", authenticateToken, requireAdmin, updateDoctor);
doctorRouter.delete("/api/doctors/:id", authenticateToken, requireAdmin, deleteDoctor);

// Appointment Endpoints
doctorRouter.get("/api/doctor-appointments", optionalAuthenticateToken, getDoctorAppointments);
doctorRouter.get("/api/doctor-appointments/user/:email", optionalAuthenticateToken, getDoctorAppointmentsByUser);
doctorRouter.post("/api/doctor-appointments", optionalAuthenticateToken, bookDoctorAppointment);
doctorRouter.put("/api/doctor-appointments/:id/status", optionalAuthenticateToken, updateDoctorAppointmentStatus);
doctorRouter.put("/api/doctor-appointments/:id/prescription", optionalAuthenticateToken, saveDoctorPrescription);
doctorRouter.put("/api/doctor-appointments/:id/meeting-link", optionalAuthenticateToken, updateAppointmentMeetingLink);
doctorRouter.put("/api/doctor-appointments/:id/room-status", optionalAuthenticateToken, updateAppointmentRoomStatus);
doctorRouter.delete("/api/doctor-appointments/:id", optionalAuthenticateToken, cancelDoctorAppointment);
