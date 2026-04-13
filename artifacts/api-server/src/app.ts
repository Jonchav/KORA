import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));

// Stripe webhooks need the raw body — must come BEFORE express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
