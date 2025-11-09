'use client';

import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CartItem as CartItemType, formatPrice } from '@/store/cart-store';
import Image from 'next/image';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleIncrement = () => {
    if (item.quantity < item.stock) {
      onUpdateQuantity(item.productId, item.quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.productId, item.quantity - 1);
    }
  };

  const subtotal = item.price * item.quantity;

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200 last:border-b-0">
      {/* Product Image */}
      <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">بدون تصویر</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 text-right mb-1">
            {item.name}
          </h3>
          <p className="text-sm text-gray-600 text-right">
            {formatPrice(item.price)}
          </p>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
            className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="کاهش تعداد"
          >
            <MinusIcon className="w-4 h-4 text-gray-600" />
          </button>

          <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
            {item.quantity}
          </span>

          <button
            onClick={handleIncrement}
            disabled={item.quantity >= item.stock}
            className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="افزایش تعداد"
          >
            <PlusIcon className="w-4 h-4 text-gray-600" />
          </button>

          {item.quantity >= item.stock && (
            <span className="text-xs text-orange-600 mr-2">
              حداکثر موجودی
            </span>
          )}
        </div>
      </div>

      {/* Price and Remove */}
      <div className="flex flex-col items-end justify-between">
        <button
          onClick={() => onRemove(item.productId)}
          className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          aria-label="حذف از سبد"
        >
          <TrashIcon className="w-5 h-5" />
        </button>

        <p className="text-sm font-bold text-gray-900" dir="rtl">
          {formatPrice(subtotal)}
        </p>
      </div>
    </div>
  );
}
