/**
 * Zarinpal payment gateway badge component
 * Displays the Zarinpal logo and branding
 */

export default function ZarinpalBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white text-sm font-medium shadow-sm">
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7 14H11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>زرین‌پال</span>
    </div>
  );
}
