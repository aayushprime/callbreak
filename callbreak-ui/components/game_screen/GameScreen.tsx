"use client";
import { Hand } from "@/components/game_screen/Hand";
import { Profile } from "@/components/game_screen/Profile";
import { useGame } from "@/contexts/GameContext";
import { useRoom } from "@/contexts/RoomContext";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "common";
import { useEffect, useState, useCallback, useRef } from "react";
import { BidPopup } from "./BidPopup";
import { Books } from "./Books";
import { Trick } from "./Trick";
import RoomService from "@/lib/RoomService";

export function GameScreen() {
  const { roomState } = useRoom();

  const { addToast } = useToast();
  const { setScene } = useGame();

  const [gameState, setGameState] = useState<any>(null);
  const [showBidPopup, setShowBidPopup] = useState(false);
  const [showBooksPopup, setShowBooksPopup] = useState(false);

  const profileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const trickContainerRef = useRef<HTMLDivElement>(null);

  const [trickWinner, setTrickWinner] = useState<string | null>(null);

  useEffect(() => {
    RoomService.sendGameMessage("requestGameState", {});
    const handleGameState = (state: any) => {
      setGameState(state);
      if (state.playedCards.length === 0) {
        setTrickWinner(null);
      }
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
        return {
          ...prevState,
          playedCards: [...prevState.playedCards, { player: playerId, card }],
        };
      });
    };

    const handleTrickWon = ({ winnerId }: { winnerId: string }) => {
      setTrickWinner(winnerId);
    };

    RoomService.on("gameState", handleGameState);
    RoomService.on("getBid", handleGetBid);
    RoomService.on("getCard", handleGetCard);
    RoomService.on("gameEnded", handleGameEnded);
    RoomService.on("bidMade", handleBidMade);
    RoomService.on("playerBid", handlePlayerBid);
    RoomService.on("playerCard", handlePlayerCard);
    RoomService.on("trickWon", handleTrickWon);

    return () => {
      RoomService.off("gameState", handleGameState);
      RoomService.off("getBid", handleGetBid);
      RoomService.off("getCard", handleGetCard);
      RoomService.off("gameEnded", handleGameEnded);
      RoomService.off("bidMade", handleBidMade);
      RoomService.off("playerBid", handlePlayerBid);
      RoomService.off("playerCard", handlePlayerCard);
      RoomService.off("trickWon", handleTrickWon);
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
    bids = {},
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
        <Profile
          ref={(el) =>
            (profileRefs.current[
              players[(yourPlayerIndex + 1) % 4]?.id ?? ""
            ] = el)
          }
          {...(players[(yourPlayerIndex + 1) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 1) % 4]?.id]}
          showStats={true}
        />
      </div>
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Profile
          ref={(el) =>
            (profileRefs.current[
              players[(yourPlayerIndex + 2) % 4]?.id ?? ""
            ] = el)
          }
          {...(players[(yourPlayerIndex + 2) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 2) % 4]?.id]}
          showStats={true}
        />
      </div>
      <div className="absolute top-1/2 right-5 -translate-y-1/2">
        <Profile
          ref={(el) =>
            (profileRefs.current[
              players[(yourPlayerIndex + 3) % 4]?.id ?? ""
            ] = el)
          }
          {...(players[(yourPlayerIndex + 3) % 4] || {})}
          bid={bids[players[(yourPlayerIndex + 3) % 4]?.id]}
          showStats={true}
        />
      </div>

      {/* Player's Hand */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Hand
          hand={playerCards}
          onPlay={handlePlayCard}
          validCards={validCards}
        />
        <Profile
          ref={(el) => (profileRefs.current[youPlayer.id] = el)}
          {...youPlayer}
          bid={bids[youPlayer.id]}
          showStats={true}
        />
      </div>

      {/* Trick */}
      <div
        ref={trickContainerRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48"
      >
        <Trick
          playedCards={playedCards}
          winnerId={trickWinner}
          profileRefs={profileRefs}
          trickContainerRef={trickContainerRef}
          playerIds={playerIds}
          yourPlayerIndex={yourPlayerIndex}
        />
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
