"use client";
import { Hand } from "@/components/game_screen/Hand";
import { Profile } from "@/components/game_screen/Profile";
import { TrickCard } from "@/components/game_screen/TrickCard";
import { useGame } from "@/contexts/GameContext";
import { useRoom } from "@/contexts/RoomContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "common";
import { useEffect, useState, useCallback } from "react";
import { BidPopup } from "./BidPopup";
import { Books } from "./Books";
import RoomService from "@/lib/RoomService";

export function GameScreen() {
  const { roomState } = useRoom();

  const { addToast } = useToast();
  const { setScene } = useGame();

  const [gameState, setGameState] = useState<any>(null);
  const [showBidPopup, setShowBidPopup] = useState(false);
  const [showBooksPopup, setShowBooksPopup] = useState(false);

  useEffect(() => {
    RoomService.sendGameMessage("requestGameState", {});
    const handleGameState = (state: any) => {
      setGameState(state);
    };

    const handleGetBid = () => {
      setShowBidPopup(true);
    };

    const handleGetCard = () => {
      // The UI should highlight that it's the player's turn
    };

    const handleGameEnded = ({ reason }: { reason: string }) => {
      addToast(`Game ended: ${reason}`);
      setScene("lobby");
    };

    RoomService.on("gameState", handleGameState);
    RoomService.on("getBid", handleGetBid);
    RoomService.on("getCard", handleGetCard);
    RoomService.on("gameEnded", handleGameEnded);

    return () => {
      RoomService.off("gameState", handleGameState);
      RoomService.off("getBid", handleGetBid);
      RoomService.off("getCard", handleGetCard);
      RoomService.off("gameEnded", handleGameEnded);
    };
  }, [addToast, setScene]);

  const handleBidSubmit = (bid: number) => {
    RoomService.sendGameMessage("bid", { bid });
    setShowBidPopup(false);
  };

  const handlePlayCard = useCallback((card: Card) => {
    RoomService.sendGameMessage("playCard", { card });
  }, []);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  const {
    players: playerIds,
    you,
    playerCards,
    turn,
    phase,
    playedCards,
    validCards = [],
  } = gameState;
  const yourPlayerIndex = playerIds.indexOf(you);

  const players = playerIds.map((id: string) =>
    roomState.players.find((p) => p.id === id)
  );
  const youPlayer = players[yourPlayerIndex] || {};

  return (
    <div className="game-screen h-full bg-green-800 text-white">
      {/* Opponents */}
      <div className="absolute top-1/2 left-5 -translate-y-1/2">
        <Profile {...(players[(yourPlayerIndex + 1) % 4] || {})} />
      </div>
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Profile {...(players[(yourPlayerIndex + 2) % 4] || {})} />
      </div>
      <div className="absolute top-1/2 right-5 -translate-y-1/2">
        <Profile {...(players[(yourPlayerIndex + 3) % 4] || {})} />
      </div>

      {/* Player's Hand */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Hand
          hand={playerCards}
          onPlay={handlePlayCard}
          validCards={validCards}
        />
        <Profile {...youPlayer} />
      </div>

      {/* Trick */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex space-x-4">
          {playedCards.map((card: Card, index: number) => (
            <TrickCard key={index} card={card} />
          ))}
        </div>
      </div>

      {/* Bidding Popup */}
      {showBidPopup && (
        <BidPopup
          onBidSubmit={(value) => {
            handleBidSubmit(value);
          }}
        />
      )}

      {/* Game Info */}
      <div className="absolute top-4 left-4">
        <p>Phase: {phase}</p>
        <p>Turn: {players[turn]?.name}</p>
      </div>

      {/* Books */}
      {showBooksPopup && (
        <div className="absolute top-4 right-4">
          <Books onClose={() => setShowBooksPopup(false)} />
        </div>
      )}
    </div>
  );
}
