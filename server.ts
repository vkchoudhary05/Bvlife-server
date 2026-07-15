/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";

// Import MySQL
import { initMysqlPool, initTables } from "./server/mysqlClient.js";

// Import modular routes
import { authRouter } from "./server/routes/authRoutes.js";
import { productRouter } from "./server/routes/productRoutes.js";
import { orderRouter } from "./server/routes/orderRoutes.js";
import { aiRouter } from "./server/routes/aiRoutes.js";

const app = express();
const PORT = 5000;

// Global Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Mount API routes
app.use(authRouter);
app.use(productRouter);
app.use(orderRouter);
app.use(aiRouter);

async function startServer() {
  console.log("========================================");
  console.log("🚀 Starting Grams Life Backend...");
  console.log("========================================");

  // Check environment variables
  console.log("MYSQL_HOST:", process.env.MYSQL_HOST);
  console.log("MYSQL_DATABASE:", process.env.MYSQL_DATABASE);

  // Initialize MySQL
  try {
    const pool = await initMysqlPool();

    if (pool) {
      await initTables();
      console.log("✅ MySQL initialization completed.");
    } else {
      console.warn("⚠️ MySQL is not configured.");
    }
  } catch (error) {
    console.error("❌ Error initializing MySQL:", error);
  }

  const isStandaloneApi = process.env.STANDALONE_API === "true";

  if (isStandaloneApi) {
    console.log(
      "Starting server in Standalone API-only mode (No Vite or static frontend serving)..."
    );
  } else if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");

    try {
      const { createServer: createViteServer } = await import("vite");

      const vite = await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });

      app.use(vite.middlewares);
    } catch (err) {
      console.warn(
        "⚠️ Vite is not available in backend. Running standalone."
      );
    }
  } else {
    console.log("Starting server in production mode serving static frontend...");

    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const portToUse = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : PORT;

  app.listen(portToUse, "0.0.0.0", () => {
    console.log("========================================");
    console.log(`✅ Server running on http://0.0.0.0:${portToUse}`);
    console.log(`🌐 Environment : ${process.env.NODE_ENV || "development"}`);
    console.log(`🗄️ Database    : ${process.env.MYSQL_DATABASE}`);
    console.log(`📡 Host        : ${process.env.MYSQL_HOST}`);
    console.log("========================================");
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
});