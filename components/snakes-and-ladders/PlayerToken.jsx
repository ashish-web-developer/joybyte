"use client";

import { motion } from "framer-motion";

export default function PlayerToken({ player, square, offset = 0, active }) {
  if (!square) return null;

  const rowFromBottom = Math.floor((square - 1) / 10);
  const indexInRow = (square - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? indexInRow : 9 - indexInRow;
  const row = 9 - rowFromBottom;

  return (
    <motion.div
      className={`snl-token snl-token-${player.icon} ${active ? "snl-token-active" : ""}`}
      initial={false}
      animate={{
        left: `${(col + 0.5) * 10 + offset}%`,
        top: `${(row + 0.48) * 10}%`,
        scale: [0.8, 1.16, 1],
      }}
      transition={{ left: { duration: 0.28, ease: "easeOut" }, top: { duration: 0.28, ease: "easeOut" }, scale: { duration: 0.25 } }}
      aria-label={`${player.name} on square ${square}`}
    >
      <span className="snl-token-face" />
    </motion.div>
  );
}
