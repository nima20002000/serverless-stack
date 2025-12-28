# Kitia - پلتفرم فروشگاه آنلاین

## مراحل راه‌اندازی

### 1. نصب وابستگی‌ها

```bash
npm install
```

### 2. تنظیم پایگاه داده

ابتدا یک پایگاه داده PostgreSQL ایجاد کنید، سپس فایل `.env` را ویرایش کرده و اطلاعات اتصال را وارد کنید:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/kitia?schema=public"
```

### 3. اجرای مایگریشن‌های Prisma

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. راه‌اندازی سرور توسعه

```bash
npm run dev
```

پروژه روی `http://localhost:3000` در دسترس خواهد بود.

## معماری پروژه

برای مطالعه جزئیات کامل معماری، فایل `architecture.json` را مشاهده کنید.

### ساختار پوشه‌ها

```
/src
├── /app                 # Next.js App Router
│   ├── /api            # API Routes
│   ├── /(public)       # صفحات عمومی
│   ├── /(auth)         # صفحات احراز هویت
│   └── /admin          # پنل ادمین
├── /components         # کامپوننت‌های React
├── /lib                # ابزارها و کانفیگ‌ها
├── /services           # لایه منطق کسب‌وکار
├── /store              # مدیریت state با Zustand
├── /types              # تعاریف TypeScript
└── /config             # تنظیمات برنامه
```

## تکنولوژی‌های استفاده شده

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **Styling**: Tailwind CSS (RTL)
- **Icons**: Heroicons
- **Payment**: Zarinpal SDK
- **Language**: TypeScript

## قابلیت‌های اصلی

1. **سیستم کاربری**
   - ثبت‌نام و ورود
   - احراز هویت با NextAuth
   - نقش‌های کاربری (USER, ADMIN)

2. **سیستم تراکنش‌ها**
   - ایجاد کد یکتا برای هر تراکنش
   - پرداخت با زرین‌پال
   - ردیابی وضعیت تراکنش

3. **سیستم فاکتور**
   - ایجاد خودکار فاکتور پس از تراکنش موفق
   - امکان دانلود فاکتور

4. **کد تخفیف کاربران جدید**
   - کد تخفیف یکتا برای هر کاربر جدید
   - تایمر 24 ساعته

5. **پنل ادمین**
   - مدیریت محصولات
   - مدیریت کاربران
   - نمایش تراکنش‌ها

## دستورات مفید

```bash
# اجرای مود توسعه
npm run dev

# ساخت برای تولید
npm build

# اجرای نسخه تولید
npm start

# Lint
npm run lint

# Generate Prisma Client
npx prisma generate

# Prisma Studio (مشاهده دیتابیس)
npx prisma studio
```

## پشتیبان‌گیری (Backup)

سیستم پشتیبان‌گیری خودکار برای فایل‌های حیاتی سرور در Cloudflare R2.

### اسکریپت‌ها

```bash
# پشتیبان‌گیری روزانه (فایل‌های env، nginx، PM2)
node scripts/backup-to-r2.mjs daily

# پشتیبان‌گیری هفتگی (+ تنظیمات مانیتورینگ، DNS)
node scripts/backup-to-r2.mjs weekly

# پشتیبان‌گیری ماهانه دیتابیس
node scripts/backup-to-r2.mjs monthly

# لیست پشتیبان‌ها
node scripts/backup-to-r2.mjs list

# بازیابی پشتیبان
node scripts/restore-from-r2.mjs download <backup-key> ./restore

# تأیید سلامت پشتیبان
node scripts/restore-from-r2.mjs verify <backup-key>
```

### رمزنگاری

```bash
# پشتیبان‌گیری با رمزنگاری AES-256-GCM
GPG_PASSPHRASE="your-secret" node scripts/backup-to-r2.mjs daily
```

### سیاست نگهداری

| نوع    | مدت نگهداری |
| ------ | ----------- |
| روزانه | ۱۴ روز      |
| هفتگی  | ۸ هفته      |
| ماهانه | ۶ ماه       |

### Cron (VPS)

```bash
# روزانه ساعت ۳ صبح
0 3 * * * GPG_PASSPHRASE="secret" node /home/dexter/kitia/scripts/backup-to-r2.mjs daily

# هفتگی یکشنبه ساعت ۴ صبح
0 4 * * 0 GPG_PASSPHRASE="secret" node /home/dexter/kitia/scripts/backup-to-r2.mjs weekly

# ماهانه اول هر ماه ساعت ۵ صبح
0 5 1 * * GPG_PASSPHRASE="secret" node /home/dexter/kitia/scripts/backup-to-r2.mjs monthly
```

## متغیرهای محیطی

فایل `.env.example` را به `.env` کپی کرده و مقادیر زیر را تنظیم کنید:

- `DATABASE_URL`: آدرس اتصال به PostgreSQL
- `NEXTAUTH_SECRET`: کلید رمزنگاری NextAuth
- `ZARINPAL_MERCHANT_ID`: شناسه درگاه زرین‌پال

## توسعه آینده

این معماری برای توسعه آسان طراحی شده است:

- افزودن قابلیت‌های جدید در `/services`
- افزودن API endpoint‌های جدید در `/app/api`
- افزودن صفحات جدید با استفاده از App Router
- توسعه پنل ادمین با افزودن route‌های جدید
