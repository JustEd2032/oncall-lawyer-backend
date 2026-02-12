import "./config/env.js";
import express from "express";
import cors from "cors";
import paymentsRouter from "./routes/payments.js";
import testRouter from "./routes/test.js";
import userRoutes from "./routes/users.js";
import lawyerRoutes from "./routes/lawyers.js";
import appointmentRoutes from "./routes/appointments.js";
import paymentConfirmRoutes from "./routes/payments-confirm.js";
import webhookRoutes from "./routes/webhooks.js";


const app = express();
app.use(cors({
  origin: "http://localhost:5173"
}));
app.use(express.json());

app.use("/payments", paymentsRouter);

app.use("/payments", paymentConfirmRoutes);

app.use("/test", testRouter);

app.use("/users", userRoutes);

app.use("/lawyers", lawyerRoutes);

app.use("/appointments", appointmentRoutes);

app.use("/webhooks", webhookRoutes);

app.use(express.json());


app.get("/", (req, res) => {
  res.send("Lawyer API is running 🚀");
});

app.get("/health", (req, res) => {
  res.send("API is healthy");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
