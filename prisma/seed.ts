import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kitia.com' },
    update: {},
    create: {
      uid: 'U-000001',
      email: 'admin@kitia.com',
      password: adminPassword,
      name: 'مدیر سیستم',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Test Users
  const testUser1Password = await bcrypt.hash('password123', 10);
  const testUser1 = await prisma.user.upsert({
    where: { email: 'user1@test.com' },
    update: {},
    create: {
      uid: 'U-000002',
      email: 'user1@test.com',
      password: testUser1Password,
      name: 'کاربر تست یک',
      role: 'USER',
    },
  });
  console.log('✅ Created test user 1:', testUser1.email);

  // Create promo code for test user 1
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.promoCode.upsert({
    where: { userId: testUser1.id },
    update: {},
    create: {
      code: 'WELCOME-TEST1',
      userId: testUser1.id,
      expiresAt,
      isUsed: false,
    },
  });
  console.log('✅ Created promo code for test user 1');

  const testUser2Password = await bcrypt.hash('password123', 10);
  const testUser2 = await prisma.user.upsert({
    where: { email: 'user2@test.com' },
    update: {},
    create: {
      uid: 'U-000003',
      email: 'user2@test.com',
      password: testUser2Password,
      name: 'کاربر تست دو',
      role: 'USER',
    },
  });
  console.log('✅ Created test user 2:', testUser2.email);

  // Create used promo code for test user 2
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1);

  await prisma.promoCode.upsert({
    where: { userId: testUser2.id },
    update: {},
    create: {
      code: 'WELCOME-TEST2',
      userId: testUser2.id,
      expiresAt: expiredDate,
      isUsed: true,
    },
  });
  console.log('✅ Created used promo code for test user 2');

  // Create Sample Products
  const products = [
    {
      name: 'لپ‌تاپ ایسوس',
      description: 'لپ‌تاپ 15.6 اینچی ایسوس با پردازنده Core i7 و 16GB RAM',
      price: 35000000,
      stock: 10,
      images: ['/images/laptop-1.jpg'],
      isActive: true,
    },
    {
      name: 'گوشی سامسونگ گلکسی',
      description: 'گوشی هوشمند سامسونگ با صفحه 6.5 اینچی و دوربین 64 مگاپیکسل',
      price: 18000000,
      stock: 25,
      images: ['/images/phone-1.jpg'],
      isActive: true,
    },
    {
      name: 'هدفون بی‌سیم سونی',
      description: 'هدفون بی‌سیم با کیفیت صدای عالی و نویز کنسلینگ',
      price: 3500000,
      stock: 50,
      images: ['/images/headphone-1.jpg'],
      isActive: true,
    },
    {
      name: 'ماوس گیمینگ لاجیتک',
      description: 'ماوس گیمینگ با نور RGB و 12000 DPI',
      price: 850000,
      stock: 100,
      images: ['/images/mouse-1.jpg'],
      isActive: true,
    },
    {
      name: 'کیبورد مکانیکی',
      description: 'کیبورد مکانیکی با سوییچ آبی و نور پس‌زمینه RGB',
      price: 1200000,
      stock: 75,
      images: ['/images/keyboard-1.jpg'],
      isActive: true,
    },
    {
      name: 'مانیتور 27 اینچ LG',
      description: 'مانیتور 4K با فرکانس 144Hz مناسب برای گیمینگ',
      price: 8500000,
      stock: 15,
      images: ['/images/monitor-1.jpg'],
      isActive: true,
    },
    {
      name: 'هارد اکسترنال 2TB',
      description: 'هارد اکسترنال پرسرعت با پورت USB 3.0',
      price: 2800000,
      stock: 40,
      images: ['/images/hdd-1.jpg'],
      isActive: true,
    },
    {
      name: 'وب‌کم لاجیتک',
      description: 'وب‌کم Full HD با میکروفون داخلی',
      price: 1500000,
      stock: 60,
      images: ['/images/webcam-1.jpg'],
      isActive: true,
    },
    {
      name: 'اسپیکر بلوتوثی JBL',
      description: 'اسپیکر بلوتوثی قابل حمل با باتری 20 ساعته',
      price: 2200000,
      stock: 30,
      images: ['/images/speaker-1.jpg'],
      isActive: true,
    },
    {
      name: 'تبلت اپل iPad',
      description: 'تبلت 10.2 اینچی اپل با قلم Apple Pencil',
      price: 16000000,
      stock: 8,
      images: ['/images/tablet-1.jpg'],
      isActive: true,
    },
  ];

  for (const product of products) {
    const existingProduct = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: product,
      });
    }
  }
  console.log(`✅ Created ${products.length} products`);

  // Create Sample Transactions
  const product1 = await prisma.product.findFirst({ where: { name: 'لپ‌تاپ ایسوس' } });
  const product2 = await prisma.product.findFirst({ where: { name: 'گوشی سامسونگ گلکسی' } });

  if (product1 && product2) {
    // Completed transaction
    const transaction1 = await prisma.transaction.create({
      data: {
        userId: testUser2.id,
        amount: 35000000,
        status: 'COMPLETED',
        transactionCode: 'TXN-' + Date.now() + '-1',
        zarinpalAuthority: 'A00000000000000000000000000001',
      },
    });

    await prisma.transactionItem.create({
      data: {
        transactionId: transaction1.id,
        productId: product1.id,
        quantity: 1,
        price: 35000000,
      },
    });

    await prisma.invoice.create({
      data: {
        transactionId: transaction1.id,
        invoiceNumber: 'INV-' + Date.now() + '-1',
      },
    });

    console.log('✅ Created completed transaction with invoice');

    // Pending transaction
    await prisma.transaction.create({
      data: {
        userId: testUser1.id,
        amount: 18000000,
        status: 'PENDING',
        transactionCode: 'TXN-' + Date.now() + '-2',
      },
    });

    console.log('✅ Created pending transaction');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
