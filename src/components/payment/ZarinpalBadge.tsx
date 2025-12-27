'use client';

import Image from 'next/image';

export default function ZarinpalBadge() {
  const showZPTrust = () => {
    window.open(
      'https://www.zarinpal.com/trustPage/kitia.ir',
      '_blank',
      'width=450,height=600,scrollbars=no,resizable=no'
    );
  };

  return (
    <button
      onClick={showZPTrust}
      type="button"
      className="inline-block"
      title="دروازه پرداخت معتبر"
    >
      <Image
        src="https://cdn.zarinpal.com/badges/trustLogo/1.svg"
        alt="دروازه پرداخت معتبر"
        width={32}
        height={32}
        className="h-8 w-auto"
        unoptimized
      />
    </button>
  );
}
