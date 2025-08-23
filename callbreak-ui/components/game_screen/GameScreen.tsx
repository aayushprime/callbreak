"use client";

import { CardsHand } from "./Hand";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createStandardDeck, Card, computeValidCards } from "common";
import { HandCard } from "./Hand";
import { ProfileHandle, Profile } from "./Profile";
import { motion } from "framer-motion";
import { Card as CardComponent } from "../ui/Card";
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
  collected?: boolean;
  collectedTo?: PlayerPosition;
  collectedPosition?: { x: number; y: number };
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

  // Profile components expose an imperative handle; type refs accordingly.
  const leftProfileRef = useRef<ProfileHandle | null>(null);
  const topProfileRef = useRef<ProfileHandle | null>(null);
  const rightProfileRef = useRef<ProfileHandle | null>(null);
  const selfPlayerRef = useRef<HTMLDivElement | null>(null);

  const trickAreaRef = useRef<HTMLDivElement>(null);
  const { room } = useRoom();
  const { addToast } = useToast();
  const [status, setStatus] = useState<string>("");

  const [selfId, setSelfId] = useState<string>("self");
  const selfIdRef = useRef<string>("self"); // this is for getting the correct selfId in event handler; without this, old selfId was being used (js closures)

  const [profileNames, setProfileNames] = useState<string[]>(["right", "top", "left"]);
  const profileNamesRef = useRef<string[]>(profileNames);
  const profileRefs = {
    "right": rightProfileRef,
    "top": topProfileRef,
    "left": leftProfileRef,
  }

  const [bids, setBids] = useState<{ [id: string]: number }>({});
  const [points, setPoints] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    if (!room) return;
    const unsubscribe = room.subscribe((event, ack) => {
      if (event.type === "gameState") {
        ack();
        const players: string[] = event.payload.players;
        const you = event.payload.you;

        setSelfId(you);
        selfIdRef.current = you;

        // for now only the names are sent from the server
        const idx = players.findIndex((el) => el === you);
        const order = players.slice(idx + 1).concat(players.slice(0, idx));
        setProfileNames(order);
        profileNamesRef.current = order;
        setHand(
          event.payload.playerCards.map((code: string, i: number) => ({
            code,
            createdAt: Date.now(),
            uid: String(i),
            fromDeck: true,
          }))
        );

        setBidPopupOpen(false);
        setTrickCards([]);

      } else if (event.type === "playerBid") {
        ack();
        const { playerId, bid } = event.payload;
        setBids((prev) => ({
          ...prev,
          [playerId]: bid,
        }));
        if (playerId === selfIdRef.current) {
          setBidPopupOpen(false);
        }
      } else if (event.type === "playerCard") {
        ack();
        // from name of playerId, find which profile it is (left, top, right)
        const { playerId, card } = event.payload;
        const pos =
          playerId === selfIdRef.current
            ? "bottom"
            : profileNamesRef.current[0] === playerId
              ? "right"
              : profileNamesRef.current[1] === playerId
                ? "top"
                : "left";
        // get profile ref
        playCard(card, pos);
      } else if (event.type === "getCard") {
        ack();
        console.log("Setting allowed cards")
        setAllowedCards(computeValidCards(hand.map(k => k.code), event.payload.playedCards || []))
      } else if (event.type === "getBid") {
        ack();
        setBidPopupOpen(true);
      } else if (event.type === "close") {
        ack();
        addToast("Connection broken.");
      } else if (event.type === "error") {
        ack();
        addToast(event.payload?.message);
      } else if (event.type === "status") {
        ack();
        setStatus(event.payload);
      } else if (event.type === "turnTimer") {
        console.log("[Lobby] turnTimer event:", event);

        // this.emit('broadcast', 'turnTimer', { playerId: playerId, msLeft: this.remainingTimeMs() });
        // payload: { playerId, msLeft }
        ack();
        const { playerId, msLeft, totalMs } = event.payload || {};
        if (!playerId) return;

        // stop everyone's turn timer first
        callProfileMethod(rightProfileRef as any, "stopTurnTimer");
        callProfileMethod(topProfileRef as any, "stopTurnTimer");
        callProfileMethod(leftProfileRef as any, "stopTurnTimer");
        setSelfTimerMs(0);

        if (playerId === selfIdRef.current) {
          setSelfTimerTotalMs(totalMs ?? 0);
          setSelfTimerMs(msLeft ?? 0);
        } else {

          const idx = profileNamesRef.current.findIndex(name => name === playerId);
          const prof = profileRefs[(["right", "top", "left"] as const)[idx]]?.current;
          if (prof) {
            prof.setTurnTimer(msLeft, totalMs);
          }
        }

      } else {
        ack();
        console.log("[Lobby] Unhandled event:", event);
      }
    });
    return unsubscribe;
  }, [room]);

  // Self turn timer state (ms)
  const [selfTimerMs, setSelfTimerMs] = useState<number>(0);
  const [selfTimerTotalMs, setSelfTimerTotalMs] = useState<number>(0);
  // Track active turn to prevent duplicate handling
  const playCard = useCallback(
    (
      card: Card,
      player: PlayerPosition,
      cardRef?: React.RefObject<HTMLDivElement | null>
    ) => {
      if (!gameScreenRef.current) return;
      const gameScreenRect = gameScreenRef.current.getBoundingClientRect();

      let startPosition = { x: 0, y: 0 };
      const playerRef = getProfileRef(player);

      if (cardRef?.current) {
        const rect = cardRef.current.getBoundingClientRect();
        startPosition = {
          x: rect.x - gameScreenRect.x,
          y: rect.y - gameScreenRect.y,
        };
      } else if (playerRef.current) {
        // playerRef.current can be either a ProfileHandle (which exposes
        // getBoundingClientRect) or an HTMLDivElement. Guard and call the
        // function if present.
        let rect: DOMRect | undefined;
        const cur = playerRef.current as any;
        if (cur && typeof cur.getBoundingClientRect === "function") {
          rect = cur.getBoundingClientRect();
        }
        if (rect) {
          startPosition = {
            x: rect.x + rect.width / 2 - gameScreenRect.x - cardWidth / 2,
            y: rect.y + rect.height / 2 - gameScreenRect.y - cardHeight / 2,
          };
        }
      }

      setTrickCards((prev) => [
        ...prev,
        { card, playedBy: player, startPosition },
      ]);

    },
    [cardWidth, cardHeight]
  );

  const getProfileRef = (player: PlayerPosition) => {
    switch (player) {
      case "left":
        return leftProfileRef;
      case "top":
        return topProfileRef;
      case "right":
        return rightProfileRef;
      case "bottom":
      default:
        return selfPlayerRef;
    }
  };

  // Helper: safely call a method on a profile ref if it exists. This avoids
  // using `// @ts-ignore` when the ref may be either the imperative handle or
  // a DOM element.
  const callProfileMethod = (
    ref: React.RefObject<any>,
    method: string,
    ...args: any[]
  ) => {
    const cur = ref.current;
    if (!cur) return;
    const fn = (cur as any)[method];
    if (typeof fn === "function") {
      try {
        fn(...args);
      } catch (e) {
        // ignore runtime errors from optional methods
      }
    }
  };

  const simulateTurnTimer = (
    playerId: string,
    msLeft = 10000,
    totalMs = 10000
  ) => {
    // stop everyone's turn timer first
    callProfileMethod(rightProfileRef as any, "stopTurnTimer");
    callProfileMethod(topProfileRef as any, "stopTurnTimer");
    callProfileMethod(leftProfileRef as any, "stopTurnTimer");
    setSelfTimerMs(0);
    if (playerId === selfIdRef.current) {
      setSelfTimerTotalMs(totalMs ?? 0);
      setSelfTimerMs(msLeft ?? 0);
    } else {
      const idx = profileNamesRef.current.findIndex(name => name === playerId);
      const prof = profileRefs[(["right", "top", "left"] as const)[idx]]?.current;
      if (prof) {
        prof.setTurnTimer(msLeft, totalMs);
      }
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

  const getPlayerCenterPosition = (player: PlayerPosition) => {
    const winnerRef = getProfileRef(player);
    if (!winnerRef.current || !gameScreenRef.current) return { x: 0, y: 0 };
    const gameScreenRect = gameScreenRef.current.getBoundingClientRect();
    const winnerRect = winnerRef.current.getBoundingClientRect()!;
    return {
      x: winnerRect.x + winnerRect.width / 2 - gameScreenRect.x - cardWidth / 2,
      y:
        winnerRect.y +
        winnerRect.height / 2 -
        gameScreenRect.y -
        cardHeight / 2,
    };
  };

  const collectTricks = (winner: PlayerPosition) => {
    if (trickCards.length === 0) return;
    const winnerPos = getPlayerCenterPosition(winner);

    setTrickCards((prev) =>
      prev.map((tc) => ({
        ...tc,
        collected: true,
        collectedTo: winner,
        collectedPosition: winnerPos,
      }))
    );

    // clear after the animation finishes
    setTimeout(() => {
      setTrickCards([]);
    }, 600);
  };

  const [allowedCards, setAllowedCards] = useState<Card[]>([]);

  const handlePlay = useCallback(
    (card: HandCard, cardRef?: React.RefObject<HTMLDivElement | null>) => {
      setHand((prev) => prev.filter((h) => h.code !== card.code));
      playCard(card.code, "bottom", cardRef);
    },
    [playCard]
  );

  // compute progress for self timer: grows towards the end
  const selfProgress =
    selfTimerTotalMs > 0
      ? Math.min(1, Math.max(0, 1 - selfTimerMs / selfTimerTotalMs))
      : 0;

  // Local countdown for self timer (ms resolution)
  useEffect(() => {
    if (!selfTimerTotalMs || selfTimerMs <= 0) return;
    const tick = 100; // ms
    const id = setInterval(() => {
      setSelfTimerMs((m) => {
        const next = Math.max(0, m - tick);
        return next;
      });
    }, tick);
    return () => clearInterval(id);
  }, [selfTimerTotalMs]);

  useEffect(() => {
    setHand([{ createdAt: Date.now(), code: "AC", uid: "1", fromDeck: true }]);
  }, []);

  return (
    <div
      ref={gameScreenRef}
      className="game-screen outline outline-[8px] outline-red-400 relative h-full flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute top-1/3 text-4xl">Round 1</div>
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={rightProfileRef}
        className="absolute right-10 top-1/2 -translate-y-1/2"
        name={profileNames[0]}
        bid={bids[profileNames[0]]}
        points={points[profileNames[0]] ?? 0}
        showStats={true}
      />
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={topProfileRef}
        className="absolute top-5 left-1/2 -translate-x-1/2"
        name={profileNames[1]}
        bid={bids[profileNames[1]]}
        points={points[profileNames[1]] ?? 0}
        showStats={true}
      />
      <Profile
        size={Math.min(width * 0.05, 80)}
        ref={leftProfileRef}
        className="absolute left-10 top-1/2 -translate-y-1/2"
        name={profileNames[2]}
        bid={bids[profileNames[2]]}
        points={points[profileNames[2]] ?? 0}
        showStats={true}
      />

      <div
        ref={trickAreaRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: cardWidth * 2, height: cardHeight * 2 }}
      />

      {trickCards.map((tc, index) => {
        const { card, playedBy, startPosition, collected, collectedPosition } =
          tc;

        const endPosition =
          collected && collectedPosition
            ? collectedPosition
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
              zIndex: 100 + index,
            }}
            animate={{
              x: endPosition.x,
              y: endPosition.y,
              scale: collected ? 0 : 1,
              opacity: collected ? 0 : 1,
              zIndex: index,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <CardComponent card={card} />
          </motion.div>
        );
      })}

      <div
        ref={selfPlayerRef}
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-center ${booksOpen ? "blur-sm" : ""
          }`}
        style={{ height: cardHeight * 1.5 }}
      >
        {/* bottom progress bar will be rendered after the hand so it layers on top */}
        {/* Self bid/points display above the hand */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          <div className="bg-black/70 text-white text-sm px-3 py-1 rounded-md">
            Bid: {bids[selfId] ?? "-"}
          </div>
          <div className="bg-black/70 text-white text-sm px-3 py-1 rounded-md">
            Pts: {points[selfId] ?? 0}
          </div>
        </div>
        <CardsHand
          hand={hand}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onPlay={handlePlay}
          allowedCards={allowedCards}
        />
        {/* progress bar intentionally omitted here; top-level bar rendered below */}
      </div>

      {/* Bottom self-turn progress bar (grows as time runs out) */}
      {/* Top-level progress bar (inside game-screen) to avoid stacking-contexts created by transformed children */}
      {selfTimerTotalMs > 0 &&
        selfTimerMs > 0 && (
          <div
            className="self-timer absolute left-0 right-0 bottom-0 pointer-events-none flex items-end justify-center"
            style={{ zIndex: 99999 }}
          >
            <div className="w-full">
              <div
                className="h-2 w-full rounded-none overflow-hidden"
                style={{
                  background: "#3b82f6",
                }}
              >
                <div
                  style={{
                    width: `${Math.round(selfProgress * 100)}%`,
                    transition: "width 120ms linear",
                    height: "100%",
                    background: "#0e60ed",
                  }}
                />
              </div>
            </div>
          </div>
        )}

      {bidPopupOpen && (
        <BidPopup
          onBid={(bid) => {
            room?.sendGameMessage("bid", { bid });
          }}
        />
      )}

      {booksOpen && <Books onClose={() => setBooksOpen(false)} />}
      <div className="absolute top-0 right-0 p-4 flex flex-col gap-2">
        <Button title="Books" onClick={() => setBooksOpen(true)} />
        <Button title="right" onClick={() => playCard("AC", "right")} />
        <Button title="top" onClick={() => playCard("AC", "top")} />
        <Button title="left" onClick={() => playCard("AC", "left")} />
        <Button
          title="Force Timer"
          onClick={() => {
            setSelfTimerTotalMs(10000);
            setSelfTimerMs(0);
          }}
        />
        {/* Debug: simulate turnTimer events */}
        <div className="flex gap-2 items-center mt-2">
          <Button
            title="Sim: Self"
            onClick={() =>
              simulateTurnTimer(selfIdRef.current || selfId, 10000, 10000)
            }
          />
          {["left"].map((pid) => (
            <Button
              key={pid}
              title={`Sim: ${pid}`}
              onClick={() => simulateTurnTimer(pid, 10000, 10000)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
