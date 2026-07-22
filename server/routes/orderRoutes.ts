import { Router } from "express";
import { 
  getOrders, 
  getOrdersByUser, 
  placeOrder, 
  updateOrder, 
  getPayments, 
  updatePayment,
  trackOrder
} from "../controllers/orderController.js";

export const orderRouter = Router();

orderRouter.get("/api/orders", getOrders);
orderRouter.get("/api/orders/user/:email", getOrdersByUser);
orderRouter.get("/api/orders/track/:identifier", trackOrder);
orderRouter.post("/api/orders", placeOrder);
orderRouter.put("/api/orders/:id", updateOrder);


orderRouter.get("/api/payments", getPayments);
orderRouter.put("/api/payments/:id", updatePayment);
