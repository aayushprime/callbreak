import { motion } from "framer-motion";
import { HandCard, PlayerId, parseCard } from "./Hand";

export function TrickCard({
  spot,
  card,
  collectTo,
}: {
  spot: "bottom" | "left" | "top" | "right";
  card: HandCard;
  collectTo: PlayerId | null;
}) {
  // position within 64x64 box
  const pos: Record<string, React.CSSProperties> = {
    bottom: { left: "50%", bottom: 0, transform: "translateX(-50%)" },
    top: { left: "50%", top: 0, transform: "translateX(-50%)" },
    left: { left: 0, top: "50%", transform: "translateY(-50%)" },
    right: { right: 0, top: "50%", transform: "translateY(-50%)" },
  };
  // collect direction rough vector by winner
  const to = collectTo;
  const collectAnim =
    to == null
      ? { opacity: 1, scale: 1, x: 0, y: 0 }
      : to === 0
      ? { opacity: 0, scale: 0.6, y: 120 }
      : to === 1
      ? { opacity: 0, scale: 0.6, x: -120 }
      : to === 2
      ? { opacity: 0, scale: 0.6, y: -120 }
      : { opacity: 0, scale: 0.6, x: 120 };

  return (
    <motion.div
      className="absolute w-24 h-36 rounded-md bg-white border border-slate-200 card-shadow flex items-center justify-center"
      style={pos[spot]}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={collectAnim}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
    >
      <div className="absolute top-2 left-2 text-left leading-none">
        {(() => {
          const p = parseCard(card.code);
          return (
            <>
              <div
                className={`text-base font-semibold ${
                  p.suit === "♥" || p.suit === "♦"
                    ? "text-red-600"
                    : "text-black"
                }`}
              >
                {p.rank}
              </div>
              <div
                className={`text-base ${
                  p.suit === "♥" || p.suit === "♦"
                    ? "text-red-600"
                    : "text-black"
                }`}
              >
                {p.suit}
              </div>
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
