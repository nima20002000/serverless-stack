import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kitia - فروشگاه آنلاین",
  description: "پلتفرم خرید آنلاین کیتیا",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
