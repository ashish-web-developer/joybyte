import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Star } from "lucide-react";
import type { CompletionResult } from "./engine/progression";
import { LEVEL_SELECT_ROUTE } from "./engine/progression";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function LevelResults({
  levelName,
  elapsed,
  collisions,
  score,
  stars,
  previousBestScore,
  isNewRecord,
  nextLevelHref,
  progressError,
  onRetry,
}: {
  levelName: string;
  elapsed: number;
  collisions: number;
  score: number;
  stars: number;
  previousBestScore: CompletionResult["previousBestScore"];
  isNewRecord: boolean;
  nextLevelHref?: string;
  progressError: string;
  onRetry: () => void;
}) {
  return (
    <div className="er-results-card">
      <span className="er-pause-kicker">MISSION COMPLETED</span>
      <h2>{levelName}</h2>
      <div
        className="er-completion-stars"
        aria-label={`${stars} out of 3 stars`}
      >
        {Array.from({ length: 3 }, (_, index) => (
          <Star
            key={index}
            size={24}
            fill={index < stars ? "currentColor" : "none"}
            className={index < stars ? "is-earned" : ""}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="er-results-score">
        <span>FINAL SCORE</span>
        <strong>{score.toLocaleString()}</strong>
        {isNewRecord && <span className="er-new-record">NEW RECORD</span>}
      </div>
      <div className="er-results-stats">
        <div>
          <span>TIME</span>
          <strong>{formatTime(elapsed)}</strong>
        </div>
        <div>
          <span>COLLISIONS</span>
          <strong>{collisions}</strong>
        </div>
        <div>
          <span>PREVIOUS BEST</span>
          <strong>
            {previousBestScore === null
              ? "—"
              : previousBestScore.toLocaleString()}
          </strong>
        </div>
      </div>
      {progressError && (
        <p className="er-progress-error" role="alert">
          {progressError}
        </p>
      )}
      <div className="er-results-actions">
        <button
          className="er-completion-restart"
          type="button"
          onClick={onRetry}
        >
          <RotateCcw size={14} aria-hidden="true" />
          RETRY
        </button>
        <Link
          className="er-results-level-select"
          href={LEVEL_SELECT_ROUTE}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          LEVEL SELECT
        </Link>
        {nextLevelHref ? (
          <Link className="er-resume-button" href={nextLevelHref}>
            NEXT LEVEL
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <button
            className="er-resume-button er-next-level-disabled"
            type="button"
            disabled
          >
            NEXT LEVEL
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
