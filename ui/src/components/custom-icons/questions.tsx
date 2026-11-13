import { twMerge } from "tailwind-merge";

export function QuestionsIcon({ className }: { className?: string }) {
  const cn = twMerge("w-4 h-4", className);
  return (
    <svg
      className={cn}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 9.2a2.6 2.6 0 0 1 5 0.9c0 1.7-2.5 2-2.5 3.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}
