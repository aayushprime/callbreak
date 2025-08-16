"use client";
import React from "react";
import clsx from "clsx";

type ProfileProps = {
  size?: number; // Pixel size of the avatar
  className?: string; // Optional extra styles from parent
  active?: boolean; // Whether to pulse for turn indication
  picture?: string; // Avatar image URL
  name?: string; // Player name
  country?: string; // Country code (e.g., "US", "NP")
};

export function Profile({
  name = "",
  country = "",
  picture = "https://www.gravatar.com/avatar/2?d=identicon",
  size = 56,
  className = "",
  active = false,
}: ProfileProps) {
  const dim = `${size}px`;
  const altText = name ? `${name}'s avatar` : "Player avatar";

  return (
    <div
      className={clsx("relative flex flex-col items-center", className)}
      style={{ width: dim }}
    >
      <div
        className={clsx(
          "rounded-full overflow-hidden shadow-md transition-all duration-300",
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
          {name}
          {country && (
            <span className="ml-1" role="img" aria-label={`Flag of ${country}`}>
              {getFlagEmoji(country)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
