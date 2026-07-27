/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Production-grade HTTP Request Logger.
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on("finish", () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        console.log(`[API] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });
    next();
};
/**
 * Global Error Handler Middleware.
 * Catches unhandled errors and returns standardized JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "An unexpected internal server error occurred.";
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
};
