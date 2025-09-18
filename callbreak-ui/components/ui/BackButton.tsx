import { twMerge } from "tailwind-merge";

type BackButtonProps = {
  onClick: () => void;
  className?: string;
};

export function BackButton({ onClick, className }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
