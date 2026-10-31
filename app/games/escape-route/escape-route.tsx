"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { ROUTE, START } from "./engine/world";
import type { EscapeRouteController } from "./engine/game";
import type { GameSnapshot, TouchControl } from "./engine/EscapeRouteScene";
import { NavigationMap } from "./navigation";
import {
  CURRENT_LEVEL,
  EMPTY_PROGRESS,
  NEXT_LEVEL,
  getCompletionStars,
  isLevelUnlocked,
  loadProgress,
  recordCompletion,
  saveProgress,
} from "./engine/progression";
import type {
  CompletionResult,
  LevelProgress,
} from "./engine/progression";

const INITIAL_SNAPSHOT: GameSnapshot = {
  speed: 0,
  elapsed: 0,
  x: START.x,
  y: START.y,
  heading: START.angle,
  routeIndex: 0,
  collisions: 0,
  paused: false,
  won: false,
  nearSwitch: false,
  puzzleActivated: false,
  levelCompleted: false,
};

function getRouteCallout(snapshot: GameSnapshot) {
  if (snapshot.levelCompleted) return "CITY INTERSECTION · CLEARED";
  if (!snapshot.puzzleActivated) {
    if (snapshot.nearSwitch) return "E / SPACE · ACTIVATE SWITCH";
    if (snapshot.routeIndex < 2) return "NORTHBOUND · CANAL STREET";
    if (snapshot.routeIndex < 4) return "EASTBOUND · OLD QUARTER";
    return "DETOUR · EAST SIDE";
  }
  if (snapshot.routeIndex < 7) return "SWITCH LIVE · RETURN NORTH";
  return "GATE OPEN · THE STUDIO AHEAD";
}

function getObjective(snapshot: GameSnapshot) {
  if (snapshot.levelCompleted) return "City Intersection complete";
  return snapshot.puzzleActivated
    ? "Reach the opened gate"
    : "Find the street switch";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function TouchButton({
  control,
  label,
  children,
  controllerRef,
}: {
  control: TouchControl;
  label: string;
  children: ReactNode;
  controllerRef: RefObject<EscapeRouteController | null>;
}) {
  const release = () => controllerRef.current?.setTouchControl(control, false);

  return (
    <button
      className={`er-touch-button er-touch-${control}`}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        controllerRef.current?.setTouchControl(control, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

export default function EscapeRoute() {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EscapeRouteController | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [progressState, setProgressState] = useState<{
    progress: LevelProgress;
    error: string;
  }>(() => {
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
  });
  const [completionResult, setCompletionResult] =
    useState<CompletionResult | null>(null);
  const completionSavedRef = useRef(false);
  const progressRef = useRef(progressState.progress);
  const progress = progressState.progress;
  const progressError = progressState.error;

  const handleSnapshot = useCallback((value: GameSnapshot) => {
    if (!value.won && completionSavedRef.current) {
      completionSavedRef.current = false;
      setCompletionResult(null);
    }
    if (value.won && !completionSavedRef.current) {
      completionSavedRef.current = true;
      try {
        const completion = recordCompletion(
          progressRef.current,
          CURRENT_LEVEL,
          Math.floor(value.elapsed),
          value.collisions,
        );
        progressRef.current = completion.progress;
        setCompletionResult(completion.result);
        try {
          saveProgress(window.localStorage, completion.progress);
          setProgressState({ progress: completion.progress, error: "" });
        } catch (error) {
          console.error(
            "ESCAPE ROUTE completion progress could not be saved.",
            error,
          );
          setProgressState({
            progress: completion.progress,
            error: "Progress could not be saved. Check your browser storage.",
          });
        }
      } catch (error) {
        console.error("ESCAPE ROUTE completion could not be recorded.", error);
        setProgressState({
          progress: progressRef.current,
          error: "This completion could not be added to saved progress.",
        });
      }
    }
    setSnapshot(value);
    setReady(true);
  }, []);

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent || controllerRef.current) return;

    let cancelled = false;
    let controller: EscapeRouteController | null = null;
    import("./engine/game")
      .then(({ createEscapeRouteGame }) => {
        if (cancelled) return;
        controller = createEscapeRouteGame(parent, handleSnapshot);
        controllerRef.current = controller;
      })
      .catch((error: unknown) => {
        console.error("ESCAPE ROUTE could not start the game engine.", error);
        if (!cancelled) {
          setLoadError("The city could not be loaded. Refresh to try again.");
        }
      });

    return () => {
      cancelled = true;
      controller?.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [handleSnapshot]);

  const togglePause = () => {
    controllerRef.current?.setPaused(!snapshot.paused);
  };
  const starsAwarded =
    completionResult?.stars ??
    getCompletionStars(Math.floor(snapshot.elapsed), snapshot.collisions);

  return (
    <main className="escape-route-shell">
      <div className="er-page">
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
          <div className="er-header-status">
            <span className="er-live-dot" />
            <span>LEVEL 01 · LIVE</span>
          </div>
        </header>

        <section className="er-intro" aria-labelledby="er-title">
          <div>
            <p className="er-eyebrow">LEVEL 01 &nbsp;·&nbsp; CITY INTERSECTION</p>
            <h1 id="er-title">A CITY <span>OF DETOURS.</span></h1>
          </div>
          <p className="er-intro-note">
            Find the street switch. Open the way to the studio.
            <br />
            Every shortcut has a catch.
          </p>
        </section>

        <section className="er-game-layout" aria-label="Driving game">
          <div className="er-stage-column">
            <div className="er-stage">
              <div className="er-scene-label">
                <span className="er-scene-index">
                  {String(CURRENT_LEVEL).padStart(2, "0")}
                </span>
                <span>CITY INTERSECTION</span>
                <span className="er-scene-divider" />
                <span>23:48</span>
              </div>
              <div className="er-engine-host" ref={hostRef} />
              {!ready && !loadError && (
                <div className="er-loading" aria-live="polite">
                  <span className="er-loading-indicator" />
                  <span>OPENING THE CITY</span>
                </div>
              )}
              {loadError && (
                <div className="er-engine-error" role="alert">
                  {loadError}
                </div>
              )}
              {snapshot.won && (
                <div className="er-pause-overlay">
                  <div className="er-pause-card er-completion-card">
                        <span className="er-pause-kicker">
                          LEVEL {String(CURRENT_LEVEL).padStart(2, "0")} · COMPLETE
                        </span>
                        <h2>City cleared.</h2>
                        <p>
                          You found the switch, opened the gate, and made it to
                          the studio. The city can keep its secrets.
                        </p>
                        <div
                          className="er-completion-stars"
                          aria-label={`${starsAwarded} out of 3 stars`}
                        >
                          {Array.from({ length: 3 }, (_, index) => (
                            <Star
                              key={index}
                              size={22}
                              fill={index < starsAwarded ? "currentColor" : "none"}
                              className={index < starsAwarded ? "is-earned" : ""}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <div className="er-completion-stats">
                          <div>
                            <span>TIME</span>
                            <strong>{formatTime(snapshot.elapsed)}</strong>
                          </div>
                          <div>
                            <span>COLLISIONS</span>
                            <strong>{snapshot.collisions}</strong>
                          </div>
                          {completionResult?.isNewBestTime && (
                            <span className="er-new-best">NEW BEST</span>
                          )}
                        </div>
                        {progressError && (
                          <p className="er-progress-error" role="alert">
                            {progressError}
                          </p>
                        )}
                        <div className="er-completion-actions">
                          <button
                            className="er-completion-restart"
                            type="button"
                            onClick={() => controllerRef.current?.restart()}
                          >
                            <RotateCcw size={14} aria-hidden="true" />
                            RESTART LEVEL
                          </button>
                          {isLevelUnlocked(progress, NEXT_LEVEL) && (
                            <button
                              className="er-resume-button"
                              type="button"
                              onClick={() =>
                                router.push("/games/escape-route/level-02")
                              }
                            >
                              NEXT LEVEL
                              <ArrowRight size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                  </div>
                </div>
              )}
              {snapshot.paused && !snapshot.won && (
                <div className="er-pause-overlay">
                  <div className="er-pause-card">
                    <span className="er-pause-kicker">LEVEL 01 · PAUSED</span>
                    <h2>Take a breath.</h2>
                    <p>The streets will be right here when you’re ready.</p>
                    <button
                      className="er-resume-button"
                      type="button"
                      onClick={togglePause}
                    >
                      <Play size={15} aria-hidden="true" />
                      BACK TO THE ROAD
                    </button>
                  </div>
                </div>
              )}
              <div className="er-stage-vignette" aria-hidden="true" />
              <div className="er-stage-bottom">
                <span>
                  <i className="er-route-dot" />
                  {snapshot.puzzleActivated ? "GATE POWERED" : "LEVEL 01 · CITY INTERSECTION"}
                </span>
                <span>
                  {snapshot.puzzleActivated ? "NORTH GATE" : "FIND STREET CONTROL"}
                  <b>→</b> THE STUDIO
                </span>
              </div>
            </div>
            <div className="er-game-actions">
              <div className="er-driving-help">
                <span className="er-key-cluster">
                  <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                </span>
                <span>OR ARROW KEYS</span>
                <span className="er-help-separator" />
                <span>DRIVE · STEER · E INTERACT</span>
              </div>
              {snapshot.nearSwitch && !snapshot.puzzleActivated && (
                <button
                  className="er-interact-button"
                  type="button"
                  onClick={() => controllerRef.current?.interact()}
                >
                  ACTIVATE SWITCH
                </button>
              )}
              <div className="er-action-buttons">
                <button
                  className="er-text-button"
                  type="button"
                  onClick={() => controllerRef.current?.restart()}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  RESTART
                </button>
                <button
                  className="er-pause-button"
                  type="button"
                  onClick={togglePause}
                  disabled={snapshot.won}
                >
                  {snapshot.paused ? (
                    <Play size={14} aria-hidden="true" />
                  ) : (
                    <Pause size={14} aria-hidden="true" />
                  )}
                  {snapshot.paused ? "RESUME" : "PAUSE"}
                </button>
              </div>
            </div>
            <div className="er-touch-controls" aria-label="Touch driving controls">
              <div className="er-touch-steering">
                <TouchButton control="left" label="Steer left" controllerRef={controllerRef}>←</TouchButton>
                <TouchButton control="right" label="Steer right" controllerRef={controllerRef}>→</TouchButton>
              </div>
              <div className="er-touch-pedals">
                <TouchButton control="brake" label="Brake and reverse" controllerRef={controllerRef}>BRAKE</TouchButton>
                <TouchButton control="accelerate" label="Accelerate" controllerRef={controllerRef}>DRIVE</TouchButton>
              </div>
            </div>
          </div>

          <aside className="er-dashboard" aria-label="Driving status">
            <div className="er-dashboard-topline">
              <span>VEHICLE TELEMETRY</span>
              <span className="er-unit-status">LIVE</span>
            </div>
            {ready && progressError && !snapshot.won && (
              <p className="er-progress-notice" role="alert">
                {progressError}
              </p>
            )}
            <div className="er-speed-panel">
              <div className="er-speed-reading">
                <strong>{snapshot.speed}</strong>
                <span>KM/H</span>
              </div>
              <div className="er-speed-meter" aria-hidden="true">
                {Array.from({ length: 22 }, (_, index) => (
                  <i
                    className={index < Math.min(snapshot.speed / 5, 22) ? "is-lit" : ""}
                    key={index}
                  />
                ))}
              </div>
              <span className="er-vehicle-state">
                {snapshot.speed > 4 ? "IN MOTION" : "PARKED"}
              </span>
            </div>

            <div className="er-objective">
              <span className="er-section-label">LEVEL 01 · CURRENT OBJECTIVE</span>
              <div className="er-objective-heading">
                <span className="er-objective-marker" />
                <h2>{getObjective(snapshot)}</h2>
              </div>
              <p>{getRouteCallout(snapshot)}</p>
              <div className="er-route-progress" aria-label={`Route checkpoint ${snapshot.routeIndex + 1} of ${ROUTE.length}`}>
                {ROUTE.map((_, index) => (
                  <i
                    key={index}
                    className={index <= snapshot.routeIndex ? "is-active" : ""}
                  />
                ))}
              </div>
            </div>

            <div className="er-map-section">
              <div className="er-section-heading">
                <span className="er-section-label">CITY INTERSECTION</span>
                <span>
                  {!ready || progress.bestTimes[CURRENT_LEVEL] === undefined
                    ? "MAP 01"
                    : `BEST ${formatTime(progress.bestTimes[CURRENT_LEVEL])}`}
                </span>
              </div>
              <NavigationMap
                player={{ x: snapshot.x, y: snapshot.y }}
                heading={snapshot.heading}
                switchActivated={snapshot.puzzleActivated}
              />
              <div className="er-map-legend" aria-hidden="true">
                <span><i className="er-legend-player" /> YOU</span>
                <span><i className="er-legend-switch" /> SWITCH</span>
                <span><i className="er-legend-barrier" /> GATE</span>
                <span><i className="er-legend-destination" /> STUDIO</span>
              </div>
            </div>

            <div className="er-mission-footer">
              <div>
                <span className="er-section-label">TIME ELAPSED</span>
                <strong>{formatTime(snapshot.elapsed)}</strong>
              </div>
              <div className="er-mission-divider" />
              <div>
                <span className="er-section-label">DISTANCE</span>
                <strong>2.4 <small>KM</small></strong>
              </div>
            </div>
          </aside>
        </section>

        <footer className="er-footer">
          <span>ESCAPE ROUTE <b>©</b> 2026</span>
          <span>KEEP YOUR EYES ON THE ROAD</span>
          <span>PHASE 01 <ArrowUpRight size={13} aria-hidden="true" /></span>
        </footer>
      </div>
    </main>
  );
}
