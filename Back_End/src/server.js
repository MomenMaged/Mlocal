import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import cors from "cors";
import ProductRouter from "./Router/ProductRouter.js"
import CategoryRouter from "./Router/CategoryRouter.js"
import UserRouter from "./Router/UserRouter.js"
import rateLimiter from "./middleware/rateLimiter.js";
import CartRouter from "./Router/CartRouter.js"
import OrderRouter from "./Router/OrderRouter.js"
import adminRouter from "./Router/AdminRouter.js";
import { handleStripeWebhook } from "./Controller/stripeWebhookController.js";
import { startOrderExpirationJob } from "./Jobs/expirePendingCardOrders.js";
import dotenv from "dotenv";

dotenv.config();

console.log("Environment Variables:", process.env.MONGO_URI);


const app = express();

const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    console.log("Webhook request received:", req.method, req.originalUrl);
  }
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());

app.use(rateLimiter)


app.use("/api/products", ProductRouter);
app.use("/api/category", CategoryRouter);
app.use("/api/user", UserRouter);
app.use("/api/cart", CartRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/admin", adminRouter);
 

connectDB().then(()=>{

  startOrderExpirationJob();
    app.listen(PORT, ()=>{
        console.log(`Server is running on ${PORT}`)
    })
})
