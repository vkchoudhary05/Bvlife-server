/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
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
// Health check route
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
    }
    else if (process.env.NODE_ENV !== "production") {
        console.log("Starting server in development mode with Vite middleware...");
        try {
            const { createServer: createViteServer } = await import("vite");
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: "spa",
            });
            app.use(vite.middlewares);
        }
        catch (err) {
            console.warn("Vite is not available in backend. Defaulting to standalone mode.");
        }
    }
    else {
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
        console.log(`[Grams Life Backend] Production-grade server is running on host 0.0.0.0 and port ${portToUse}`);
    });
}
startServer();
