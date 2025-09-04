// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // بيانات الرئيس
  const username = "badrturkistani";
  const password = "alahliclub1937badrleadr";

  // تحقق إن كان موجود
  const existing = await prisma.user.findUnique({
    where: { username }
  });

  if (existing) {
    console.log("ℹ️ حساب الرئيس موجود مسبقًا");
    return;
  }

  // شيفرة كلمة السر
  const hash = await bcrypt.hash(password, 10);

  // أنشئ الرئيس
  await prisma.user.create({
    data: {
      username,
      fullName: "Badr Turkistani",
      passwordHash: hash,
      role: "PRESIDENT",
      status: "ACTIVE"
    }
  });

  console.log("✅ تم إنشاء حساب الرئيس");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
