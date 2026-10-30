import { Bot, UserRound } from "lucide-react";
import { motion } from "framer-motion";

export default function PlayerCard({ player, active }) {
  const Icon = player.icon === "computer" ? Bot : UserRound;
  const isThinking = player.icon === "computer" && active;

  return (
    <article className={`snl-player-card snl-player-${player.icon} ${active ? "snl-player-card-active" : ""}`}>
      <motion.div
        className={`snl-player-avatar snl-avatar-${player.icon}`}
        animate={isThinking ? { y: [0, -4, 0], rotate: [0, -4, 4, 0] } : { y: 0, rotate: 0 }}
        transition={isThinking ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
        <span className="snl-avatar-dot" />
      </motion.div>
      <div className="snl-player-info">
        <div className="snl-player-name-row">
          <strong>{player.name}</strong>
          {active && <span className="snl-turn-label"><i />Turn</span>}
        </div>
      </div>
      <div className="snl-player-score">
        <span className="snl-score-number">{player.position}</span>
        <span className="snl-score-caption">square</span>
      </div>
    </article>
  );
}
