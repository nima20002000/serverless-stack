import { SessionProvider } from "@/components/providers/SessionProvider";
import Footer from "@/components/layout/Footer";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
      <Footer />
    </SessionProvider>
  );
}
