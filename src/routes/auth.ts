import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// POST /auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password and name are required" });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
    select: { id: true, email: true, name: true, role: true, bonusCredit: true },
  });
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  res.status(201).json({ user, token });
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, bonusCredit: user.bonusCredit },
    token,
  });
});

// GET /auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, bonusCredit: true },
  });
  res.json(user);
});

export default router;
