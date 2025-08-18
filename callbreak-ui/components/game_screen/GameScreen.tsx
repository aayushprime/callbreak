"use client";

import { CardsHand } from "./Hand";
import { useEffect, useRef, useState } from "react";
import { HandCard } from "./Hand";
import { ProfileHandle, Profile } from "./Profile";
import { motion } from "framer-motion";
import { Card, createStandardDeck } from "common";
import { Button } from "../ui/Button";
import { useWindowSize } from "@/hooks/useWindowSize";
import { BidPopup } from "./BidPopup";
import { Books } from "./Books";
import { useRoom } from "@/contexts/RoomContext";
import { useToast } from "@/contexts/ToastContext";

type PlayerPosition = "bottom" | "left" | "top" | "right";

type TrickCard = {
  card: Card;
  playedBy: PlayerPosition;
  startPosition: { x: number; y: number };
};

export function GameScreen() {
  const gameScreenRef = useRef<HTMLDivElement>(null);
  const { width, height } = useWindowSize();

  const cardHeight = Math.min(height * 0.2, 176);
  const cardWidth = cardHeight * (128 / 176);

  const [hand, setHand] = useState<HandCard[]>([]);
  const [trickCards, setTrickCards] = useState<TrickCard[]>([]);
  const [booksOpen, setBooksOpen] = useState(false);
  const [bidPopupOpen, setBidPopupOpen] = useState(false);

  const leftProfileRef = useRef<ProfileHandle>(null!);

  const topProfileRef = useRef<ProfileHandle>(null!);
  const rightProfileRef = useRef<ProfileHandle>(null!);
  const bottomPlayerRef = useRef<HTMLDivElement>(null!);

  const trickAreaRef = useRef<HTMLDivElement>(null);
  const { room } = useRoom();
  const { addToast } = useToast();

  useEffect(() => {
    if (!room) return;
    const unsubscribe = room.subscribe((event, ack) => {
      if (event.type === "close") {
        addToast("Connection broken.");
        ack();
      } else if (event.type === "error") {
        ack();
        addToast(event.payload?.message);
      } else if (event.type === "status") {
        ack();
        setStatus(event.payload);
      } else {
        ack();
        console.log("[Lobby] Unhandled event:", event);
      }
    });
    return unsubscribe;
  }, [room]);

  // useEffect(() => {
  //   const deck = createStandardDeck().splice(0, 13);
  //   setHand(
  //     deck.map((code, i) => ({
  //       code,
  //       createdAt: Date.now(),
  //       uid: String(i),
  //       fromDeck: true,
  //     }))
  //   );
  // }, []);

  const playCard = (
    card: Card,
    player: PlayerPosition,
    cardRef?: React.RefObject<HTMLDivElement>
  ) => {
    if (!gameScreenRef.current) return;
    const gameScreenRect = gameScreenRef.current.getBoundingClientRect();

    let startPosition = { x: 0, y: 0 };
    const playerRef = getPlayerStartRef(player);

    if (cardRef?.current) {
      const rect = cardRef.current.getBoundingClientRect();
      startPosition = {
        x: rect.x - gameScreenRect.x,
        y: rect.y - gameScreenRect.y,
      };
    } else if (playerRef.current) {
      const rect = playerRef.current.getBoundingClientRect()!;
      startPosition = {
        x: rect.x + rect.width / 2 - gameScreenRect.x - cardWidth / 2,
        y: rect.y + rect.height / 2 - gameScreenRect.y - cardHeight / 2,
      };
    }

    setTrickCards((prev) => [
      ...prev,
      { card, playedBy: player, startPosition },
    ]);
  };

  const getPlayerStartRef = (player: PlayerPosition) => {
    switch (player) {
      case "left":
        return leftProfileRef;
      case "top":
        return topProfileRef;
      case "right":
        return rightProfileRef;
      case "bottom":
      default:
        return bottomPlayerRef;
    }
  };

  const getTrickCardPosition = (player: PlayerPosition) => {
    if (!trickAreaRef.current || !gameScreenRef.current) return { x: 0, y: 0 };
    const gameScreenRect = gameScreenRef.current.getBoundingClientRect();
    const trickRect = trickAreaRef.current.getBoundingClientRect();
    const trickCenter = {
      x: trickRect.x + trickRect.width / 2 - gameScreenRect.x,
      y: trickRect.y + trickRect.height / 2 - gameScreenRect.y,
    };

    switch (player) {
      case "left":
        return {
          x: trickCenter.x - cardWidth,
          y: trickCenter.y - cardHeight / 2,
        };
      case "top":
        return {
          x: trickCenter.x - cardWidth / 2,
          y: trickCenter.y - cardHeight,
        };
      case "right":
        return { x: trickCenter.x, y: trickCenter.y - cardHeight / 2 };
      case "bottom":
      default:
        return { x: trickCenter.x - cardWidth / 2, y: trickCenter.y };
    }
  };

  const onTrickWon = () => {
    console.log("trick won");
  };

  const collect = (winner: PlayerPosition) => {
    const winnerRef = getPlayerStartRef(winner);
    if (!winnerRef.current || !gameScreenRef.current) return;

    const gameScreenRect = gameScreenRef.current.getBoundingClientRect();
    const winnerRect = winnerRef.current.getBoundingClientRect()!;
    const winnerCenter = {
      x: winnerRect.x + winnerRect.width / 2 - gameScreenRect.x,
      y: winnerRect.y + winnerRect.height / 2 - gameScreenRect.y,
    };

    const newTrickCards = trickCards.map((trickCard) => ({
      ...trickCard,
      playedBy: "winner" as PlayerPosition,
      startPosition: {
        x: winnerCenter.x - cardWidth / 2,
        y: winnerCenter.y - cardHeight / 2,
      },
    }));

    setTrickCards(newTrickCards);

    setTimeout(() => {
      setTrickCards([]);
      onTrickWon();
    }, 1000);
  };

  useEffect(() => {
    if (trickCards.length === 4) {
      const winner: PlayerPosition = ["top", "right", "bottom", "left"][
        Math.floor(Math.random() * 4)
      ] as PlayerPosition;
      console.log(`${winner} wins the trick!`);

      setTimeout(() => {
        collect(winner);
      }, 1000);
    }
  }, [trickCards, cardWidth, cardHeight]);

  return (
    <div
      ref={gameScreenRef}
      className="game-screen relative h-full flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute top-1/3 text-4xl">Round 1</div>
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={leftProfileRef}
        className="absolute left-5 top-1/2 -translate-y-1/2"
        name="Player 2"
      />
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={topProfileRef}
        className="absolute top-5 left-1/2 -translate-x-1/2"
        name="Player 3"
      />
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={rightProfileRef}
        className="absolute right-5 top-1/2 -translate-y-1/2"
        name="Player 4"
      />

      <div
        ref={trickAreaRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: cardWidth * 2, height: cardHeight * 2 }}
      />

      {trickCards.map(({ card, playedBy, startPosition }, index) => {
        const endPosition =
          playedBy === "winner"
            ? startPosition
            : getTrickCardPosition(playedBy);

        return (
          <motion.div
            key={card}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cardWidth,
              height: cardHeight,
            }}
            initial={{
              x: startPosition.x,
              y: startPosition.y,
              scale: 1,
              opacity: 1,
              zIndex: 1000 + index,
            }}
            animate={{
              x: endPosition.x,
              y: endPosition.y,
              scale: playedBy === "winner" ? 0 : 1,
              opacity: playedBy === "winner" ? 0 : 1,
              zIndex: index,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-md bg-gray-800 shadow-lg border border-gray-700 flex items-center justify-center"
          >
            {card}
          </motion.div>
        );
      })}

      <div
        ref={bottomPlayerRef}
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-center ${
          booksOpen ? "blur-sm" : ""
        }`}
        style={{ height: cardHeight * 1.5 }}
      >
        <CardsHand
          hand={hand}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPlay={(card, cardRef) => {
            setHand(hand.filter((h) => h.code !== card.code));
            playCard(card.code, "bottom", cardRef);
          }}
          allowedCards={["AH"]}
        />
      </div>

      {bidPopupOpen && (
        <BidPopup
          onBid={(bid) => {
            console.log(bid);
            setBidPopupOpen(false);
          }}
        />
      )}
      {booksOpen && <Books onClose={() => setBooksOpen(false)} />}
      <div className="absolute top-0 right-0 p-4 flex flex-col gap-2">
        <Button title="Books" onClick={() => setBooksOpen(true)} />
      </div>
    </div>
  );
}
