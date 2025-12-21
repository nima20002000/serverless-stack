'use client';

import { useState } from 'react';
import { ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'چگونه سفارش ثبت کنم؟',
    answer: 'برای ثبت سفارش، محصول مورد نظر را انتخاب کنید، به سبد خرید اضافه کنید و مراحل تسویه حساب را تکمیل نمایید. پس از پرداخت موفق، سفارش شما ثبت می‌شود.'
  },
  {
    question: 'روش‌های پرداخت چیست؟',
    answer: 'پرداخت از طریق درگاه امن زرین‌پال انجام می‌شود. می‌توانید با تمامی کارت‌های بانکی عضو شبکه شتاب پرداخت کنید.'
  },
  {
    question: 'چقدر طول می‌کشد تا سفارشم ارسال شود؟',
    answer: 'زمان تحویل سفارش ۱ تا ۳ روز کاری است. برای ارسال فوری در تهران و کرج، می‌توانید با پشتیبانی تماس بگیرید. امکان ارسال با اسنپ باکس در کمتر از ۲ ساعت وجود دارد.'
  },
  {
    question: 'هزینه ارسال چقدر است؟',
    answer: 'هزینه ارسال تقریباً ۲۰۰,۰۰۰ تومان است (± ۲۰٪ بسته به مقصد و وزن محموله).'
  },
  {
    question: 'چگونه سفارشم را پیگیری کنم؟',
    answer: 'کد رهگیری تیپاکس در پروفایل کاربری شما قرار می‌گیرد. همچنین می‌توانید از طریق کانال تلگرام @kitia_a اطلاعات ارسال را دنبال کنید.'
  },
  {
    question: 'آیا امکان مرجوع کردن محصول وجود دارد؟',
    answer: 'بله، تا ۷ روز پس از تحویل می‌توانید محصول را در صورت داشتن شرایط مرجوعی (معیوب بودن، عدم تطابق یا ارسال اشتباه) مرجوع کنید. محصول باید در بسته‌بندی اصلی و بدون استفاده باشد.'
  },
  {
    question: 'آیا محصولات گارانتی دارند؟',
    answer: 'در صورت داشتن مشکل ساخت، محصولات قابل مرجوعی هستند. لطفاً برای جزئیات بیشتر با پشتیبانی تماس بگیرید.'
  },
  {
    question: 'آیا می‌توانم بدون ثبت نام خرید کنم؟',
    answer: 'بله، امکان خرید به صورت مهمان (Guest Checkout) وجود دارد. اما ایجاد حساب کاربری برای پیگیری راحت‌تر سفارشات توصیه می‌شود.'
  },
  {
    question: 'روش‌های ارتباطی با پشتیبانی چیست؟',
    answer: 'می‌توانید از طریق شماره ۰۹۹۱۲۲۱۸۴۶۳ (تماس و واتساپ) یا کانال تلگرام @kitia_a با ما در ارتباط باشید. ساعات پاسخگویی از ۱۲ ظهر تا ۹ شب است.'
  },
  {
    question: 'آیا امکان تغییر آدرس بعد از ثبت سفارش وجود دارد؟',
    answer: 'لطفاً با پشتیبانی تماس بگیرید. در صورتی که سفارش هنوز به تیپاکس تحویل نشده باشد، می‌توانیم این کار را برای شما انجام دهیم.'
  },
  {
    question: 'محصولات شما چه تفاوتی با بازار دارند؟',
    answer: 'ما محصولات باکیفیت را با قیمت مناسب ارائه می‌دهیم. همچنین بخشی از درآمد ما صرف تغذیه و درمان گربه‌های خیابانی می‌شود، پس با خرید از ما به حیوانات بی‌سرپرست هم کمک می‌کنید.'
  },
  {
    question: 'آیا امکان خرید عمده وجود دارد؟',
    answer: 'بله، برای خرید عمده و سازمانی لطفاً با شماره ۰۹۹۱۲۲۱۸۴۶۳ تماس بگیرید تا شرایط ویژه را برای شما در نظر بگیریم.'
  },
  {
    question: 'در صورت دریافت محصول آسیب دیده چه کنم؟',
    answer: 'لطفاً هنگام تحویل بسته را بازرسی کنید. اگر آسیب دیدید، سریعاً با پشتیبانی تماس بگیرید تا محصول را برای شما مرجوع کنیم.'
  },
  {
    question: 'چرا باید از کیتیا خرید کنم؟',
    answer: 'کیتیا کیفیت بالا، قیمت مناسب، ارسال سریع و پشتیبانی عالی را ارائه می‌دهد. علاوه بر این، با خرید از ما به کمک حیوانات خیابانی نیز کمک می‌کنید!'
  }
];

export default function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QuestionMarkCircleIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">سوالات متداول</h1>
          <p className="text-lg text-gray-600">
            پاسخ سوالات رایج درباره خرید و خدمات کیتیا
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-right flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-bold text-gray-900 flex-1">
                  {faq.question}
                </span>
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 mr-4 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-2">
                  <p className="text-gray-700 text-right leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-8 border border-blue-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            سوال شما پاسخ داده نشد؟
          </h2>
          <p className="text-gray-700 mb-6">
            تیم پشتیبانی ما آماده است تا به سوالات شما پاسخ دهد
          </p>
          <div className="space-y-3">
            <p className="font-bold text-lg text-gray-900">تلفن و واتساپ: 09912218463 - 09910258259</p>
            <p className="text-sm text-gray-600">پاسخگویی از ساعت ۱۲ ظهر تا ۹ شب</p>
          </div>
        </div>
      </div>
    </div>
  );
}
