import { WishlistPage } from '@/components/wishlist/WishlistPage';

export const metadata = {
  title: 'علاقه‌مندی‌ها | کیتیا',
  description: 'لیست محصولات مورد علاقه شما',
};

export default function WishlistPageRoute() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <WishlistPage />
      </div>
    </div>
  );
}
