/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { appointmentService } from "../services/appointmentService.js";
export const getDoctorAppointments = async (req, res) => {
    try {
        const appointments = appointmentService.getAppointments();
        res.json(appointments);
    }
    catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ error: "Failed to retrieve appointments" });
    }
};
export const getDoctorAppointmentsByUser = async (req, res) => {
    try {
        const email = req.params.email;
        const appointments = appointmentService.getAppointmentsByUser(email);
        res.json(appointments);
    }
    catch (error) {
        console.error("Error fetching patient appointments:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to retrieve patient appointments" });
    }
};
export const bookDoctorAppointment = async (req, res) => {
    try {
        const appointment = appointmentService.bookAppointment(req.body);
        res.status(201).json({
            success: true,
            message: "Doctor consultation booked successfully!",
            appointment
        });
    }
    catch (error) {
        console.error("Error booking appointment:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to schedule appointment. Please try again." });
    }
};
export const updateDoctorAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = appointmentService.updateAppointmentStatus(id, status);
        res.json({
            success: true,
            message: `Appointment status updated to ${status}`,
            appointment: updated
        });
    }
    catch (error) {
        console.error("Error updating appointment status:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to update appointment status" });
    }
};
export const cancelDoctorAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        appointmentService.cancelAppointment(id);
        res.json({
            success: true,
            message: "Consultation slot successfully cancelled."
        });
    }
    catch (error) {
        console.error("Error cancelling appointment:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to cancel appointment" });
    }
};
export const saveDoctorPrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = appointmentService.savePrescription(id, req.body);
        res.json({
            success: true,
            message: "Prescription successfully generated and attached to consultation.",
            appointment: updated
        });
    }
    catch (error) {
        console.error("Error saving prescription:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to save prescription" });
    }
};
export const updateAppointmentMeetingLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { meetingLink, meetingPlatform } = req.body;
        const updated = appointmentService.updateMeetingLink(id, meetingLink, meetingPlatform);
        res.json({
            success: true,
            message: "Meeting link updated successfully",
            appointment: updated
        });
    }
    catch (error) {
        console.error("Error updating meeting link:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to update meeting link" });
    }
};
export const updateAppointmentRoomStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { roomStatus } = req.body;
        const updated = appointmentService.updateRoomStatus(id, roomStatus);
        res.json({
            success: true,
            appointment: updated
        });
    }
    catch (error) {
        console.error("Error updating room status:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to update room status" });
    }
};
export const updateAppointmentWhatsAppStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { sent } = req.body;
        const updated = appointmentService.updateWhatsAppConfirmationStatus(id, sent !== false);
        res.json({
            success: true,
            message: "WhatsApp confirmation status updated",
            appointment: updated
        });
    }
    catch (error) {
        console.error("Error updating WhatsApp confirmation status:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to update WhatsApp status" });
    }
};
export const resendAppointmentWhatsAppAlert = async (req, res) => {
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
    }
    catch (error) {
        console.error("Error resending automated WhatsApp alert:", error);
        res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp alert" });
    }
};
