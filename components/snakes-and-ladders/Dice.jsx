"use client";

import { motion } from "framer-motion";

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function Dice({ value, rolling }) {
  return (
    <motion.div
      className="snl-die-wrap"
      animate={
        rolling
          ? { rotateX: [0, 360, 720], rotateY: [0, 180, 540], rotateZ: [0, 90, 180], scale: [1, 0.9, 1.06, 1] }
          : { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 }
      }
      transition={rolling ? { duration: 0.72, ease: "easeInOut" } : { duration: 0.25 }}
      aria-label={rolling ? "Dice rolling" : `Dice shows ${value}`}
      role="img"
    >
      <span className={`snl-die snl-die-${value}`}>
        {Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            className={`snl-die-pip ${PIPS[value].includes(index) ? "snl-die-pip-visible" : ""}`}
          />
        ))}
      </span>
      <span className="snl-die-shadow" />
    </motion.div>
  );
}
