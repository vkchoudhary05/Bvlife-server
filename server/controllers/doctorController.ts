/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { doctorService } from "../services/doctorService.js";

export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctors = doctorService.getDoctors();
    res.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: "Failed to retrieve doctors" });
  }
};

export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doctor = doctorService.getDoctorById(id);
    res.json(doctor);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to retrieve doctor" });
  }
};

export const createDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const newDoc = doctorService.createDoctor(req.body);
    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error("Error creating doctor:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to create doctor" });
  }
};

export const updateDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = doctorService.updateDoctor(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating doctor:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to update doctor" });
  }
};

export const deleteDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    doctorService.deleteDoctor(id);
    res.json({ success: true, message: "Doctor profile deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting doctor:", error);
    res.status(error.status || 500).json({ error: error.message || "Failed to delete doctor" });
  }
};
