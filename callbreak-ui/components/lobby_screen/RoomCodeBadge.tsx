import { useState } from "react";
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 
           2 0 01-2 2h-8a2 2 0 01-2-2v-2"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 px-5 py-2 bg-white/90 rounded-full shadow-lg border border-white/50">
      <span className="font-mono text-lg font-semibold text-green-800 tracking-wider">
        Code: {code}
      </span>
      <button
        onClick={copyCode}
        className="p-1 rounded-full hover:bg-green-100 transition"
        title="Copy room code"
      >
        {copied ? (
          <CheckIcon className="w-5 h-5 text-green-600" />
        ) : (
          <CopyIcon className="w-5 h-5 text-green-800" />
        )}
      </button>
    </div>
  );
}
