"use client";
import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card as CardType } from "../../lib/deck";
import { Card } from "../ui/Card";

export interface HandCard {
  uid: string;
  createdAt: number;
  code: CardType;
  fromDeck?: boolean;
}

interface CardsHandProps {
  hand: HandCard[];
  onPlay: (
    card: HandCard,
    cardRef: React.RefObject<HTMLDivElement | null>
  ) => void;
  cardWidth: number;
  cardHeight: number;
  allowedCards?: CardType[];
}

export const CardsHand = React.memo(function CardsHand({
  hand,
  onPlay,
  cardWidth,
  cardHeight,
  allowedCards,
}: CardsHandProps) {
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

  const handKey = React.useMemo(() => hand.map((h) => h.uid).join(","), [hand]);

  return (
    <div ref={areaRef} className="relative w-full h-full pointer-events-auto">
      <AnimatePresence>
        {hand.map((card, index) => (
          <MemoizedHandCard
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
});

interface HandCardProps {
  card: HandCard;
  index: number;
  xOffset: number;
  onPlay: (
    card: HandCard,
    cardRef: React.RefObject<HTMLDivElement | null>
  ) => void;
  cardWidth: number;
  cardHeight: number;
  allowed: boolean;
}

function HandCardComponent({
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
        card={card.code}
        className={`${allowed ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (allowed) {
            setLifted(true);
            setTimeout(() => {
              onPlay(card, innerRef);
              setLifted(false);
            }, 100);
          }
        }}
      />
    </motion.div>
  );
}

// shallow compare useful props for a hand card to avoid rerenders
const handCardComparator = (prev: HandCardProps, next: HandCardProps) => {
  return (
    prev.card.uid === next.card.uid &&
    prev.xOffset === next.xOffset &&
    prev.allowed === next.allowed &&
    prev.cardWidth === next.cardWidth &&
    prev.cardHeight === next.cardHeight
  );
};

export const MemoizedHandCard = React.memo(
  HandCardComponent,
  handCardComparator
);
