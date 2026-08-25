/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { 
  getDoctors,
  getDoctorById,
  getDoctorAppointments,
  getDoctorAppointmentsByUser,
  bookDoctorAppointment,
  updateDoctorAppointmentStatus,
  cancelDoctorAppointment
} from "../controllers/doctorController.js";
import { optionalAuthenticateToken, authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

export const doctorRouter = Router();

// Public / Semi-public Doctor Endpoints
doctorRouter.get("/api/doctors", getDoctors);
doctorRouter.get("/api/doctors/:id", getDoctorById);

// Appointment Endpoints
doctorRouter.get("/api/doctor-appointments", optionalAuthenticateToken, getDoctorAppointments);
doctorRouter.get("/api/doctor-appointments/user/:email", optionalAuthenticateToken, getDoctorAppointmentsByUser);
doctorRouter.post("/api/doctor-appointments", optionalAuthenticateToken, bookDoctorAppointment);
doctorRouter.put("/api/doctor-appointments/:id/status", optionalAuthenticateToken, updateDoctorAppointmentStatus);
doctorRouter.delete("/api/doctor-appointments/:id", optionalAuthenticateToken, cancelDoctorAppointment);
