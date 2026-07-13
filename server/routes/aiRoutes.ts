import { Router } from "express";
import { 
  consult, 
  getHistory, 
  clearHistory, 
  chat 
} from "../controllers/aiController";

export const aiRouter = Router();

aiRouter.post("/api/ai/consult", consult);
aiRouter.get("/api/ai/history", getHistory);
aiRouter.delete("/api/ai/history", clearHistory);
aiRouter.post("/api/ai/chat", chat);
