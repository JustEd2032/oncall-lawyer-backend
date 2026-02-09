import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentsRouter from "./routes/payments.js";
import testRouter from "./routes/test.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/payments", paymentsRouter);

app.use("/test", testRouter);

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
