import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get next available UID
  const lastUser = await prisma.user.findFirst({
    orderBy: { uid: 'desc' },
  });

  const getNextUid = (lastUid?: string) => {
    if (!lastUid) return 'U-000001';
    const num = parseInt(lastUid.split('-')[1]) + 1;
    return `U-${num.toString().padStart(6, '0')}`;
  };

  let nextUid = getNextUid(lastUser?.uid);

  // Create Admin User
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kitia.com' },
    update: {},
    create: {
      uid: nextUid,
      email: 'admin@kitia.com',
      password: adminPassword,
      name: 'مدیر سیستم',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);
  nextUid = getNextUid(nextUid);

  // Create Test Users
  const testUser1Password = await bcrypt.hash('password123', 10);
  const testUser1 = await prisma.user.upsert({
    where: { email: 'user1@test.com' },
    update: {},
    create: {
      uid: nextUid,
      email: 'user1@test.com',
      password: testUser1Password,
      name: 'کاربر تست یک',
      role: 'USER',
    },
  });
  console.log('✅ Created test user 1:', testUser1.email);
  nextUid = getNextUid(nextUid);

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
      uid: nextUid,
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

  // Create Categories
  const categories = [
    { name: 'لپ‌تاپ و کامپیوتر', description: 'انواع لپ‌تاپ و کامپیوتر', slug: 'laptop-computer' },
    { name: 'موبایل و تبلت', description: 'گوشی و تبلت', slug: 'mobile-tablet' },
    { name: 'لوازم جانبی', description: 'لوازم جانبی کامپیوتر و موبایل', slug: 'accessories' },
    { name: 'صوتی و تصویری', description: 'محصولات صوتی و تصویری', slug: 'audio-video' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Created categories');

  // Create Tags
  const tags = [
    { name: 'پرفروش', slug: 'bestseller' },
    { name: 'تخفیف ویژه', slug: 'special-discount' },
    { name: 'جدید', slug: 'new' },
    { name: 'گیمینگ', slug: 'gaming' },
    { name: 'حرفه‌ای', slug: 'professional' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }
  console.log('✅ Created tags');

  // Get created categories and tags
  const laptopCategory = await prisma.category.findUnique({ where: { slug: 'laptop-computer' } });
  const mobileCategory = await prisma.category.findUnique({ where: { slug: 'mobile-tablet' } });
  const accessoriesCategory = await prisma.category.findUnique({ where: { slug: 'accessories' } });
  const audioVideoCategory = await prisma.category.findUnique({ where: { slug: 'audio-video' } });

  const bestsellerTag = await prisma.tag.findUnique({ where: { slug: 'bestseller' } });
  const newTag = await prisma.tag.findUnique({ where: { slug: 'new' } });
  const gamingTag = await prisma.tag.findUnique({ where: { slug: 'gaming' } });

  // Create Sample Products with relationships
  const productsData = [
    {
      name: 'لپ‌تاپ ایسوس ROG Strix G15',
      description: 'لپ‌تاپ 15.6 اینچی گیمینگ ایسوس با پردازنده AMD Ryzen 9، 16GB RAM DDR4، گرافیک RTX 3060، 512GB SSD NVMe، صفحه نمایش 144Hz Full HD، کیبورد RGB، سیستم خنک‌کننده پیشرفته',
      price: 45000000,
      stock: 12,
      images: ['https://via.placeholder.com/800x800.png?text=ASUS+ROG+Laptop'],
      isActive: true,
      categoryId: laptopCategory?.id,
      tagIds: [gamingTag?.id, bestsellerTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'لپ‌تاپ اپل MacBook Pro 14',
      description: 'لپ‌تاپ 14 اینچی اپل با چیپ M3 Pro، 18GB RAM، 512GB SSD، صفحه نمایش Liquid Retina XDR، باتری 17 ساعته، مناسب برای کارهای حرفه‌ای و برنامه‌نویسی',
      price: 85000000,
      stock: 5,
      images: ['https://via.placeholder.com/800x800.png?text=MacBook+Pro'],
      isActive: true,
      categoryId: laptopCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'گوشی سامسونگ Galaxy S24 Ultra',
      description: 'گوشی پرچمدار سامسونگ با صفحه 6.8 اینچی Dynamic AMOLED، دوربین 200 مگاپیکسلی، چیپست Snapdragon 8 Gen 3، 12GB RAM، 256GB حافظه، قلم S Pen، باتری 5000 میلی‌آمپر',
      price: 52000000,
      stock: 20,
      images: ['https://via.placeholder.com/800x800.png?text=Galaxy+S24+Ultra'],
      isActive: true,
      categoryId: mobileCategory?.id,
      tagIds: [bestsellerTag?.id, newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'گوشی اپل iPhone 15 Pro Max',
      description: 'آیفون 15 پرو مکس با صفحه 6.7 اینچی Super Retina XDR، چیپ A17 Pro، سیستم دوربین سه‌گانه 48MP، تیتانیوم فریم، 256GB حافظه، پورت USB-C، قابلیت فیلمبرداری 4K ProRes',
      price: 68000000,
      stock: 15,
      images: ['https://via.placeholder.com/800x800.png?text=iPhone+15+Pro+Max'],
      isActive: true,
      categoryId: mobileCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'هدفون بی‌سیم سونی WH-1000XM5',
      description: 'هدفون بی‌سیم با بهترین نویز کنسلینگ موجود، صدای Hi-Res Audio، 30 ساعت شارژ باتری، قابلیت اتصال چند دستگاه، کنترل لمسی، میکروفون با کیفیت بالا برای تماس',
      price: 14500000,
      stock: 35,
      images: ['https://via.placeholder.com/800x800.png?text=Sony+WH-1000XM5'],
      isActive: true,
      categoryId: audioVideoCategory?.id,
      tagIds: [bestsellerTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'ایرپاد پرو نسل سوم',
      description: 'ایرباد بی‌سیم اپل با نویز کنسلینگ فعال، صدای فضایی، ضد آب IPX4، کیس شارژ بی‌سیم MagSafe، 6 ساعت پخش موسیقی، کنترل لمسی پیشرفته',
      price: 11500000,
      stock: 40,
      images: ['https://via.placeholder.com/800x800.png?text=AirPods+Pro'],
      isActive: true,
      categoryId: audioVideoCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'ماوس گیمینگ لاجیتک G Pro X Superlight',
      description: 'ماوس گیمینگ حرفه‌ای با وزن فقط 63 گرم، سنسور HERO 25K با DPI تا 25600، باتری 70 ساعته، اتصال بی‌سیم LIGHTSPEED، سوییچ‌های مکانیکی، طراحی ambidextrous',
      price: 6500000,
      stock: 50,
      images: ['https://via.placeholder.com/800x800.png?text=Logitech+G+Pro'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [gamingTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'کیبورد مکانیکی Keychron Q1 Pro',
      description: 'کیبورد مکانیکی 75% با بدنه آلومینیومی CNC، سوییچ‌های Hot-swappable، اتصال بی‌سیم و باسیم، نور پس‌زمینه RGB، فوم عایق صدا، کیت کامل با کیکپ PBT',
      price: 8900000,
      stock: 25,
      images: ['https://via.placeholder.com/800x800.png?text=Keychron+Q1+Pro'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'مانیتور گیمینگ ASUS ROG Swift 27"',
      description: 'مانیتور 27 اینچ با رزولوشن 2K QHD، فرکانس 240Hz، زمان پاسخ 1ms، پنل IPS، HDR400، G-Sync Compatible، پایه ergonomic قابل تنظیم، مناسب برای گیمینگ حرفه‌ای',
      price: 18500000,
      stock: 10,
      images: ['https://via.placeholder.com/800x800.png?text=ASUS+ROG+Monitor'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [gamingTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'هارد اکسترنال SSD Samsung T7 2TB',
      description: 'هارد SSD اکسترنال پرسرعت با سرعت خواندن 1050MB/s، پورت USB 3.2 Gen 2، رمزنگاری سخت‌افزاری AES 256-bit، مقاوم در برابر ضربه، ضمانت 3 ساله',
      price: 9500000,
      stock: 30,
      images: ['https://via.placeholder.com/800x800.png?text=Samsung+T7+SSD'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [bestsellerTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'وب‌کم Logitech Brio 4K',
      description: 'وب‌کم حرفه‌ای با کیفیت 4K Ultra HD، HDR، تنظیم خودکار نور، میکروفون استریو، فوکوس خودکار، زاویه دید قابل تنظیم، مناسب استریمینگ و کنفرانس',
      price: 7200000,
      stock: 20,
      images: ['https://via.placeholder.com/800x800.png?text=Logitech+Brio'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [],
    },
    {
      name: 'اسپیکر بلوتوثی JBL Charge 5',
      description: 'اسپیکر قابل حمل با صدای 360 درجه، باتری 20 ساعته، ضد آب IP67، قابلیت شارژ دستگاه‌های دیگر، اتصال PartyBoost برای کانکت چند اسپیکر، باس قدرتمند',
      price: 6800000,
      stock: 45,
      images: ['https://via.placeholder.com/800x800.png?text=JBL+Charge+5'],
      isActive: true,
      categoryId: audioVideoCategory?.id,
      tagIds: [bestsellerTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'تبلت اپل iPad Pro 12.9 M2',
      description: 'تبلت 12.9 اینچی با چیپ M2، صفحه Liquid Retina XDR، 8GB RAM، 256GB حافظه، دوربین 12MP، پشتیبانی از Apple Pencil 2، Magic Keyboard، مناسب طراحی و کارهای گرافیکی',
      price: 48000000,
      stock: 8,
      images: ['https://via.placeholder.com/800x800.png?text=iPad+Pro'],
      isActive: true,
      categoryId: mobileCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'ساعت هوشمند Apple Watch Series 9',
      description: 'ساعت هوشمند اپل با چیپ S9، صفحه Always-On Retina، سنسورهای سلامتی پیشرفته، ردیابی ورزش، مقاوم در برابر آب، GPS، باتری 18 ساعته',
      price: 18500000,
      stock: 15,
      images: ['https://via.placeholder.com/800x800.png?text=Apple+Watch'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [newTag?.id].filter(Boolean) as string[],
    },
    {
      name: 'پاوربانک شیائومی 20000mAh',
      description: 'پاوربانک ظرفیت بالا با شارژ سریع 33W، دو پورت USB-A و یک پورت USB-C، نمایشگر LED، محافظت چندگانه، شارژ همزمان 3 دستگاه',
      price: 1850000,
      stock: 80,
      images: ['https://via.placeholder.com/800x800.png?text=Xiaomi+Powerbank'],
      isActive: true,
      categoryId: accessoriesCategory?.id,
      tagIds: [bestsellerTag?.id].filter(Boolean) as string[],
    },
  ];

  for (const productData of productsData) {
    const existingProduct = await prisma.product.findFirst({
      where: { name: productData.name },
    });

    if (!existingProduct) {
      const { tagIds, ...productFields } = productData;
      await prisma.product.create({
        data: {
          ...productFields,
          tags: {
            connect: tagIds.map(id => ({ id })),
          },
        },
      });
    }
  }
  console.log(`✅ Created ${productsData.length} products`);

  // Create Sample Transactions
  const product1 = await prisma.product.findFirst({ where: { name: 'لپ‌تاپ ایسوس ROG Strix G15' } });
  const product2 = await prisma.product.findFirst({ where: { name: 'گوشی سامسونگ Galaxy S24 Ultra' } });

  if (product1 && product2) {
    // Completed transaction
    const transaction1 = await prisma.transaction.create({
      data: {
        userId: testUser2.id,
        amount: 45000000,
        status: 'COMPLETED',
        transactionCode: 'TXN-' + Date.now() + '-1',
        zarinpalAuthority: 'A00000000000000000000000000001',
        zarinpalRefId: Date.now().toString(),
        paymentMethod: 'ZARINPAL',
      },
    });

    await prisma.transactionItem.create({
      data: {
        transactionId: transaction1.id,
        productId: product1.id,
        quantity: 1,
        price: 45000000,
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
        amount: 52000000,
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
