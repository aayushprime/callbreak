"use client";
import { Hand } from "@/components/game_screen/Hand";
import { Profile } from "@/components/game_screen/Profile";
import { useGame } from "@/contexts/GameContext";
import { useRoom } from "@/contexts/RoomContext";
import { useToast } from "@/contexts/ToastContext";
import { Card, GameStateSnapshot } from "callbreak-engine";
import { Player } from "room-service";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { BidPopup } from "./BidPopup";
import { Books } from "./Books";
import { Trick } from "./Trick";
import { SelfProfile } from "./SelfProfile";
import { Button } from "../ui/Button";
import { useRouter } from "next/navigation";
import { Popup } from "../ui/Popup";
import { BackButton } from "../ui/BackButton";

export function GameScreen() {
  const { roomState, dispatch, roomService } = useRoom();
  const router = useRouter();

  const { addToast } = useToast();
  const { setScene } = useGame();

  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [isAnimatingTrick, setIsAnimatingTrick] = useState(false);
  const [showBidPopup, setShowBidPopup] = useState(false);
  const [showBooksPopup, setShowBooksPopup] = useState(false);
  const [showQuitPopup, setShowQuitPopup] = useState(false);
  const [gameResult, setGameResult] = useState<{ winnerId: string } | null>(
    null
  );

  const [profilePositions, setProfilePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const profileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const trickContainerRef = useRef<HTMLDivElement>(null);

  const [trickWinner, setTrickWinner] = useState<string | null>(null);
  const [trickCount, setTrickCount] = useState(0);
  const [winningPosition, setWinningPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [turnTimer, setTurnTimer] = useState<{
    playerId: string;
    msLeft: number;
  } | null>(null);
  const [animatingCard, setAnimatingCard] = useState<{
    card: Card;
    rect: DOMRect;
  } | null>(null);

  const handleWinAnimationComplete = useCallback(() => {
    setTrickWinner(null);
    setTrickCount((c) => c + 1);
    setIsAnimatingTrick(false);
    // roomService.send({ type: "requestGameState", scope: "game", payload: {} });
  }, [roomService]);

  useLayoutEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const trickRect = trickContainerRef.current?.getBoundingClientRect();
    if (!trickRect) return;

    Object.keys(profileRefs.current).forEach((playerId) => {
      const el = profileRefs.current[playerId];
      if (el) {
        const rect = el.getBoundingClientRect();
        positions[playerId] = {
          x:
            rect.left + rect.width / 2 - (trickRect.left + trickRect.width / 2),
          y:
            rect.top + rect.height / 2 - (trickRect.top + trickRect.height / 2),
        };
      }
    });
    setProfilePositions(positions);
  }, [gameState?.players]);

  useLayoutEffect(() => {
    if (trickWinner && profilePositions[trickWinner]) {
      setWinningPosition(profilePositions[trickWinner]);
    } else {
      setWinningPosition(null);
    }
  }, [trickWinner, profilePositions]);

  useEffect(() => {
    const handleGameState = (state: GameStateSnapshot) => {
      if (isAnimatingTrick) return;
      setGameState(state);
    };

    const handleGetBid = () => {
      setShowBidPopup(true);
    };

    const handleGameEnded = ({
      reason,
      winnerId,
    }: {
      reason: string;
      winnerId?: string;
    }) => {
      if (reason === "completed" && winnerId) {
        setGameResult({ winnerId });
        setShowBooksPopup(true);
      } else {
        addToast(`Game ended: ${reason}`);
        setScene("lobby");
      }
    };

    const handleBidMade = () => {
      setShowBidPopup(false);
    };

    const handlePlayerBid = ({
      playerId,
      bid,
    }: {
      playerId: string;
      bid: number;
    }) => {
      setGameState((prevState) => {
        if (!prevState) return null;
        return {
          ...prevState,
          bids: { ...prevState.bids, [playerId]: bid },
        };
      });
    };

    const handlePlayerCard = ({
      playerId,
      card,
    }: {
      playerId: string;
      card: Card;
    }) => {
      setGameState((prevState) => {
        if (!prevState) return null;
        if (prevState.playedCards.some((p: any) => p.card === card)) {
          return prevState;
        }
        let newPlayedCards = null;
        if (prevState.playedCards.length === 4) {
          newPlayedCards = [{ player: playerId, card }];
        } else {
          newPlayedCards = [
            ...prevState.playedCards,
            { player: playerId, card },
          ];
        }
        return { ...prevState, playedCards: [...newPlayedCards] };
      });
    };

    const handleTrickWon = ({ winnerId }: { winnerId: string }) => {
      setIsAnimatingTrick(true);
      setTimeout(() => {
        setTrickWinner(winnerId);
      }, 500);
    };

    const handleTurnTimer = (data: { playerId: string; msLeft: number }) => {
      setTurnTimer(data);
    };

    roomService.on("gameState", handleGameState);
    roomService.on("getBid", handleGetBid);
    roomService.on("gameEnded", handleGameEnded);
    roomService.on("bidMade", handleBidMade);
    roomService.on("playerBid", handlePlayerBid);
    roomService.on("playerCard", handlePlayerCard);
    roomService.on("trickWon", handleTrickWon);
    roomService.on("turnTimer", handleTurnTimer);

    roomService.send({ type: "requestGameState", scope: "game", payload: {} });

    return () => {
      roomService.off("gameState", handleGameState);
      roomService.off("getBid", handleGetBid);
      roomService.off("gameEnded", handleGameEnded);
      roomService.off("bidMade", handleBidMade);
      roomService.off("playerBid", handlePlayerBid);
      roomService.off("playerCard", handlePlayerCard);
      roomService.off("trickWon", handleTrickWon);
      roomService.off("turnTimer", handleTurnTimer);
    };
  }, [
    addToast,
    setScene,
    isAnimatingTrick,
    handleWinAnimationComplete,
    roomService,
  ]);

  useEffect(() => {
    if (!turnTimer) return;
    const tick = 100;
    const intervalId = setInterval(() => {
      setTurnTimer((currentTimer) => {
        if (!currentTimer) {
          clearInterval(intervalId);
          return null;
        }
        const newMsLeft = currentTimer.msLeft - tick;
        if (newMsLeft <= 0) {
          clearInterval(intervalId);
          return { ...currentTimer, msLeft: 0 };
        }
        return { ...currentTimer, msLeft: newMsLeft };
      });
    }, tick);

    return () => clearInterval(intervalId);
  }, [turnTimer]);

  const handleBidSubmit = (bid: number) => {
    roomService.send({ type: "bid", scope: "game", payload: { bid } });
    setShowBidPopup(false);
  };

  const handlePlayCard = useCallback(
    (card: Card, cardRef: React.RefObject<HTMLDivElement | null>) => {
      if (cardRef.current) {
        setAnimatingCard({
          card,
          rect: cardRef.current.getBoundingClientRect(),
        });
      }
      setGameState((prevState) => {
        if (!prevState) return null;
        return { ...prevState, validCards: [] };
      });
      roomService.send({ type: "playCard", scope: "game", payload: { card } });
    },
    [roomService]
  );

  if (!gameState) {
    return <div className="text-center h-full">Loading...</div>;
  }

  const {
    players: playerIds,
    you,
    playerCards,
    turn,
    phase,
    playedCards,
    validCards = [],
    bids = {},
    tricksWon = {},
  } = gameState;
  const yourPlayerIndex = playerIds.indexOf(you);

  const players = playerIds.map((id: string) =>
    roomState.players.find((p) => p.id === id)
  );
  const youPlayer = players[yourPlayerIndex] || { id: "" };

  const handleMainMenu = () => {
    roomService.disconnect();
    dispatch({ type: "MANUAL_DISCONNECT" });
    router.push("/");
    setScene("menu");
  };

  return (
    <div className="game-screen relative h-full bg-green-800 text-white">
      {/* Opponents */}
      <div className="absolute top-1/2 left-5 -translate-y-1/2">
        <Profile
          ref={(el) => {
            const player = players[(yourPlayerIndex + 1) % 4];
            if (player) profileRefs.current[player.id] = el;
          }}
          {...(players[(yourPlayerIndex + 1) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 1) % 4]?.id ?? ""]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 1) % 4]?.id ?? ""]}
          showStats={true}
          active={turn === (yourPlayerIndex + 1) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 1) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 1) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : (turnTimer?.msLeft ?? 0) / 1000
              : 0
          }
          pillPosition="right"
        />
      </div>
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Profile
          ref={(el) => {
            const player = players[(yourPlayerIndex + 2) % 4];
            if (player) profileRefs.current[player.id] = el;
          }}
          {...(players[(yourPlayerIndex + 2) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 2) % 4]?.id ?? ""]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 2) % 4]?.id ?? ""]}
          showStats={true}
          active={turn === (yourPlayerIndex + 2) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 2) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 2) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : (turnTimer?.msLeft ?? 0) / 1000
              : 0
          }
          pillPosition="right"
        />
      </div>
      <div className="absolute top-1/2 right-5 -translate-y-1/2">
        <Profile
          ref={(el) => {
            const player = players[(yourPlayerIndex + 3) % 4];
            if (player) profileRefs.current[player.id] = el;
          }}
          {...(players[(yourPlayerIndex + 3) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 3) % 4]?.id ?? ""]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 3) % 4]?.id ?? ""]}
          showStats={true}
          active={turn === (yourPlayerIndex + 3) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 3) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 3) % 4]?.id &&
            turnTimer
              ? turnTimer.msLeft === -1
                ? -1
                : (turnTimer?.msLeft ?? 0) / 1000
              : 0
          }
          pillPosition="left"
        />
      </div>

      <SelfProfile
        ref={(el) => {
          if (youPlayer) profileRefs.current[youPlayer.id] = el;
        }}
        {...youPlayer}
        bid={bids[youPlayer.id ?? ""]}
        tricksWon={tricksWon[youPlayer.id ?? ""]}
        active={turn === yourPlayerIndex}
        className="absolute bottom-8 left-16 -translate-x-1/2"
      />

      {/* Player's Hand */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl">
        <div className="relative w-full h-full">
          <Hand
            hand={playerCards}
            onPlay={handlePlayCard}
            validCards={validCards}
          />
        </div>
      </div>

      {/* Trick */}
      <div
        ref={trickContainerRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 z-10"
      >
        <Trick
          key={trickCount}
          playedCards={playedCards}
          winningPosition={winningPosition}
          profilePositions={profilePositions}
          playerIds={playerIds}
          yourPlayerIndex={yourPlayerIndex}
          onWinAnimationComplete={handleWinAnimationComplete}
          animatingCard={animatingCard}
        />
      </div>

      {showBidPopup && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <BidPopup onBidSubmit={handleBidSubmit} />
        </div>
      )}

      <div className="absolute top-4 left-4 z-60">
        <BackButton onClick={() => setShowQuitPopup(true)} />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-0">
        <h1 className="text-4xl font-bold opacity-50">
          Round {gameState.roundNumber}
        </h1>
      </div>

      <div className="absolute top-4 right-4 z-60">
        <Button title="Books" onClick={() => setShowBooksPopup(true)} />
      </div>

      {showBooksPopup && (
        <Books
          onClose={() => setShowBooksPopup(false)}
          players={players.filter((p) => p) as Player[]}
          roundHistory={gameState.roundHistory}
          points={gameState.points}
          winnerId={gameResult?.winnerId}
          footer={
            gameResult && (
              <Button
                title="Main Menu"
                onClick={handleMainMenu}
                className="bg-red-500 hover:bg-red-600"
              />
            )
          }
        />
      )}

      {showQuitPopup && (
        <Popup isOpen={showQuitPopup} title="Quit Game?">
          <div className="flex flex-col gap-4">
            <p>Are you sure you want to quit? Your progress will be lost.</p>
            <div className="flex justify-end gap-4">
              <Button
                title="No, Stay"
                onClick={() => setShowQuitPopup(false)}
              />
              <Button
                title="Yes, Quit"
                onClick={handleMainMenu}
                className="bg-red-500 hover:bg-red-600"
              />
            </div>
          </div>
        </Popup>
      )}

      {turnTimer?.playerId === youPlayer.id &&
        turnTimer &&
        turnTimer.msLeft !== -1 && (
          <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-600">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${((turnTimer?.msLeft ?? 0) / 30000) * 100}%`,
              }}
            />
          </div>
        )}
    </div>
  );
}