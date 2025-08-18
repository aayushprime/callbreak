"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const positions = [
  { x: "-100vw", y: 0 }, // left edge
  { x: "100vw", y: 0 }, // right edge
  { x: 0, y: "-100vh" }, // top edge
  { x: 0, y: "100vh" }, // bottom edge
];

export default function CardAnimation() {
  const [showCards, setShowCards] = useState(false);

  return (
    <div className="relative w-screen h-screen flex items-center justify-center bg-gray-900">
      <button
        onClick={() => setShowCards(true)}
        className="absolute top-4 left-4 bg-white p-2 rounded"
      >
        Start Animation
      </button>

      <AnimatePresence>
        {showCards &&
          positions.map((pos, i) => (
            <motion.div
              key={i}
              className="w-24 h-36 bg-blue-500 rounded-xl shadow-lg absolute"
              initial={{ opacity: 0, x: pos.x, y: pos.y }}
              animate={{
                opacity: 1,
                x: (i - 1.5) * 120,
                y: 0,
                rotate: (i - 1.5) * 10,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 3, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
