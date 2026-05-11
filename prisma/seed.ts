import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@shop.com" },
    update: {},
    create: {
      email: "admin@shop.com",
      password: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  const FRONTEND = "http://localhost:5173";
  const products = [
    {
      name: "Oversized Linen Blazer",
      price: 14,
      category: "Tops",
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Dark-Blue"],
      image: `${FRONTEND}/photo_2026-03-29_23-00-28.jpg`,
      stock: 12,
      featured: true,
    },
    {
      name: "Wide-Leg Trousers",
      price: 21,
      category: "Bottoms",
      sizes: ["XS", "S", "M", "L"],
      colors: ["Black"],
      image: `${FRONTEND}/wide-leg-trausers.jpg`,
      stock: 8,
      featured: true,
    },
    {
      name: "Corteiz Long-sleeve",
      price: 17,
      category: "Tops",
      sizes: ["S", "M", "L"],
      colors: ["White"],
      image: `${FRONTEND}/corteiz-longsleeve.jpg`,
      stock: 20,
      featured: false,
    },
    {
      name: "Vintage Jacket",
      price: 24,
      category: "Outerwear",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Caramel", "Dark-Blue"],
      image: `${FRONTEND}/jacket.jpg`,
      stock: 5,
      featured: true,
    },
    {
      name: "Track-suits",
      price: 40,
      category: "Dresses",
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Black", "White"],
      image: `${FRONTEND}/tracksuits.jpg`,
      stock: 14,
      featured: false,
    },
    {
      name: "Sakura Jeans",
      price: 23,
      category: "Bottoms",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Sky-Blue", "Black"],
      image: `${FRONTEND}/sakurajeans.jpg`,
      stock: 18,
      featured: false,
    },
    {
      name: "Unique Jacket",
      price: 45,
      category: "Outerwear",
      sizes: ["XS", "S", "M", "L"],
      colors: ["Camel", "Black"],
      image: `${FRONTEND}/jacket-vintage.jpg`,
      stock: 6,
      featured: true,
    },
    {
      name: "Zip-hoodie",
      price: 25,
      category: "Outerwear",
      sizes: ["XS", "S", "M", "L"],
      colors: ["Black", "White", "Grey", "Dark-Blue", "Green"],
      image: `${FRONTEND}/zip-hoodie.jpg`,
      stock: 10,
      featured: false,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log("Seeded admin user and 8 products.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
