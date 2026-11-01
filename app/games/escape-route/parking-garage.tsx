"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
  GARAGE_BARRIER,
  GARAGE_DESTINATION,
  GARAGE_HEIGHT,
  GARAGE_ROADS,
  GARAGE_START,
  GARAGE_WIDTH,
  TERMINAL_POINT,
  TICKET_POINT,
} from "./engine/parking-garage-world";
import type { EscapeRouteController } from "./engine/game";
import type { ParkingGarageSnapshot } from "./engine/ParkingGarageScene";
import {
  EMPTY_PROGRESS,
  LEVEL_DEFINITIONS,
  getCompletionScore,
  getCompletionStars,
  isLevelUnlocked,
  loadProgress,
  recordCompletion,
  saveProgress,
} from "./engine/progression";
import type { CompletionResult, LevelProgress } from "./engine/progression";
import { NavigationMap } from "./navigation";
import type { NavigationLayout } from "./navigation";
import type { TouchControl } from "./engine/EscapeRouteScene";
import { LevelResults } from "./results";

const LEVEL_NUMBER = 2;
const INITIAL_SNAPSHOT: ParkingGarageSnapshot = {
  speed: 0,
  signedSpeed: 0,
  elapsed: 0,
  x: GARAGE_START.x,
  y: GARAGE_START.y,
  heading: GARAGE_START.angle,
  routeIndex: 0,
  collisions: 0,
  paused: false,
  won: false,
  nearSwitch: false,
  puzzleActivated: false,
  levelCompleted: false,
  ticketCollected: false,
  terminalActivated: false,
  nearTicket: false,
  nearTerminal: false,
};

const GARAGE_LAYOUT: NavigationLayout = {
  width: GARAGE_WIDTH,
  height: GARAGE_HEIGHT,
  roads: GARAGE_ROADS,
  barrier: GARAGE_BARRIER,
  destination: GARAGE_DESTINATION,
  primaryMarker: TICKET_POINT,
  secondaryMarker: TERMINAL_POINT,
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getObjective(snapshot: ParkingGarageSnapshot) {
  if (snapshot.levelCompleted) return "Underground Parking complete";
  if (!snapshot.ticketCollected) return "Find a parking ticket";
  if (!snapshot.terminalActivated) return "Pay at the terminal";
  return "Reach the street exit";
}

function getCallout(snapshot: ParkingGarageSnapshot) {
  if (snapshot.nearTicket && !snapshot.ticketCollected) return "E / SPACE · TAKE TICKET";
  if (snapshot.nearTerminal && !snapshot.terminalActivated) {
    return snapshot.ticketCollected
      ? "E / SPACE · VALIDATE TICKET"
      : "TERMINAL LOCKED · FIND A TICKET";
  }
  if (snapshot.levelCompleted) return "LEVEL 02 · GARAGE CLEARED";
  if (snapshot.terminalActivated) return "PAYMENT ACCEPTED · EXIT RAMP";
  if (snapshot.ticketCollected) return "TICKET SECURED · FIND THE TERMINAL";
  return "FOLLOW THE ONE-WAY AISLE";
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
  const [pressed, setPressed] = useState(false);
  const release = () => {
    setPressed(false);
    controllerRef.current?.setTouchControl(control, false);
  };

  return (
    <button
      className={`er-touch-button er-touch-${control}`}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-pressed={pressed}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
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

export default function ParkingGarage() {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EscapeRouteController | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [progressLoaded, setProgressLoaded] = useState(false);
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
  const unlocked = progressLoaded && isLevelUnlocked(progress, LEVEL_NUMBER);

  const handleSnapshot = useCallback((value: ParkingGarageSnapshot) => {
    if (!value.won && completionSavedRef.current) {
      completionSavedRef.current = false;
      setCompletionResult(null);
    }
    if (value.won && !completionSavedRef.current) {
      completionSavedRef.current = true;
      try {
        const completion = recordCompletion(
          progressRef.current,
          LEVEL_NUMBER,
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
            "ESCAPE ROUTE Level 02 progress could not be saved.",
            error,
          );
          setProgressState({
            progress: completion.progress,
            error: "Progress could not be saved. Check your browser storage.",
          });
        }
      } catch (error) {
        console.error(
          "ESCAPE ROUTE Level 02 completion could not be recorded.",
          error,
        );
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
    const timer = window.setTimeout(() => setProgressLoaded(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent || !unlocked || controllerRef.current) return;

    let cancelled = false;
    let controller: EscapeRouteController | null = null;
    import("./engine/game")
      .then(({ createParkingGarageGame }) => {
        if (cancelled) return;
        controller = createParkingGarageGame(parent, handleSnapshot);
        controllerRef.current = controller;
      })
      .catch((error: unknown) => {
        console.error("ESCAPE ROUTE Level 02 could not start.", error);
        if (!cancelled) {
          setLoadError("The garage could not be loaded. Refresh to try again.");
        }
      });

    return () => {
      cancelled = true;
      controller?.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [handleSnapshot, unlocked]);

  const togglePause = () => {
    controllerRef.current?.setPaused(!snapshot.paused);
  };
  const starsAwarded =
    completionResult?.stars ??
    getCompletionStars(Math.floor(snapshot.elapsed), snapshot.collisions, LEVEL_NUMBER);
  const nextLevel = LEVEL_DEFINITIONS.find(
    (level) => level.id === LEVEL_NUMBER + 1,
  );

  return (
    <main className="escape-route-shell er-garage-shell">
      <div className="er-page">
        <header className="er-header">
          <Link className="er-back-link" href="/games/escape-route/level-01" aria-label="Back to City Intersection">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>BACK TO LEVEL 01</span>
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
            <span>LEVEL 02 · LIVE</span>
          </div>
        </header>

        <section className="er-intro" aria-labelledby="er-title">
          <div>
            <p className="er-eyebrow">LEVEL 02 &nbsp;·&nbsp; UNDERGROUND PARKING</p>
            <h1 id="er-title">BELOW <span>THE CITY.</span></h1>
          </div>
          <p className="er-intro-note">
            Find a ticket. Pay at the terminal.
            <br />
            Then find your way back to daylight.
          </p>
        </section>

        <section className="er-game-layout" aria-label="Underground parking game">
          <div className="er-stage-column">
            <div className="er-stage er-garage-stage">
              <div className="er-scene-label">
                <span className="er-scene-index">02</span>
                <span>UNDERGROUND PARKING</span>
                <span className="er-scene-divider" />
                <span>LOWER DECK</span>
              </div>
              <div className="er-mobile-hud">
                <section className="er-mobile-objective" aria-label="Current objective">
                  <span className="er-mobile-level">LEVEL 02 · UNDERGROUND PARKING</span>
                  <strong>{getObjective(snapshot)}</strong>
                  <span className="er-mobile-route">{getCallout(snapshot)}</span>
                  {((snapshot.nearTicket && !snapshot.ticketCollected) ||
                    (snapshot.nearTerminal && !snapshot.terminalActivated)) && (
                    <button
                      className="er-mobile-interact"
                      type="button"
                      onClick={() => controllerRef.current?.interact()}
                    >
                      {snapshot.nearTicket && !snapshot.ticketCollected
                        ? "TAKE PARKING TICKET"
                        : snapshot.ticketCollected
                          ? "PAY AT TERMINAL"
                          : "TICKET REQUIRED"}
                    </button>
                  )}
                  {progressLoaded && progressError && !snapshot.won && (
                    <span className="er-mobile-progress-error" role="alert">
                      {progressError}
                    </span>
                  )}
                </section>
                <div className="er-mobile-right-rail">
                  <div className="er-mobile-top-actions">
                    <span className="er-mobile-timer" aria-label={`Elapsed ${formatTime(snapshot.elapsed)}`}>
                      {formatTime(snapshot.elapsed)}
                    </span>
                    <button
                      className="er-mobile-pause"
                      type="button"
                      onClick={togglePause}
                      disabled={snapshot.won || !unlocked}
                      aria-label={snapshot.paused ? "Resume game" : "Pause game"}
                    >
                      {snapshot.paused ? (
                        <Play size={16} aria-hidden="true" />
                      ) : (
                        <Pause size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <section
                    className={`er-mobile-navigation${mapExpanded ? " is-expanded" : ""}`}
                    aria-label="Garage navigation map"
                  >
                    <div className="er-mobile-map-heading">
                      <span>GARAGE ROUTE</span>
                      <button
                        type="button"
                        aria-expanded={mapExpanded}
                        aria-controls="er-mobile-garage-map"
                        aria-label={mapExpanded ? "Close expanded navigation map" : "Expand navigation map"}
                        onClick={() => setMapExpanded((expanded) => !expanded)}
                      >
                        {mapExpanded ? "CLOSE" : "EXPAND"}
                      </button>
                    </div>
                    <div id="er-mobile-garage-map">
                      <NavigationMap
                        player={{ x: snapshot.x, y: snapshot.y }}
                        heading={snapshot.heading}
                        switchActivated={snapshot.terminalActivated}
                        primaryActivated={snapshot.ticketCollected}
                        secondaryActivated={snapshot.terminalActivated}
                        layout={GARAGE_LAYOUT}
                        ariaLabel="Garage map showing your position, parking ticket, payment terminal, exit barrier, and street exit"
                      />
                    </div>
                    <span className="er-mobile-map-status">
                      {snapshot.terminalActivated
                        ? "EXIT OPEN · FOLLOW THE RAMP"
                        : snapshot.ticketCollected
                          ? "TICKET SECURED · FIND TERMINAL"
                          : "TICKET · TERMINAL · EXIT"}
                    </span>
                  </section>
                </div>
                <div className="er-mobile-telemetry" aria-label="Vehicle telemetry">
                  <div className="er-mobile-speed-reading">
                    <strong>{snapshot.speed}</strong>
                    <span className="er-mobile-speed-unit">KM/H</span>
                    <span
                      className="er-mobile-gear"
                      aria-label={snapshot.signedSpeed < 0 ? "Reverse" : "Drive"}
                    >
                      {snapshot.signedSpeed < 0 ? "R" : "D"}
                    </span>
                  </div>
                  <span className="er-mobile-vehicle-state">
                    <i />
                    {snapshot.speed > 4 ? "IN MOTION" : "PARKED"}
                  </span>
                </div>
                <div className="er-mobile-controls" aria-label="Touch driving controls">
                  <div className="er-mobile-steering">
                    <TouchButton control="left" label="Steer left" controllerRef={controllerRef}>←</TouchButton>
                    <TouchButton control="right" label="Steer right" controllerRef={controllerRef}>→</TouchButton>
                  </div>
                  <div className="er-mobile-pedals">
                    <TouchButton control="brake" label="Brake and reverse" controllerRef={controllerRef}>BRAKE</TouchButton>
                    <TouchButton control="accelerate" label="Accelerate" controllerRef={controllerRef}>DRIVE</TouchButton>
                  </div>
                </div>
              </div>
              <div className="er-engine-host" ref={hostRef} />
              {!ready && !loadError && unlocked && (
                <div className="er-loading" aria-live="polite">
                  <span className="er-loading-indicator" />
                  <span>DESCENDING TO LOWER DECK</span>
                </div>
              )}
              {loadError && (
                <div className="er-engine-error" role="alert">
                  {loadError}
                </div>
              )}
              {progressLoaded && !unlocked && (
                <div className="er-pause-overlay">
                  <div className="er-pause-card">
                    <span className="er-pause-kicker">LEVEL 02 · LOCKED</span>
                    <h2>One level at a time.</h2>
                    <p>Clear City Intersection to unlock the underground garage.</p>
                    {progressError && (
                      <p className="er-progress-error" role="alert">
                        {progressError}
                      </p>
                    )}
                    <button
                      className="er-resume-button"
                      type="button"
                      onClick={() => router.push("/games/escape-route/level-01")}
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      PLAY LEVEL 01
                    </button>
                  </div>
                </div>
              )}
              {snapshot.won && (
                <div
                  className="er-pause-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mission completed"
                >
                  <LevelResults
                    levelName="Underground Parking"
                    elapsed={snapshot.elapsed}
                    collisions={snapshot.collisions}
                    score={
                      completionResult?.score ??
                      getCompletionScore(
                        LEVEL_NUMBER,
                        Math.floor(snapshot.elapsed),
                        snapshot.collisions,
                      )
                    }
                    stars={starsAwarded}
                    previousBestScore={
                      completionResult
                        ? completionResult.previousBestScore
                        : (progress.bestScores[LEVEL_NUMBER] ?? null)
                    }
                    isNewRecord={completionResult?.isNewRecord ?? false}
                    nextLevelHref={
                      nextLevel && isLevelUnlocked(progress, nextLevel.id)
                        ? nextLevel.route
                        : undefined
                    }
                    progressError={progressError}
                    onRetry={() => controllerRef.current?.restart()}
                  />
                </div>
              )}
              {snapshot.paused && !snapshot.won && (
                <div className="er-pause-overlay">
                  <div className="er-pause-card">
                    <span className="er-pause-kicker">LEVEL 02 · PAUSED</span>
                    <h2>Take a breath.</h2>
                    <p>The garage will be right here when you’re ready.</p>
                    <button
                      className="er-resume-button"
                      type="button"
                      onClick={togglePause}
                    >
                      <Play size={15} aria-hidden="true" />
                      BACK TO THE AISLE
                    </button>
                  </div>
                </div>
              )}
              <div className="er-stage-vignette" aria-hidden="true" />
              <div className="er-stage-bottom">
                <span>
                  <i className="er-route-dot" />
                  {snapshot.terminalActivated
                    ? "EXIT BARRIER OPEN"
                    : snapshot.ticketCollected
                      ? "TICKET SECURED"
                      : "LOWER PARKING DECK"}
                </span>
                <span>
                  {snapshot.terminalActivated
                    ? "FOLLOW THE RAMP"
                    : snapshot.ticketCollected
                      ? "FIND THE PAYMENT TERMINAL"
                      : "ONE-WAY AISLE"}
                  <b>→</b> STREET EXIT
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
                <span>DRIVE · REVERSE · E INTERACT</span>
              </div>
              {((snapshot.nearTicket && !snapshot.ticketCollected) ||
                (snapshot.nearTerminal && !snapshot.terminalActivated)) && (
                <button
                  className="er-interact-button"
                  type="button"
                  onClick={() => controllerRef.current?.interact()}
                >
                  {snapshot.nearTicket && !snapshot.ticketCollected
                    ? "TAKE PARKING TICKET"
                    : snapshot.ticketCollected
                      ? "PAY AT TERMINAL"
                      : "TICKET REQUIRED"}
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
                  disabled={snapshot.won || !unlocked}
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

          <aside className="er-dashboard" aria-label="Parking garage status">
            <div className="er-dashboard-topline">
              <span>VEHICLE TELEMETRY</span>
              <span className="er-unit-status">LIVE</span>
            </div>
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
                {snapshot.signedSpeed < -2
                  ? "REVERSING"
                  : snapshot.speed > 4
                    ? "IN MOTION"
                    : "PARKED"}
              </span>
            </div>

            <div className="er-objective">
              <span className="er-section-label">LEVEL 02 · CURRENT OBJECTIVE</span>
              <div className="er-objective-heading">
                <span className="er-objective-marker" />
                <h2>{getObjective(snapshot)}</h2>
              </div>
              <p>{getCallout(snapshot)}</p>
              <div className="er-route-progress" aria-label={`Puzzle stage ${snapshot.routeIndex + 1} of 3`}>
                {[0, 1, 2].map((stage) => (
                  <i
                    key={stage}
                    className={stage <= snapshot.routeIndex ? "is-active" : ""}
                  />
                ))}
              </div>
            </div>

            <div className="er-map-section">
              <div className="er-section-heading">
                <span className="er-section-label">UNDERGROUND PARKING</span>
                <span>
                  {!ready || progress.bestTimes[LEVEL_NUMBER] === undefined
                    ? "MAP 02"
                    : `BEST ${formatTime(progress.bestTimes[LEVEL_NUMBER])}`}
                </span>
              </div>
              <NavigationMap
                player={{ x: snapshot.x, y: snapshot.y }}
                heading={snapshot.heading}
                switchActivated={snapshot.terminalActivated}
                primaryActivated={snapshot.ticketCollected}
                secondaryActivated={snapshot.terminalActivated}
                layout={GARAGE_LAYOUT}
                ariaLabel="Underground garage map showing parking aisles, your heading, ticket, payment terminal, exit barrier, and street ramp"
              />
              <div className="er-map-legend" aria-hidden="true">
                <span><i className="er-legend-player" /> YOU</span>
                <span><i className="er-legend-switch" /> TICKET</span>
                <span><i className="er-legend-terminal" /> PAY</span>
                <span><i className="er-legend-barrier" /> EXIT</span>
              </div>
            </div>

            <div className="er-mission-footer">
              <div>
                <span className="er-section-label">TIME ELAPSED</span>
                <strong>{formatTime(snapshot.elapsed)}</strong>
              </div>
              <div className="er-mission-divider" />
              <div>
                <span className="er-section-label">COLLISIONS</span>
                <strong>{snapshot.collisions}</strong>
              </div>
            </div>
          </aside>
        </section>

        <footer className="er-footer">
          <span>ESCAPE ROUTE <b>©</b> 2026</span>
          <span>CONCRETE · LOW LIGHT · CLEAR A WAY OUT</span>
          <span>PHASE 04 <ArrowUpRight size={13} aria-hidden="true" /></span>
        </footer>
      </div>
    </main>
  );
}
