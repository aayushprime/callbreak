"use client";
import React from "react";
import { Card as CardType } from "@/lib/deck";

export function parseCard(code?: CardType | null) {
  if (!code) {
    return { rank: "?", suit: "?", suitLetter: "" } as const;
  }
  const suitLetter = code.slice(-1) as "H" | "D" | "C" | "S";
  const rank = code.slice(0, -1);
  const suit =
    suitLetter === "H"
      ? "♥"
      : suitLetter === "D"
      ? "♦"
      : suitLetter === "C"
      ? "♣"
      : "♠";
  return { rank, suit, suitLetter } as const;
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: CardType;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ card, ...props }, ref) => {
    const p = parseCard(card);
    return (
      <div
        ref={ref}
        {...props}
                className={`w-full h-full rounded-md bg-white card-shadow border border-slate-200 flex flex-col items-center justify-center card-face select-none ${props.className}`}
      >
        <div className="absolute top-2 left-2 text-left leading-none">
          <div
            className={`text-base font-semibold ${
              p.suit === "♥" || p.suit === "♦" ? "text-red-600" : "text-black"
            }`}
          >
            {p.rank}
          </div>
          <div
            className={`text-base ${
              p.suit === "♥" || p.suit === "♦" ? "text-red-600" : "text-black"
            }`}
          >
            {p.suit}
          </div>
        </div>
        <div className="absolute bottom-2 right-2 text-left leading-none transform rotate-180">
          <div
            className={`text-base font-semibold ${
              p.suit === "♥" || p.suit === "♦" ? "text-red-600" : "text-black"
            }`}
          >
            {p.rank}
          </div>
          <div
            className={`text-base ${
              p.suit === "♥" || p.suit === "♦" ? "text-red-600" : "text-black"
            }`}
          >
            {p.suit}
          </div>
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";