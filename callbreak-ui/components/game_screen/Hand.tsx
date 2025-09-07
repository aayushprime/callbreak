"use client";
import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card as CardType } from "common";
import { Card } from "../ui/Card";

interface HandProps {
  hand: CardType[];
  onPlay: (card: CardType) => void;
  validCards: CardType[];
}

export function Hand({ hand, onPlay, validCards }: HandProps) {
  const cardWidth = 96;
  const cardHeight = 144;
  const total = hand.length;
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const areaRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () =>
      setContainerWidth((w) => (el.clientWidth !== w ? el.clientWidth : w));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const MIN_SPACING = 30;
  const DEFAULT_SPACING = 96;

  const spacing = React.useMemo(() => {
    return total > 1
      ? Math.max(
          MIN_SPACING,
          Math.min(DEFAULT_SPACING, (containerWidth - cardWidth) / (total - 1))
        )
      : 0;
  }, [total, containerWidth, cardWidth]);

  const totalRowWidth =
    total > 0 ? cardWidth + spacing * Math.max(0, total - 1) : 0;
  const startCenter = -totalRowWidth / 2;

  const offsets = React.useMemo(
    () =>
      Array.from({ length: total }, (_, i) =>
        total > 0 ? startCenter + i * spacing : 0
      ),
    [total, startCenter, spacing]
  );

  return (
    <div ref={areaRef} className="relative w-full h-full pointer-events-auto">
      <AnimatePresence>
        {hand.map((card, index) => (
          <HandCard
            key={card}
            card={card}
            index={index}
            xOffset={offsets[index] || 0}
            onPlay={onPlay}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            allowed={validCards.includes(card)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface HandCardProps {
  card: CardType;
  index: number;
  xOffset: number;
  onPlay: (card: CardType) => void;
  cardWidth: number;
  cardHeight: number;
  allowed: boolean;
}

function HandCard({
  card,
  index,
  xOffset,
  onPlay,
  cardWidth,
  cardHeight,
  allowed,
}: HandCardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [lifted, setLifted] = React.useState(false);

  const wrapperStyle: React.CSSProperties = React.useMemo(
    () => ({
      position: "absolute",
      left: "50%",
      bottom: `-${cardHeight * (allowed ? 0.2 : 0.4)}px`,
      transform: `translateX(-50%)`,
      transformOrigin: "bottom center",
      zIndex: 100 + index,
      width: cardWidth,
      height: cardHeight,
    }),
    [cardHeight, allowed, index, cardWidth]
  );

  return (
    <motion.div
      style={wrapperStyle}
      initial={false}
      animate={{ marginLeft: xOffset, y: lifted ? -20 : 0 }}
      transition={{ type: "spring", stiffness: 560, damping: 28 }}
    >
      <Card
        ref={innerRef}
        card={card}
        className={`${allowed ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (allowed) {
            setLifted(true);
            setTimeout(() => {
              onPlay(card);
              setLifted(false);
            }, 100);
          }
        }}
      />
    </motion.div>
  );
}