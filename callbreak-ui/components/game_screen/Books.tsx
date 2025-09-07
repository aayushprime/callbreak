"use client";

import { RoundHistory } from "common/dist/state";

type Player = {
  id: string;
  name: string;
};

import { ReactNode } from "react";

type Player = {
  id: string;
  name: string;
};

type BooksProps = {
  onClose: () => void;
  players: Player[];
  roundHistory: RoundHistory[];
  points: Record<string, number>;
  showCloseButton?: boolean;
  footer?: ReactNode;
  winnerId?: string | null;
};

export const Books = ({
  onClose,
  players,
  roundHistory,
  points,
  showCloseButton = true,
  footer,
  winnerId,
}: BooksProps) => {
  if (!roundHistory) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>
      <div className="relative bg-green-800 rounded-3xl shadow-lg border border-green-600 p-6 w-[95%] max-w-5xl text-white flex flex-col gap-4">
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-green-200 font-bold text-xl hover:text-white"
          >
            &times;
          </button>
        )}

        <h2 className="text-2xl font-bold text-white text-center">
          {winnerId ? "Game Over" : "Books"}
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-green-600 border-collapse text-center">
            <thead>
              <tr className="bg-green-700">
                <th className="px-4 py-2 border border-green-600">Round</th>
                {players.map((p) => (
                  <th
                    key={p.id}
                    className="px-4 py-2 border border-green-600 text-green-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{p.name}</span>
                      {p.id === winnerId && (
                        <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
                          WINNER
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {roundHistory.map((round, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx % 2 === 0 ? "bg-green-700/50" : "bg-green-800"
                  }
                >
                  <td className="px-4 py-2 border border-green-600 font-semibold">
                    {round.roundNumber}
                  </td>
                  {players.map((p) => (
                    <td
                      key={`${p.id}-r${rIdx}`}
                      className="px-4 py-2 border border-green-600"
                    >
                      {round.bids[p.id]}/{round.tricksWon[p.id]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-green-700 font-bold">
                <td className="px-4 py-2 border border-green-600">Total</td>
                {players.map((p) => (
                  <td
                    key={p.id}
                    className="px-4 py-2 border border-green-600"
                  >
                    {points[p.id]?.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {footer && <div className="flex justify-center">{footer}</div>}
      </div>
    </div>
  );
};
