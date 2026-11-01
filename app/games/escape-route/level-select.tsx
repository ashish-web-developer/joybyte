"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lock, Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  EMPTY_PROGRESS,
  LEVEL_DEFINITIONS,
  loadProgress,
} from "./engine/progression";
import type { LevelProgress } from "./engine/progression";

function loadStoredProgress() {
  if (typeof window === "undefined") {
    return { progress: EMPTY_PROGRESS, error: "" };
  }
  try {
    return { progress: loadProgress(window.localStorage), error: "" };
  } catch (error) {
    console.error("ESCAPE ROUTE progress could not be loaded.", error);
    return {
      progress: EMPTY_PROGRESS,
      error: "Saved progress could not be loaded in this browser.",
    };
  }
}

export default function LevelSelect() {
  const [progressState, setProgressState] = useState<{
    progress: LevelProgress;
    error: string;
  }>({ progress: EMPTY_PROGRESS, error: "" });
  const { progress, error } = progressState;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setProgressState(loadStoredProgress()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="escape-route-shell er-level-select-shell">
      <div className="er-page er-level-select-page">
        <header className="er-header">
          <Link className="er-back-link" href="/" aria-label="Back to games">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>BACK TO GAMES</span>
          </Link>
          <Link className="er-wordmark" href="/" aria-label="Escape Route home">
            <span className="er-wordmark-symbol" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>ESCAPE <b>ROUTE</b></span>
          </Link>
          <span className="er-level-select-total">
            <Star size={13} fill="currentColor" aria-hidden="true" />
            {progress.totalStars} STARS
          </span>
        </header>

        <section className="er-level-select-intro" aria-labelledby="er-level-title">
          <p className="er-eyebrow">ESCAPE ROUTE · CAMPAIGN</p>
          <h1 id="er-level-title">CHOOSE YOUR <span>ROUTE.</span></h1>
          <p>
            {progress.completedLevels.length} OF {LEVEL_DEFINITIONS.length} MISSIONS
            COMPLETE
          </p>
        </section>

        {error && (
          <p className="er-level-select-error" role="alert">
            {error}
          </p>
        )}

        <section className="er-level-select-grid" aria-label="Available levels">
          {LEVEL_DEFINITIONS.map((level) => {
            const unlocked =
              level.id <= progress.unlockedThrough;
            const completed = progress.completedLevels.includes(level.id);
            const stars = progress.highestStars[level.id] ?? 0;
            const card = (
              <>
                <span className="er-level-card-kicker">
                  LEVEL {String(level.id).padStart(2, "0")}
                  <span>{completed ? "MISSION CLEARED" : unlocked ? "AVAILABLE" : "LOCKED"}</span>
                </span>
                <strong>{level.name}</strong>
                <span className="er-level-card-description">
                  {level.id === 1
                    ? "Find the street switch and reach the studio."
                    : level.id === 2
                      ? "Collect a ticket, validate it, and find the street exit."
                      : "Restore two mountain controls, repair the bridge, and reach the summit."}
                </span>
                {level.id === 3 && (
                  <span className="er-level-card-record">HARD · MOUNTAIN PASS</span>
                )}
                <span className="er-level-card-footer">
                  <span className="er-level-card-stars" aria-label={`${stars} of 3 stars`}>
                    {Array.from({ length: 3 }, (_, index) => (
                      <Star
                        key={index}
                        size={15}
                        fill={index < stars ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  {unlocked ? (
                    <ArrowUpRight size={16} aria-hidden="true" />
                  ) : (
                    <Lock size={15} aria-hidden="true" />
                  )}
                </span>
                {progress.bestScores[level.id] !== undefined && (
                  <span className="er-level-card-record">
                    BEST SCORE {progress.bestScores[level.id].toLocaleString()}
                  </span>
                )}
              </>
            );

            return unlocked ? (
              <Link
                className="er-level-card"
                href={level.route}
                key={level.id}
              >
                {card}
              </Link>
            ) : (
              <div
                className="er-level-card is-locked"
                aria-disabled="true"
                key={level.id}
              >
                {card}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
