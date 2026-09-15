/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

if (!process.env.MSG91_AUTH_KEY) {
  process.env.MSG91_AUTH_KEY = "555226ACqXDRqJuY6a69ae3dP1";
}

import express from "express";
import path from "path";
import cors from "cors";

// Import custom middleware
import { requestLogger, errorHandler } from "./server/middleware/errorMiddleware.js";

// Import modular routes
import { authRouter } from "./server/routes/authRoutes.js";
import { productRouter } from "./server/routes/productRoutes.js";
import { orderRouter } from "./server/routes/orderRoutes.js";
import { aiRouter } from "./server/routes/aiRoutes.js";
import { doctorRouter } from "./server/routes/doctorRoutes.js";
import { db } from "./server/dbManager.js";
import { isMysqlConfigured, getMysqlConfig } from "./server/mysqlClient.js";

const app = express();
const PORT = 5000; // Standalone port

// Global Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);

// =========================================================================
// APPROACH 1: DATABASE-FIRST / SINGLE SOURCE OF TRUTH MIDDLEWARE
// =========================================================================
// Ensures that whenever an API request is received, any external updates directly
// made to the MySQL database (e.g. via phpMyAdmin, Workbench, CLI, etc.)
// are immediately fetched directly from MySQL without relying on data/db.json!
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") && req.path !== "/api/health") {
    try {
      if (isMysqlConfigured()) {
        await db.refreshFromMysql(true);
      }
    } catch (err) {
      console.warn("MySQL live fetch check warning:", err);
    }
  }
  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Database status check
app.get("/api/db/status", (req, res) => {
  const configured = isMysqlConfigured();
  const config = configured ? getMysqlConfig() : null;
  res.json({
    mode: configured ? "mysql" : "local_file",
    mysqlConfigured: configured,
    architecture: "Approach 1: Single Source of Truth (Database-First Architecture)",
    dataSource: configured ? "Live MySQL Database" : "Local JSON Fallback (data/db.json)",
    bypassedFile: configured ? "data/db.json is completely bypassed" : "using fallback data/db.json because MySQL environment variables are not set",
    databaseHost: config?.host || null,
    databaseName: config?.database || null,
    databasePort: config?.port || null,
    singleSourceOfTruth: true,
    timestamp: new Date().toISOString()
  });
});

// Manual instant sync endpoint
app.post("/api/db/sync-now", async (req, res) => {
  try {
    const success = await db.refreshFromMysql(true);
    res.json({
      success,
      message: success 
        ? "Successfully refreshed data directly from live MySQL database!" 
        : "MySQL credentials not configured or database unreachable. Using local file store.",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to synchronize from MySQL" });
  }
});

// Mount modular API routes
app.use(authRouter);
app.use(productRouter);
app.use(orderRouter);
app.use(aiRouter);
app.use(doctorRouter);

// Global Error Handler
app.use(errorHandler);

// ==========================================
// VITE DEVELOPMENT MIDDLEWARE / PRODUCTION STATIC SERVING
// ==========================================

async function startServer() {
  const isStandaloneApi = process.env.STANDALONE_API === "true" || true; // Default to standalone API for separate backend

  if (isStandaloneApi) {
    console.log("Starting server in Standalone API-only mode (No Vite or static frontend serving)...");
  } else if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite is not available in backend. Defaulting to standalone mode.");
    }
  } else {
    console.log("Starting server in production mode serving static frontend...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Support any port via the PORT environment variable, defaulting to 5000 for local standalone backend
  const portToUse = process.env.PORT ? parseInt(process.env.PORT, 10) : PORT;

  app.listen(portToUse, "0.0.0.0", () => {
    console.log(`[Bv Life Backend] Production-grade server is running on host 0.0.0.0 and port ${portToUse}`);
  });
}

startServer();
