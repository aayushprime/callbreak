import { motion } from "framer-motion";
import { Card as CardType } from "common";
import { Card } from "../ui/Card";
import { useEffect, useState } from "react";

type TrickProps = {
  playedCards: { player: string; card: CardType }[];
  winnerId?: string | null;
  profileRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  trickContainerRef: React.RefObject<HTMLDivElement | null>;
  playerIds: string[];
  yourPlayerIndex: number;
};

export function Trick({
  playedCards,
  winnerId,
  profileRefs,
  trickContainerRef,
  playerIds,
  yourPlayerIndex,
}: TrickProps) {
  const [animationProps, setAnimationProps] = useState<any>({});

  useEffect(() => {
    if (winnerId) {
      const winnerProfile = profileRefs.current[winnerId];
      if (!winnerProfile) return;

      const winnerRect = winnerProfile.getBoundingClientRect();
      const trickRect = trickContainerRef.current?.getBoundingClientRect();

      if (winnerRect && trickRect) {
        const newAnimationProps: any = {};
        const winnerCenterX = winnerRect.left + winnerRect.width / 2;
        const winnerCenterY = winnerRect.top + winnerRect.height / 2;
        const trickCenterX = trickRect.left + trickRect.width / 2;
        const trickCenterY = trickRect.top + trickRect.height / 2;

        for (const { player } of playedCards) {
          newAnimationProps[player] = {
            x: winnerCenterX - trickCenterX,
            y: winnerCenterY - trickCenterY,
            scale: 0,
            transition: { duration: 0.5, delay: 0.5 },
          };
        }
        setAnimationProps(newAnimationProps);
      }
    } else {
      setAnimationProps({});
    }
  }, [winnerId, profileRefs, trickContainerRef, playedCards]);

  return (
    <>
      {playedCards.map(({ player, card }) => {
        const playerIndex = playerIds.indexOf(player);
        const relativeIndex = (playerIndex - yourPlayerIndex + 4) % 4;

        const profile = profileRefs.current[player];
        const trickRect = trickContainerRef.current?.getBoundingClientRect();
        const profileRect = profile?.getBoundingClientRect();

        let initial: any = { scale: 0, opacity: 0, x: 0, y: 0 };
        if (profileRect && trickRect) {
          initial.x =
            profileRect.left +
            profileRect.width / 2 -
            (trickRect.left + trickRect.width / 2);
          initial.y =
            profileRect.top +
            profileRect.height / 2 -
            (trickRect.top + trickRect.height / 2);
        }

        let animate: any = { scale: 1, opacity: 1, x: 0, y: 0 };
        const offset = 40;
        switch (relativeIndex) {
          case 0: // You
            animate.y = offset;
            break;
          case 1: // Player to your left
            animate.x = -offset;
            break;
          case 2: // Player across from you
            animate.y = -offset;
            break;
          case 3: // Player to your right
            animate.x = offset;
            break;
        }

        if (animationProps[player]) {
          animate = { ...animate, ...animationProps[player] };
        }

        return (
          <motion.div
            key={card}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-36"
            initial={initial}
            animate={animate}
            transition={{ duration: 0.3 }}
          >
            <Card card={card} />
          </motion.div>
        );
      })}
    </>
  );
}
