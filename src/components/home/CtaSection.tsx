'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Pill from '@/components/ui/Pill';

export default function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <Card className="p-8">
        <Pill tone="primary">Next step</Pill>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
              Explore the working storefront.
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              Use the product listing, wishlist, and cart flows as the first
              reusable surface for your commerce project.
            </p>
          </div>
          <Link href="/products">
            <Button variant="primary" size="lg">
              View products
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
