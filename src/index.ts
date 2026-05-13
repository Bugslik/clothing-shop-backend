import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174", "https://clothing-shop-alpha-weld.vercel.app"], credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "hined.fits API",
    version: "1.0.0",
    status: "ok",
    endpoints: ["/products", "/auth", "/orders"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
