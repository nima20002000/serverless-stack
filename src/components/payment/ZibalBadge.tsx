/**
 * Zibal payment gateway badge component
 * Displays the Zibal logo and branding
 */

export default function ZibalBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg text-white text-sm font-medium shadow-sm">
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M8 12L11 15L16 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>زیبال</span>
    </div>
  );
}
