'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface DigipayGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export default function DigipayGuidanceModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
}: DigipayGuidanceModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">
              راهنمای پرداخت با دیجی‌پی
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Intro */}
            <p className="text-sm text-slate-700 text-right leading-relaxed">
              شما به درگاه دیجی‌پی منتقل می‌شوید. بسته به اینکه حساب دیجی‌پی
              دارید یا نه، مراحل متفاوت است:
            </p>

            {/* Scenario 1: Has Digipay Account */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-green-800 mb-2">
                    اگر حساب دیجی‌پی دارید
                  </h3>
                  <p className="text-sm text-green-700 leading-relaxed">
                    شماره تلفن خود را وارد کنید و با اعتبار موجود پرداخت کنید.
                    پرداخت در کمتر از یک دقیقه انجام می‌شود.
                  </p>
                </div>
              </div>
            </div>

            {/* Scenario 2: New User */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-amber-800 mb-2">
                    اگر حساب دیجی‌پی ندارید
                  </h3>
                  <div className="space-y-3 text-sm text-amber-700">
                    <p className="leading-relaxed">
                      شماره تلفن خود را وارد کنید. یک لینک ثبت‌نام برایتان ارسال
                      می‌شود.
                    </p>

                    {/* Step by step */}
                    <div className="bg-white/60 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-right">
                        <span className="flex-shrink-0 w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold">
                          الف
                        </span>
                        <span>لینک را باز کنید و پروفایل را تکمیل کنید</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="flex-shrink-0 w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold">
                          ب
                        </span>
                        <span>اعتبار دریافت کنید</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="flex-shrink-0 w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold">
                          ج
                        </span>
                        <span>
                          به کیتیا برگردید و دوباره پرداخت را انتخاب کنید
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 text-right leading-relaxed">
                <span className="font-bold">نکته مهم:</span> اگر کاربر جدید
                دیجی‌پی هستید، بعد از تکمیل ثبت‌نام و دریافت اعتبار، به سایت
                کیتیا برگردید و دوباره روی دکمه پرداخت کلیک کنید. سفارش شما
                ذخیره شده است.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-200 space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={onConfirm}
              isLoading={isProcessing}
              disabled={isProcessing}
            >
              متوجه شدم، ادامه به دیجی‌پی
            </Button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
