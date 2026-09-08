/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { doctorService } from "../services/doctorService.js";
export const getDoctors = async (req, res) => {
    try {
        const doctors = doctorService.getDoctors();
        res.json(doctors);
    }
    catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ error: "Failed to retrieve doctors" });
    }
};
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = doctorService.getDoctorById(id);
        res.json(doctor);
    }
    catch (error) {
        res.status(error.status || 500).json({ error: error.message || "Failed to retrieve doctor" });
    }
};
export const createDoctor = async (req, res) => {
    try {
        const newDoc = doctorService.createDoctor(req.body);
        res.status(201).json(newDoc);
    }
    catch (error) {
        console.error("Error creating doctor:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to create doctor" });
    }
};
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = doctorService.updateDoctor(id, req.body);
        res.json(updated);
    }
    catch (error) {
        console.error("Error updating doctor:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to update doctor" });
    }
};
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        doctorService.deleteDoctor(id);
        res.json({ success: true, message: "Doctor profile deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting doctor:", error);
        res.status(error.status || 500).json({ error: error.message || "Failed to delete doctor" });
    }
};
