"use client";
import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card as CardType } from "../../lib/deck";

export interface HandCard {
  uid: string;
  createdAt: number;
  code: CardType;
  fromDeck?: boolean;
}

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

interface CardsHandProps {
  hand: HandCard[];
  onPlay: (card: HandCard, cardRef: React.RefObject<HTMLDivElement>) => void;
  cardWidth: number;
  cardHeight: number;
  allowedCards?: CardType[];
}

export function CardsHand({ hand, onPlay, cardWidth, cardHeight, allowedCards }: CardsHandProps) {
  const total = hand.length;
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const areaRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth || 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const MIN_SPACING = 30;
  const DEFAULT_SPACING = 96;
  const spacing =
    total > 1
      ? Math.max(
          MIN_SPACING,
          Math.min(DEFAULT_SPACING, (containerWidth - cardWidth) / (total - 1))
        )
      : 0;

  const totalRowWidth = total > 0 ? cardWidth + spacing * Math.max(0, total - 1) : 0;
  const startCenter = -totalRowWidth / 2;
  console.log({ containerWidth, totalRowWidth, spacing, startCenter });

  const offsets = Array.from({ length: total }, (_, i) =>
    total > 0 ? startCenter + i * spacing : 0
  );

  return (
    <div ref={areaRef} className="relative w-full h-full pointer-events-auto">
      <AnimatePresence>
        {hand.map((card, index) => (
          <Card
            key={card.uid}
            card={card}
            index={index}
            xOffset={offsets[index] || 0}
            onPlay={onPlay}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            allowed={allowedCards?.includes(card.code) ?? true}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface CardProps {
  card: HandCard;
  index: number;
  xOffset: number;
  onPlay: (card: HandCard, cardRef: React.RefObject<HTMLDivElement>) => void;
  cardWidth: number;
  cardHeight: number;
  allowed: boolean;
}

function Card({ card, index, xOffset, onPlay, cardWidth, cardHeight, allowed }: CardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [lifted, setLifted] = React.useState(false);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    bottom: `-${cardHeight * (allowed ? 0.2 : 0.4)}px`,
    transform: `translateX(-50%)`,
    transformOrigin: "bottom center",
    zIndex: 100 + index,
    width: cardWidth,
    height: cardHeight,
  };

  return (
    <motion.div
      style={wrapperStyle}
      initial={false}
      animate={{ marginLeft: xOffset, y: lifted ? -20 : 0 }}
      transition={{ type: "spring", stiffness: 560, damping: 28 }}
    >
      <motion.div
        ref={innerRef}
        className={`w-full h-full rounded-md bg-white card-shadow border border-slate-200 flex flex-col items-center justify-center card-face select-none ${
          allowed ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (allowed) {
            setLifted(true);
            setTimeout(() => {
              onPlay(card, innerRef);
              setLifted(false);
            }, 100);
          }
        }}
      >
        {(() => {
          const p = parseCard(card.code);
          return (
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
          );
        })()}
      </motion.div>
    </motion.div>
  );
}
