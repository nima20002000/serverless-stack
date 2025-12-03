'use client';

import { useEffect, useRef } from 'react';

export default function ZarinpalBadge() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://www.zarinpal.com/webservice/TrustCode';
    script.type = 'text/javascript';

    // Append to container
    containerRef.current.appendChild(script);

    // Cleanup
    return () => {
      if (containerRef.current && containerRef.current.contains(script)) {
        containerRef.current.removeChild(script);
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
