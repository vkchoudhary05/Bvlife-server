/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Router } from "express";
import { consult, getHistory, clearHistory, chat } from "../controllers/aiController.js";
import { optionalAuthenticateToken } from "../middleware/authMiddleware.js";
export const aiRouter = Router();
aiRouter.post("/api/ai/consult", optionalAuthenticateToken, consult);
aiRouter.get("/api/ai/history", optionalAuthenticateToken, getHistory);
aiRouter.delete("/api/ai/history", optionalAuthenticateToken, clearHistory);
aiRouter.post("/api/ai/chat", optionalAuthenticateToken, chat);
