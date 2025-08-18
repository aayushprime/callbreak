"use client";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Card } from "common";
import { motion } from "framer-motion";

type ProfileProps = {
  size?: number;
  className?: string;
  active?: boolean;
  picture?: string;
  name?: string;
  country?: string;
};

export type ProfileHandle = {
  playCard: (card: Card, targetX: number, targetY: number) => void;
  getBoundingClientRect: () => DOMRect | undefined;
};

export const Profile = forwardRef<ProfileHandle, ProfileProps>(
  (
    {
      name = "",
      country = "",
      picture = "https://www.gravatar.com/avatar/2?d=identicon",
      size = 56,
      className = "",
      active = false,
    }: ProfileProps,
    ref
  ) => {
    const dim = `${size}px`;
    const altText = name ? `${name}'s avatar` : "Player avatar";
    const innerRef = React.useRef<HTMLDivElement>(null);

    const [playedCards, setPlayedCards] = useState<
      { card: Card; targetX: number; targetY: number }[]
    >([]);

    useImperativeHandle(ref, () => ({
      playCard: (card: Card, targetX: number, targetY: number) => {
        setPlayedCards((prev) => [
          ...prev,
          { card: card, targetX: targetX, targetY: targetY },
        ]);
      },
      getBoundingClientRect: () => innerRef.current?.getBoundingClientRect(),
    }));

    return (
      <div
        className={twMerge("relative flex flex-col items-center", className)}
        style={{ width: dim }}
      >
        <div
          ref={innerRef}
          className={twMerge(
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

        {playedCards.map(({ card, targetX, targetY }, i) => (
          <motion.div
            layout
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{ x: targetX, y: targetY, opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute w-32 h-44 rounded-md bg-gray-800 shadow-lg border border-gray-700 flex items-center justify-center"
          >
            {card}
          </motion.div>
        ))}
      </div>
    );
  }
);

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}
