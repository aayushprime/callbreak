import { motion, AnimationDefinition } from "framer-motion";
import { Card as CardType } from "game-logic";
import { Card } from "../ui/Card";
import { useState, useLayoutEffect, useRef } from "react";

type TrickProps = {
  playedCards: { player: string; card: CardType }[];
  winningPosition: { x: number; y: number } | null;
  profilePositions: Record<string, { x: number; y: number }>;
  playerIds: string[];
  yourPlayerIndex: number;
  onWinAnimationComplete?: () => void;
  animatingCard: { card: CardType; rect: DOMRect } | null;
};

type AnimationState = {
  initial: { scale: number; opacity: number; x: number; y: number };
  animate: { scale: number; opacity: number; x: number; y: number };
  transition: { duration: number; delay?: number };
};

export function Trick({
  playedCards,
  winningPosition,
  profilePositions,
  playerIds,
  yourPlayerIndex,
  onWinAnimationComplete,
  animatingCard,
}: TrickProps) {
  const [animationState, setAnimationState] = useState<
    Record<string, AnimationState>
  >({});
  const onWinAnimationCompleteRef = useRef(onWinAnimationComplete);
  onWinAnimationCompleteRef.current = onWinAnimationComplete;
  const winAnimationCompleted = useRef(false);
  const trickContainerRef = useRef<HTMLDivElement>(null);

  // Effect to set the initial "deal in" animation for cards
  useLayoutEffect(() => {
    // guard for invalid state
    if (
      playedCards.length === 0 ||
      Object.keys(profilePositions).length === 0
    ) {
      setAnimationState({});
      return;
    }

    setAnimationState((prevState) => {
      const newState = { ...prevState };
      let needsUpdate = false;

      playedCards.forEach(({ player, card }) => {
        if (!newState[player]) {
          const trickRect = trickContainerRef.current?.getBoundingClientRect();
          let initialPos = profilePositions[player] || { x: 0, y: 0 };
          if (animatingCard && animatingCard.card === card && trickRect) {
            initialPos = {
              x: animatingCard.rect.left - trickRect.left,
              y: animatingCard.rect.top - trickRect.top,
            };
          }

          const playerIndex = playerIds.indexOf(player);
          const relativeIndex = (playerIndex - yourPlayerIndex + 4) % 4;
          const offset = (trickRect?.width ?? 0) * 0.3;
          let animate: any = { scale: 1, opacity: 1, x: 0, y: 0 };
          switch (relativeIndex) {
            case 0:
              animate.y = offset;
              break;
            case 1:
              animate.x = -offset;
              break;
            case 2:
              animate.y = -offset;
              break;
            case 3:
              animate.x = offset;
              break;
          }

          newState[player] = {
            initial: { ...initialPos, scale: 0, opacity: 0 },
            animate,
            transition: { duration: 0.3 }, // deal-in animation duration
          };
          needsUpdate = true;
        }
      });

      return needsUpdate ? newState : prevState;
    });
  }, [
    playedCards,
    playerIds,
    yourPlayerIndex,
    profilePositions,
    animatingCard,
  ]);

  // Effect to handle the "winning" animation once the final position is received
  useLayoutEffect(() => {
    if (!winningPosition) return;

    winAnimationCompleted.current = false;

    setAnimationState((prevState) => {
      const newState = { ...prevState };
      playedCards.forEach(({ player }) => {
        if (newState[player]) {
          newState[player] = {
            ...newState[player],
            animate: {
              ...winningPosition,
              scale: 0,
              opacity: 0,
            },
            transition: { duration: 0.6 }, // winner sweeping animation duration
          };
        }
      });
      return newState;
    });
  }, [winningPosition, playedCards]);

  const handleAnimationComplete = (definition: AnimationDefinition) => {
    if (winAnimationCompleted.current) return;

    const isWinAnimation =
      typeof definition === "object" &&
      definition !== null &&
      "scale" in definition &&
      definition.scale === 0;

    if (isWinAnimation) {
      winAnimationCompleted.current = true;
      onWinAnimationCompleteRef.current?.();
    }
  };

  return (
    <div ref={trickContainerRef} className="w-full h-full">
      {playedCards.map(({ player, card }) => {
        const state = animationState[player];
        if (!state) return null;

        return (
          <motion.div
            key={card}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-28"
            initial={state.initial}
            animate={state.animate}
            transition={state.transition}
            onAnimationComplete={handleAnimationComplete}
          >
            <Card card={card} />
          </motion.div>
        );
      })}
    </div>
  );
}
