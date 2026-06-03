'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Can customers checkout as guests?',
    answer:
      'The storefront can support guest cart flows while account features can sync saved data for signed-in users.',
  },
  {
    question: 'Which payment providers are included?',
    answer:
      'Stripe and PayPal are the built-in payment providers for this boilerplate.',
  },
  {
    question: 'Where should shipping rules be configured?',
    answer:
      'Use the shipping page and checkout configuration to document carriers, delivery zones, rates, and fulfillment timing.',
  },
  {
    question: 'Can product categories be changed?',
    answer:
      'Yes. Categories, tags, products, variants, and media come from the data contract and can be replaced for your project.',
  },
  {
    question: 'Is the UI tied to one locale?',
    answer:
      'No. The app reads site language, direction, locale, and currency from configuration so LTR and RTL stores can be supported.',
  },
];

export default function FAQList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-50">
            <QuestionMarkCircleIcon className="h-8 w-8 text-blue-700" />
          </div>
          <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
            FAQ
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Common questions about adapting this commerce boilerplate.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-expanded={openIndex === index}
              >
                <span className="flex-1 text-lg font-bold text-slate-950 dark:text-white">
                  {faq.question}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-2">
                  <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
