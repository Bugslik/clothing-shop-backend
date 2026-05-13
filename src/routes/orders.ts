import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import https from "https";

const TELEGRAM_TOKEN = "8893912015:AAFAGjVtXxB62leIJV1lsa5xiOrZTjSxmGA";
const TELEGRAM_CHAT_ID = "1412908901";

function sendTelegramMessage(text: string) {
  const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" });
  const req = https.request({
    hostname: "api.telegram.org",
    path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  });
  req.write(body);
  req.end();
}

const router = Router();
const prisma = new PrismaClient();

// POST /orders  — create order from cart
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { items } = req.body as {
    items: { productId: number; size: string; qty: number }[];
  };
  if (!items || items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  // fetch products to calculate real prices (never trust client-sent prices)
  const productIds = items.map((i) => i.productId);
  const [products, user] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } } }),
    prisma.user.findUnique({ where: { id: req.user!.id } }),
  ]);

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    return {
      productId: item.productId,
      size: item.size,
      qty: item.qty,
      price: product.price,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const credit = user?.bonusCredit ?? 0;
  const creditApplied = Math.min(credit, subtotal);
  const total = parseFloat((subtotal - creditApplied).toFixed(2));

  const order = await prisma.order.create({
    data: {
      userId: req.user!.id,
      total,
      items: { create: orderItems },
    },
    include: { items: { include: { product: true } } },
  });

  // earn 5% of this order's subtotal as bonus credit for next order
  const earned = parseFloat((subtotal * 0.05).toFixed(2));
  const remainingCredit = parseFloat((credit - creditApplied + earned).toFixed(2));
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { bonusCredit: remainingCredit },
  });

  const orderDate = new Date(order.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });
  const itemLines = order.items.map(i => `  • ${i.product.name} x${i.qty} (${i.size}) — $${(i.price * i.qty).toFixed(2)}`).join("\n");
  sendTelegramMessage(
    `🛍 <b>New Order #${order.id}</b>\n` +
    `📅 ${orderDate}\n\n` +
    `👤 <b>Client:</b> ${user!.name}\n` +
    `📧 ${user!.email}\n\n` +
    `📦 <b>Items:</b>\n${itemLines}\n\n` +
    `💰 <b>Total: $${order.total.toFixed(2)}</b>` +
    (creditApplied > 0 ? ` (discount: $${creditApplied.toFixed(2)})` : "")
  );

  res.status(201).json({ ...order, creditApplied, earned, nextCredit: remainingCredit });
});

// GET /orders/mine  — current user's orders
router.get("/mine", requireAuth, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

// GET /orders/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: { include: { product: true } } },
  });
  if (!order || order.userId !== req.user!.id) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

// POST /orders/:id/cancel
router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!order || order.userId !== req.user!.id) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "PENDING") {
    res.status(400).json({ error: "Only pending orders can be cancelled" });
    return;
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });
  res.json(updated);
});

export default router;
