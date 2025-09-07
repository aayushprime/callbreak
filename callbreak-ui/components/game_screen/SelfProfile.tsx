"use client";
import React from "react";
import { twMerge } from "tailwind-merge";

type SelfProfileProps = {
  size?: number;
  className?: string;
  active?: boolean;
  picture?: string;
  name?: string;
  bid?: number | null;
  tricksWon?: number;
  country?: string;
};

export const SelfProfile = React.forwardRef<HTMLDivElement, SelfProfileProps>(
  (
    {
      name = "",
      country = "",
      picture = "https://www.gravatar.com/avatar/2?d=identicon",
      size = 56,
      className = "",
      active = false,
      bid = null,
      tricksWon = 0,
    }: SelfProfileProps,
    ref
  ) => {
    const dim = `${size}px`;
    const altText = name ? `${name}'s avatar` : "Player avatar";

    return (
      <div
        ref={ref}
        className={twMerge(
          "relative flex flex-col items-center pointer-events-none",
          className
        )}
      >
        <div
          className={twMerge(
            "relative rounded-full overflow-hidden shadow-md transition-all duration-300",
            active ? "pulse-border-sky" : "static-border-sky"
          )}
          style={{ width: dim, height: dim }}
        >
          <img
            src={picture}
            alt={altText}
            width={size}
            height={size}
            className="w-full h-full object-cover"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://www.gravatar.com/avatar/2?d=identicon";
            }}
          />
        </div>

        {name && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            <span className="font-medium">{name}</span>
            {country && (
              <span
                className="ml-1"
                role="img"
                aria-label={`Flag of ${country}`}
              >
                {getFlagEmoji(country)}
              </span>
            )}
          </div>
        )}

        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
          <div className="bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
            <span className="text-[10px] opacity-80">B/W</span>
            <strong className="text-sm">
              {bid ?? "-"}/{tricksWon ?? 0}
            </strong>
          </div>
        </div>
      </div>
    );
  }
);

SelfProfile.displayName = "SelfProfile";

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
