import { Bot, UserRound } from "lucide-react";

export default function PlayerCard({ player, active, phase }) {
  const Icon = player.icon === "computer" ? Bot : UserRound;
  const isThinking = player.icon === "computer" && phase === "rolling" && active;

  return (
    <article className={`snl-player-card ${active ? "snl-player-card-active" : ""}`}>
      <div className={`snl-player-avatar snl-avatar-${player.icon}`}>
        <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
        <span className="snl-avatar-dot" />
      </div>
      <div className="snl-player-info">
        <div className="snl-player-name-row">
          <strong>{player.name}</strong>
          {active && <span className="snl-turn-label">{player.icon === "computer" ? "CLOVER'S TURN" : "YOUR TURN"}</span>}
        </div>
        <span className="snl-player-subtitle">{isThinking ? "Picking a number..." : player.subtitle}</span>
      </div>
      <div className="snl-player-score">
        <span className="snl-score-number">{player.position}</span>
        <span className="snl-score-caption">SQUARE</span>
      </div>
    </article>
  );
}
