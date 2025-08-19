"use client";
import React from "react";
import { twMerge } from "tailwind-merge";

type LobbyProfileProps = {
  size?: number;
  className?: string;
  picture?: string;
  name?: string;
  country?: string;
};

export function LobbyProfile({
  size = 80,
  className = "",
  picture = "https://www.gravatar.com/avatar/2?d=identicon",
  name = "",
  country = "",
}: LobbyProfileProps) {
  const dim = `${size}px`;
  const altText = name ? `${name}'s avatar` : "Player avatar";

  return (
    <div className={twMerge("flex flex-col items-center", className)}>
      <div
        className="rounded-full overflow-hidden shadow-md"
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
        <div className="mt-3 text-center text-sm font-semibold text-white/90">
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
