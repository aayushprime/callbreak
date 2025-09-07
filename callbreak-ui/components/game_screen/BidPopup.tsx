"use client";
import { useState } from "react";

export const BidPopup = ({
  onBidSubmit,
}: {
  onBidSubmit: (bid: number) => void;
}) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  const handleBid = (bid: number) => {
    setSelectedBid(bid);
    onBidSubmit(bid);
  };

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                  flex flex-col items-center justify-center 
                  bg-green-800 p-6 rounded-3xl shadow-lg border border-green-600 text-white"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Place your bid</h2>

      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => {
          const bidValue = i + 1;
          const isSelected = selectedBid === bidValue;
          return (
            <button
              key={i}
              onClick={() => handleBid(bidValue)}
              disabled={selectedBid !== null} // disable all buttons once one is clicked
              className={`font-semibold px-6 py-4 rounded-xl transition-all duration-200 shadow-md
                ${
                  isSelected
                    ? "bg-yellow-500 text-black"
                    : "bg-green-700 hover:bg-green-600 text-white"
                }
              `}
            >
              {bidValue}
            </button>
          );
        })}
      </div>
    </div>
  );
};
