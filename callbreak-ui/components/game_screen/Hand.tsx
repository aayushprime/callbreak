"use client";
import React, { useRef, useState, useLayoutEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Card as CardType, createDeck } from "../../lib/deck";

export interface HandCard extends CardType {
  uid: string;
  createdAt: number;
  fromDeck?: boolean;
}
export type PlayerId = 0 | 1 | 2 | 3; // 0=self(bottom), 1=left, 2=top, 3=right

function uid(prefix: string = "c"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function Hand() {
  const deckRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  // trick target spots
  const trickBottomRef = useRef<HTMLDivElement>(null);
  const trickLeftRef = useRef<HTMLDivElement>(null);
  const trickTopRef = useRef<HTMLDivElement>(null);
  const trickRightRef = useRef<HTMLDivElement>(null);

  // 4 hands, current trick, whose turn, lead player, collect animation target
  const [hands, setHands] = useState<Record<PlayerId, HandCard[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
  });
  const [trick, setTrick] = useState<Partial<Record<PlayerId, HandCard>>>({});
  const [turn, setTurn] = useState<PlayerId>(0);
  const [lead, setLead] = useState<PlayerId | null>(null);
  const [collectTo, setCollectTo] = useState<PlayerId | null>(null);

  const dealHands = () => {
    const d = createDeck();
    const newHands: Record<PlayerId, HandCard[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
    };
    for (let i = 0; i < 52; i++) {
      const p = (i % 4) as PlayerId;
      const top = d[i];
      const card: HandCard = {
        uid: uid(),
        rank: top.rank,
        suit: top.suit,
        createdAt: Date.now(),
        fromDeck: false,
      };
      newHands[p].push(card);
    }
    setHands(newHands);
    setTrick({});
    setLead(null);
    setTurn(0);
    setCollectTo(null);
  };

  React.useEffect(() => {
    dealHands();
  }, []);

  const onCardThrown = (card: HandCard) => {
    // add card to current trick for the active player
    setTrick((t) => ({ ...t, [turn]: card }));
    if (lead === null) setLead(turn);
    // remove from that player's hand
    setHands((hs) => ({
      ...hs,
      [turn]: (hs[turn] || []).filter((c) => c.uid !== card.uid),
    }));
    // advance turn
    setTurn((t) => ((t + 1) % 4) as PlayerId);
  };

  // very simple bots: auto-play first card after a short delay
  React.useEffect(() => {
    const alreadyPlayed = trick[turn] != null;
    if (turn === 0 || alreadyPlayed || Object.keys(trick).length >= 4) return;
    const timer = setTimeout(() => {
      setHands((hs) => {
        const h = hs[turn];
        if (!h || h.length === 0) return hs;
        const [card] = h;
        setTrick((t) => ({ ...t, [turn]: card }));
        if (lead === null) setLead(turn);
        setTurn(((turn + 1) % 4) as PlayerId);
        return { ...hs, [turn]: h.slice(1) };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [turn, trick, hands, lead]);

  // when trick has 4 cards, pick a winner (highest rank in lead suit) and collect
  React.useEffect(() => {
    const count = Object.keys(trick).length;
    if (count !== 4 || lead === null) return;
    const leadSuit = trick[lead]!.suit;
    const order: Record<string, number> = {
      A: 14,
      K: 13,
      Q: 12,
      J: 11,
      "10": 10,
      "9": 9,
      "8": 8,
      "7": 7,
      "6": 6,
      "5": 5,
      "4": 4,
      "3": 3,
      "2": 2,
    };
    let win: PlayerId = lead;
    let best = -1;
    (Object.keys(trick) as unknown as PlayerId[]).forEach((p) => {
      const c = trick[p];
      if (c && c.suit === leadSuit) {
        const v = order[c.rank as unknown as string] ?? 0;
        if (v > best) {
          best = v;
          win = p;
        }
      }
    });
    setCollectTo(win);
    const t = setTimeout(() => {
      setTrick({});
      setCollectTo(null);
      setLead(null);
      setTurn(win);
    }, 700);
    return () => clearTimeout(t);
  }, [trick, lead]);

  return (
    <div className="">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          <div
            ref={trickBottomRef}
            className="absolute left-1/2 bottom-0 -translate-x-1/2"
          />
          <div
            ref={trickTopRef}
            className="absolute left-1/2 top-0 -translate-x-1/2"
          />
          <div
            ref={trickLeftRef}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          />
          <div
            ref={trickRightRef}
            className="absolute right-0 top-1/2 -translate-y-1/2"
          />

          {trick[0] && (
            <TrickCard spot="bottom" card={trick[0]} collectTo={collectTo} />
          )}
          {trick[1] && (
            <TrickCard spot="left" card={trick[1]} collectTo={collectTo} />
          )}
          {trick[2] && (
            <TrickCard spot="top" card={trick[2]} collectTo={collectTo} />
          )}
          {trick[3] && (
            <TrickCard spot="right" card={trick[3]} collectTo={collectTo} />
          )}
        </div>
      </div>

      <div ref={handRef} className="absolute bottom-0 left-0 right-0">
        <CardsHand
          hand={hands[0]}
          setHand={(updater) =>
            setHands((prev) => ({
              ...prev,
              0:
                typeof updater === "function"
                  ? (updater as any)(prev[0])
                  : (updater as any),
            }))
          }
          deckRef={deckRef}
          discardRef={trickBottomRef}
          containerRef={handRef}
          onThrowComplete={onCardThrown}
        />
      </div>
    </div>
  );
}

interface CardsHandProps {
  hand: HandCard[];
  setHand: React.Dispatch<React.SetStateAction<HandCard[]>>;
  deckRef: React.RefObject<HTMLDivElement | null>;
  discardRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onThrowComplete: (card: HandCard) => void;
}

function CardsHand({
  hand,
  setHand,
  deckRef,
  discardRef,
  containerRef,
  onThrowComplete,
}: CardsHandProps) {
  // pick spacing parameters based on hand size
  const total = hand.length;
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const areaRef = React.useRef<HTMLDivElement>(null);

  // measure the exact hand area (relative wrapper) for precise spacing
  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth || 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const CARD_W = 128; // w-32
  const MIN_SPACING = 30;
  const DEFAULT_SPACING = 64; // slightly wider default gap between cards
  // Compute spacing centered, without forcing extra side gaps.
  // If container is too narrow for DEFAULT_SPACING, shrink down but keep at least MIN_SPACING.
  const spacing =
    total > 1
      ? Math.max(
          MIN_SPACING,
          Math.min(DEFAULT_SPACING, (containerWidth - CARD_W) / (total - 1))
        )
      : 0;

  // Compute precise centered centers using total row width
  const totalRowWidth =
    total > 0 ? CARD_W + spacing * Math.max(0, total - 1) : 0;
  const startCenter = -totalRowWidth / 2 + CARD_W / 2; // center of first card
  const offsets = Array.from({ length: total }, (_, i) =>
    total > 0 ? startCenter + i * spacing : 0
  );

  return (
    <div className="flex items-end justify-center pointer-events-none">
      <div ref={areaRef} className="relative w-full h-56 pointer-events-auto">
        <AnimatePresence>
          {hand.map((card, index) => (
            <Card
              key={card.uid}
              card={card}
              index={index}
              total={total}
              xOffset={offsets[index] || 0}
              deckRef={deckRef}
              discardRef={discardRef}
              containerRef={containerRef}
              onRemove={() =>
                setHand((h) => h.filter((c) => c.uid !== card.uid))
              }
              onThrowComplete={onThrowComplete}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface CardProps {
  card: HandCard;
  index: number;
  total: number;
  xOffset: number;
  deckRef: React.RefObject<HTMLDivElement | null>;
  discardRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRemove: () => void;
  onThrowComplete: (card: HandCard) => void;
}

function Card({
  card,
  index,
  total,
  xOffset,
  deckRef,
  discardRef,
  containerRef,
  onRemove,
  onThrowComplete,
}: CardProps) {
  const innerControls = useAnimation();
  const innerRef = useRef<HTMLDivElement>(null);
  const [isSelected, setSelected] = React.useState(false);
  const [isAnimatingFromDeck, setAnimatingFromDeck] = React.useState(
    !!card.fromDeck
  );

  // layout math received from parent: straight hand (no curve, no rotation)
  const angle = 0;
  const offsetX = xOffset;
  const translateY = 0;

  // wrapper styles: place cards at bottom-center of the hand area, then move/rotate to fan
  // wrapper container (positioned at bottom-centre) with fanned transforms
  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    // place hand at bottom center and clip a bit below the inner container
    bottom: `-20px`,
    transform: `translateX(-50%)`,
    transformOrigin: "bottom center",
    zIndex: isSelected ? 999 : 100 + index,
  };

  // when the card is first mounted and flagged 'fromDeck', animate it from the deck's center to its slot.
  useLayoutEffect(() => {
    if (!isAnimatingFromDeck) return;

    const run = () => {
      const deckEl = deckRef.current;
      const innerEl = innerRef.current;
      const containerEl = containerRef.current;
      if (!deckEl || !innerEl || !containerEl) return;

      const deckRect = deckEl.getBoundingClientRect();
      const cardRect = innerEl.getBoundingClientRect();

      // compute delta from deck center to card center (viewport coords)
      const fromX = deckRect.left + deckRect.width / 2;
      const fromY = deckRect.top + deckRect.height / 2;
      const toX = cardRect.left + cardRect.width / 2;
      const toY = cardRect.top + cardRect.height / 2;

      const deltaX = fromX - toX;
      const deltaY = fromY - toY;

      // set starting position immediately, then animate to zero
      innerControls.set({
        x: deltaX,
        y: deltaY,
        scale: 0.76,
        rotate: 0,
        opacity: 0,
      });
      innerControls.start({
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        transition: { type: "spring", stiffness: 340, damping: 20 },
      });

      // clear the flag so we don't re-run on updates
      setAnimatingFromDeck(false);
    };

    // run on next frame so DOM is ready
    requestAnimationFrame(run);
  }, []);

  // single click discards: animate to discard, then update state
  const onClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    const innerEl = innerRef.current;
    const discardEl = discardRef.current;
    if (!innerEl || !discardEl) return;

    const cardRect = innerEl.getBoundingClientRect();
    const discardRect = discardEl.getBoundingClientRect();

    // target center -> animate delta relative to current position
    const toX = discardRect.left + discardRect.width / 2;
    const toY = discardRect.top + discardRect.height / 2;
    const fromX = cardRect.left + cardRect.width / 2;
    const fromY = cardRect.top + cardRect.height / 2;

    const deltaX = toX - fromX;
    const deltaY = toY - fromY;

    await innerControls.start({
      x: deltaX,
      y: deltaY - 20,
      rotate: 720,
      scale: 0.7,
      opacity: 0,
      transition: { duration: 0.55, ease: "easeIn" },
    });

    onThrowComplete && onThrowComplete(card);
  };

  // allow deselect when clicking elsewhere
  React.useEffect(() => {
    if (!isSelected) return;
    const onDocClick = () => setSelected(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [isSelected]);

  // animate subtle idle tilt for non-selected cards
  React.useEffect(() => {
    if (isSelected) return;
    const idle = async () => {
      // small subtle bob
      await innerControls.start({
        rotate: angle,
        transition: { duration: 0.2 },
      }); // Animate back to original angle (0)
    };
    idle();
  }, [isSelected]);

  return (
    <motion.div
      style={wrapperStyle}
      className="w-32 h-44"
      initial={false}
      animate={{ marginLeft: offsetX }}
      transition={{ type: "spring", stiffness: 560, damping: 28 }}
    >
      <motion.div
        ref={innerRef}
        className="w-32 h-44 rounded-md bg-white card-shadow border border-slate-200 flex flex-col items-center justify-center cursor-pointer card-face select-none"
        style={{
          transformStyle: "preserve-3d",
        }}
        initial={false}
        animate={innerControls}
        onClick={onClick}
        transition={{ type: "spring", stiffness: 520, damping: 24 }}
      >
        {/* Top-left only: rank and suit, all else empty */}
        <div className="absolute top-2 left-2 text-left leading-none">
          <div
            className={`text-base font-semibold ${
              card.suit === "♥" || card.suit === "♦"
                ? "text-red-600"
                : "text-black"
            }`}
          >
            {card.rank}
          </div>
          <div
            className={`text-base ${
              card.suit === "♥" || card.suit === "♦"
                ? "text-red-600"
                : "text-black"
            }`}
          >
            {card.suit}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
