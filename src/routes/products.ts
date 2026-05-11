import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /products
router.get("/", async (req: Request, res: Response) => {
  const { category, search, featured } = req.query;
  const products = await prisma.product.findMany({
    where: {
      ...(category && category !== "All" ? { category: String(category) } : {}),
      ...(search ? { name: { contains: String(search), mode: "insensitive" } } : {}),
      ...(featured === "true" ? { featured: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(products);
});

// GET /products/:id
router.get("/:id", async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

// POST /products  (admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { name, price, category, sizes, colors, image, stock, featured } = req.body;
  if (!name || !price || !category || !image) {
    res.status(400).json({ error: "name, price, category and image are required" });
    return;
  }
  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      category,
      sizes: sizes ?? [],
      colors: colors ?? [],
      image,
      stock: Number(stock ?? 0),
      featured: Boolean(featured),
    },
  });
  res.status(201).json(product);
});

// PUT /products/:id  (admin only)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  const { name, price, category, sizes, colors, image, stock, featured } = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(sizes !== undefined ? { sizes } : {}),
      ...(colors !== undefined ? { colors } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(stock !== undefined ? { stock: Number(stock) } : {}),
      ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
    },
  });
  res.json(product);
});

// DELETE /products/:id  (admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Product deleted" });
});

export default router;
