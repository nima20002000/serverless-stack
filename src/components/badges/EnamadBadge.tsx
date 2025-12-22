'use client';

import { useEffect, useState } from 'react';

/**
 * Lazy-loaded Enamad badge component
 * Loads after page is interactive to prevent blocking LCP
 */
export default function EnamadBadge() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay loading until page is interactive
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 2000); // Load after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    // Placeholder to maintain layout
    return <div className="w-24 h-24 bg-gray-100 animate-pulse rounded" />;
  }

  return (
    <div
      dangerouslySetInnerHTML={{
        // eslint-disable-next-line quotes
        __html: `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=676586&Code=bLSyuHwqurNSiHamVBVhFYohNhVDDhi0' alt='نماد اعتماد الکترونیکی' style='cursor:pointer' code='bLSyuHwqurNSiHamVBVhFYohNhVDDhi0' /></a>`,
      }}
    />
  );
}
