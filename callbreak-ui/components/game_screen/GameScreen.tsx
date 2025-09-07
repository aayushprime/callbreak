"use client";
import { Hand } from "@/components/game_screen/Hand";
import { Profile } from "@/components/game_screen/Profile";
import { useGame } from "@/contexts/GameContext";
import { useRoom } from "@/contexts/RoomContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "common";
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
import RoomService from "@/lib/RoomService";
import { SelfProfile } from "./SelfProfile";
import { Button } from "../ui/Button";
import { GameEndScreen } from "./GameEndScreen";
import { useRouter } from "next/navigation";

export function GameScreen() {
  const { roomState, dispatch } = useRoom();
  const router = useRouter();

  const { addToast } = useToast();
  const { setScene } = useGame();

  const [gameState, setGameState] = useState<any>(null);
  const [isAnimatingTrick, setIsAnimatingTrick] = useState(false);
  const [showBidPopup, setShowBidPopup] = useState(false);
  const [showBooksPopup, setShowBooksPopup] = useState(false);
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
    RoomService.sendGameMessage("requestGameState", {});
  }, []);

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
    const handleGameState = (state: any) => {
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
      setGameState((prevState: any) => ({
        ...prevState,
        bids: { ...prevState.bids, [playerId]: bid },
      }));
    };

    const handlePlayerCard = ({
      playerId,
      card,
    }: {
      playerId: string;
      card: Card;
    }) => {
      setGameState((prevState: any) => {
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
        return { ...prevState, playedCards: newPlayedCards };
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

    RoomService.on("gameState", handleGameState);
    RoomService.on("getBid", handleGetBid);
    RoomService.on("gameEnded", handleGameEnded);
    RoomService.on("bidMade", handleBidMade);
    RoomService.on("playerBid", handlePlayerBid);
    RoomService.on("playerCard", handlePlayerCard);
    RoomService.on("trickWon", handleTrickWon);
    RoomService.on("turnTimer", handleTurnTimer);

    RoomService.sendGameMessage("requestGameState", {});

    return () => {
      RoomService.off("gameState", handleGameState);
      RoomService.off("getBid", handleGetBid);
      RoomService.off("gameEnded", handleGameEnded);
      RoomService.off("bidMade", handleBidMade);
      RoomService.off("playerBid", handlePlayerBid);
      RoomService.off("playerCard", handlePlayerCard);
      RoomService.off("trickWon", handleTrickWon);
      RoomService.off("turnTimer", handleTurnTimer);
    };
  }, [addToast, setScene, isAnimatingTrick, handleWinAnimationComplete]);

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
    RoomService.sendGameMessage("bid", { bid });
    setShowBidPopup(false);
  };

  const handlePlayCard = useCallback(
    (card: Card, cardRef: React.RefObject<HTMLDivElement>) => {
      if (cardRef.current) {
        setAnimatingCard({
          card,
          rect: cardRef.current.getBoundingClientRect(),
        });
      }
      setGameState((prevState) => ({
        ...prevState,
        validCards: [],
      }));
      RoomService.sendGameMessage("playCard", { card });
    },
    []
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
  const youPlayer = players[yourPlayerIndex] || {};

  const handleMainMenu = () => {
    RoomService.disconnect();
    dispatch({ type: "MANUAL_DISCONNECT" });
    router.push("/");
    setScene("menu");
  };

  const winner = gameResult
    ? players.find((p) => p.id === gameResult.winnerId)
    : null;

  return (
    <div className="game-screen relative h-full bg-green-800 text-white">
      {/* Opponents */}
      <div className="absolute top-1/2 left-5 -translate-y-1/2">
        <Profile
          ref={(el) =>
            (profileRefs.current[players[(yourPlayerIndex + 1) % 4]?.id ?? ""] =
              el)
          }
          {...(players[(yourPlayerIndex + 1) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 1) % 4]?.id]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 1) % 4]?.id]}
          showStats={true}
          active={turn === (yourPlayerIndex + 1) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 1) % 4]?.id
              ? 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 1) % 4]?.id
              ? turnTimer.msLeft / 1000
              : 0
          }
          pillPosition="right"
        />
      </div>
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Profile
          ref={(el) =>
            (profileRefs.current[players[(yourPlayerIndex + 2) % 4]?.id ?? ""] =
              el)
          }
          {...(players[(yourPlayerIndex + 2) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 2) % 4]?.id]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 2) % 4]?.id]}
          showStats={true}
          active={turn === (yourPlayerIndex + 2) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 2) % 4]?.id
              ? 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 2) % 4]?.id
              ? turnTimer.msLeft / 1000
              : 0
          }
          pillPosition="right"
        />
      </div>
      <div className="absolute top-1/2 right-5 -translate-y-1/2">
        <Profile
          ref={(el) =>
            (profileRefs.current[players[(yourPlayerIndex + 3) % 4]?.id ?? ""] =
              el)
          }
          {...(players[(yourPlayerIndex + 3) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 3) % 4]?.id]}
          tricksWon={tricksWon[players[(yourPlayerIndex + 3) % 4]?.id]}
          showStats={true}
          active={turn === (yourPlayerIndex + 3) % 4}
          totalTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 3) % 4]?.id
              ? 30
              : 0
          }
          turnTime={
            turnTimer?.playerId === players[(yourPlayerIndex + 3) % 4]?.id
              ? turnTimer.msLeft / 1000
              : 0
          }
          pillPosition="left"
        />
      </div>

      <SelfProfile
        ref={(el) => (profileRefs.current[youPlayer.id] = el)}
        {...youPlayer}
        bid={bids[youPlayer.id]}
        tricksWon={tricksWon[youPlayer.id]}
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

      <div className="absolute top-4 left-4">
        <p>Phase: {phase}</p>
        <p>Turn: {players[turn]?.name}</p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-0">
        <h1 className="text-4xl font-bold opacity-50">
          Round {gameState.roundNumber}
        </h1>
      </div>

      <div className="absolute top-4 right-4">
        <Button title="Books" onClick={() => setShowBooksPopup(true)} />
      </div>

      {showBooksPopup && (
        <Books
          onClose={() => setShowBooksPopup(false)}
          players={players}
          roundHistory={gameState.roundHistory}
          points={gameState.points}
        />
      )}

      {winner && (
        <Books
          onClose={() => {}}
          players={players}
          roundHistory={gameState.roundHistory}
          points={gameState.points}
          showCloseButton={false}
          winnerId={winner.id}
          footer={
            <Button
              title="Main Menu"
              onClick={handleMainMenu}
              className="bg-red-500 hover:bg-red-600"
            />
          }
        />
      )}

      {turnTimer?.playerId === youPlayer.id && (
        <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-600">
          <div
            className="h-full bg-blue-500"
            style={{
              width: `${(turnTimer.msLeft / 30000) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
