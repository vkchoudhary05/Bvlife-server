import { Router } from "express";
import { getOrders, getOrdersByUser, placeOrder, updateOrder, getPayments, updatePayment } from "../controllers/orderController";
export const orderRouter = Router();
orderRouter.get("/api/orders", getOrders);
orderRouter.get("/api/orders/user/:email", getOrdersByUser);
orderRouter.post("/api/orders", placeOrder);
orderRouter.put("/api/orders/:id", updateOrder);
orderRouter.get("/api/payments", getPayments);
orderRouter.put("/api/payments/:id", updatePayment);
