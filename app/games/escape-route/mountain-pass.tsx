"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Mountain,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
  BRIDGE_BARRIER,
  BRIDGE_PANEL,
  CHECKPOINTS,
  HIDDEN_CACHE,
  MOUNTAIN_EXIT,
  MOUNTAIN_HEIGHT,
  MOUNTAIN_ROADS,
  MOUNTAIN_START,
  MOUNTAIN_WIDTH,
  POWER_SWITCH_A,
  POWER_SWITCH_B,
} from "./engine/mountain-pass-world";
import type { EscapeRouteController } from "./engine/game";
import type { MountainPassSnapshot } from "./engine/MountainPassScene";
import type { TouchControl } from "./engine/EscapeRouteScene";
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
import { LevelResults } from "./results";

const LEVEL_NUMBER = 3;
const INITIAL_SNAPSHOT: MountainPassSnapshot = {
  speed: 0,
  signedSpeed: 0,
  elapsed: 0,
  x: MOUNTAIN_START.x,
  y: MOUNTAIN_START.y,
  heading: MOUNTAIN_START.angle,
  routeIndex: 0,
  collisions: 0,
  paused: false,
  won: false,
  nearSwitch: false,
  puzzleActivated: false,
  levelCompleted: false,
  switchAActivated: false,
  switchBActivated: false,
  bridgeRepairing: false,
  bridgeRepaired: false,
  nearSwitchA: false,
  nearSwitchB: false,
  nearBridgePanel: false,
  canRepairBridge: false,
  checkpointIndex: 0,
  checkpointActivated: false,
  cacheCollected: false,
  nearCache: false,
  bonusPoints: 0,
  fallingRockWarning: false,
  hazardMessage: "",
  onSlipperyRoad: false,
};

const MOUNTAIN_LAYOUT: NavigationLayout = {
  width: MOUNTAIN_WIDTH,
  height: MOUNTAIN_HEIGHT,
  roads: MOUNTAIN_ROADS,
  barrier: BRIDGE_BARRIER,
  barrierAngle: Math.PI / 2,
  destination: MOUNTAIN_EXIT,
  primaryMarker: POWER_SWITCH_A,
  secondaryMarker: POWER_SWITCH_B,
  checkpoints: CHECKPOINTS.map((point, index) => ({
    point,
    activated: index < INITIAL_SNAPSHOT.checkpointIndex,
  })),
  collectible: { point: HIDDEN_CACHE, collected: false },
};

type MissionStep = {
  title: string;
  instruction: string;
  destinationLabel: string;
  destination: { x: number; y: number };
};

function getMissionSteps(snapshot: MountainPassSnapshot): MissionStep[] {
  return [
    {
      title: "FIND POWER SWITCH A",
      instruction: "Follow the route to the first power station.",
      destinationLabel: "POWER STATION A",
      destination: POWER_SWITCH_A,
    },
    {
      title: "FIND POWER SWITCH B",
      instruction: "Locate the second power station using the alternate mountain road.",
      destinationLabel: "POWER STATION B",
      destination: POWER_SWITCH_B,
    },
    {
      title: "RETURN TO THE BRIDGE CONTROL",
      instruction: snapshot.bridgeRepairing
        ? "The bridge is extending. Wait for the mechanism to lock in place."
        : "Both power switches are active. Return to the bridge mechanism and activate it.",
      destinationLabel: "BRIDGE CONTROL",
      destination: BRIDGE_PANEL,
    },
    {
      title: "CROSS THE BRIDGE",
      instruction: "The bridge is repaired. Follow the road to the mountain exit.",
      destinationLabel: "MOUNTAIN EXIT",
      destination: MOUNTAIN_EXIT,
    },
    {
      title: "MISSION COMPLETE",
      instruction: "The summit relay is secure.",
      destinationLabel: "SUMMIT RELAY",
      destination: MOUNTAIN_EXIT,
    },
  ];
}

function getActiveMissionIndex(snapshot: MountainPassSnapshot) {
  if (snapshot.levelCompleted) return 4;
  if (snapshot.bridgeRepaired) return 3;
  if (snapshot.switchAActivated && snapshot.switchBActivated) return 2;
  if (snapshot.switchAActivated) return 1;
  return 0;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getCallout(snapshot: MountainPassSnapshot) {
  if (snapshot.hazardMessage) return snapshot.hazardMessage;
  if (snapshot.nearSwitchA && !snapshot.switchAActivated) {
    return "E / SPACE · ACTIVATE SWITCH A";
  }
  if (snapshot.nearSwitchB && !snapshot.switchBActivated) {
    return "E / SPACE · ACTIVATE SWITCH B";
  }
  if (snapshot.nearCache && !snapshot.cacheCollected) {
    return "OPTIONAL · E / SPACE · SEARCH HIDDEN CACHE";
  }
  if (snapshot.nearBridgePanel && !snapshot.bridgeRepaired) {
    return snapshot.canRepairBridge
      ? "E / SPACE · REPAIR BRIDGE"
      : "BRIDGE CONTROL · POWER A + B REQUIRED";
  }
  if (snapshot.onSlipperyRoad) return "LOW GRIP · STEER GENTLY";
  return "DESTINATION MARKED ON MAP";
}

function getInteractionLabel(snapshot: MountainPassSnapshot) {
  if (snapshot.nearSwitchA && !snapshot.switchAActivated) return "RESTORE POWER A";
  if (snapshot.nearSwitchB && !snapshot.switchBActivated) return "RESTORE POWER B";
  if (snapshot.nearCache && !snapshot.cacheCollected) return "COLLECT OPTIONAL CACHE";
  if (snapshot.nearBridgePanel && !snapshot.bridgeRepaired) {
    return snapshot.canRepairBridge
      ? "REPAIR THE BRIDGE"
      : "BRIDGE LOCKED · RESTORE BOTH STATIONS";
  }
  return "";
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

export default function MountainPass() {
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
  }>({ progress: EMPTY_PROGRESS, error: "" });
  const [completionResult, setCompletionResult] =
    useState<CompletionResult | null>(null);
  const completionSavedRef = useRef(false);
  const progressRef = useRef(progressState.progress);
  const progress = progressState.progress;
  const progressError = progressState.error;
  const unlocked = progressLoaded && isLevelUnlocked(progress, LEVEL_NUMBER);
  const interactionLabel = getInteractionLabel(snapshot);
  const missionSteps = getMissionSteps(snapshot);
  const activeMissionIndex = getActiveMissionIndex(snapshot);
  const activeMission = missionSteps[activeMissionIndex];
  const upcomingMissionSteps = missionSteps.slice(activeMissionIndex + 1);
  const nextLevel = LEVEL_DEFINITIONS.find(
    (level) => level.id === LEVEL_NUMBER + 1,
  );

  const handleSnapshot = useCallback((value: MountainPassSnapshot) => {
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
          value.bonusPoints,
        );
        progressRef.current = completion.progress;
        setCompletionResult(completion.result);
        try {
          saveProgress(window.localStorage, completion.progress);
          setProgressState({ progress: completion.progress, error: "" });
        } catch (error) {
          console.error(
            "ESCAPE ROUTE Level 03 progress could not be saved.",
            error,
          );
          setProgressState({
            progress: completion.progress,
            error: "Progress could not be saved. Check your browser storage.",
          });
        }
      } catch (error) {
        console.error(
          "ESCAPE ROUTE Level 03 completion could not be recorded.",
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
    const timer = window.setTimeout(() => {
      try {
        const storedProgress = loadProgress(window.localStorage);
        progressRef.current = storedProgress;
        setProgressState({ progress: storedProgress, error: "" });
      } catch (error) {
        console.error("ESCAPE ROUTE progress could not be loaded.", error);
        setProgressState({
          progress: EMPTY_PROGRESS,
          error: "Saved progress could not be loaded in this browser.",
        });
      } finally {
        setProgressLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent || !unlocked || controllerRef.current) return;

    let cancelled = false;
    let controller: EscapeRouteController | null = null;
    import("./engine/game")
      .then(({ createMountainPassGame }) => {
        if (cancelled) return;
        controller = createMountainPassGame(parent, handleSnapshot);
        controllerRef.current = controller;
      })
      .catch((error: unknown) => {
        console.error("ESCAPE ROUTE Level 03 could not start.", error);
        if (!cancelled) {
          setLoadError("The mountain pass could not be loaded. Refresh to try again.");
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
    getCompletionStars(
      Math.floor(snapshot.elapsed),
      snapshot.collisions,
      LEVEL_NUMBER,
    );
  const checkpoints = MOUNTAIN_LAYOUT.checkpoints?.map((checkpoint, index) => ({
    ...checkpoint,
    activated: index < snapshot.checkpointIndex,
  }));
  const layout: NavigationLayout = {
    ...MOUNTAIN_LAYOUT,
    activeDestination: activeMission.destination,
    activeDestinationLabel: activeMission.title,
    checkpoints,
    collectible: {
      point: HIDDEN_CACHE,
      collected: snapshot.cacheCollected,
    },
  };

  return (
    <main className="escape-route-shell er-mountain-shell">
      <div className="er-page">
        <header className="er-header">
          <Link className="er-back-link" href="/games/escape-route/levels">
            <Mountain size={15} aria-hidden="true" />
            <span>LEVEL SELECT</span>
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
            <span>LEVEL 03 · LIVE</span>
          </div>
        </header>

        <section className="er-intro" aria-labelledby="er-title">
          <div>
            <p className="er-eyebrow">LEVEL 03 &nbsp;·&nbsp; MOUNTAIN PASS · HARD</p>
            <h1 id="er-title">THE LAST <span>SUMMIT.</span></h1>
          </div>
          <p className="er-intro-note">
            Follow the route to each power station.
            <br />
            Reopen the bridge to reach the summit.
          </p>
        </section>

        <section className="er-game-layout" aria-label="The Last Summit driving game">
          <div className="er-stage-column">
            <div className="er-stage er-mountain-stage">
              <div className="er-scene-label">
                <span className="er-scene-index">03</span>
                <span>MOUNTAIN PASS</span>
                <span className="er-scene-divider" />
                <span>THE LAST SUMMIT</span>
              </div>
              <div className="er-mobile-hud">
                <section className="er-mobile-objective" aria-label="Current objective">
                  <span className="er-mobile-level">LEVEL 03 · THE LAST SUMMIT</span>
                  <strong>{activeMission.title}</strong>
                  <span className="er-mobile-instruction">{activeMission.instruction}</span>
                  {upcomingMissionSteps[0] && (
                    <span className="er-mobile-up-next">
                      NEXT · {upcomingMissionSteps[0].title}
                    </span>
                  )}
                  <span className="er-mobile-route">{getCallout(snapshot)}</span>
                  <span className="er-mountain-mobile-status">
                    A {snapshot.switchAActivated ? "LIVE" : "OFF"} · B{" "}
                    {snapshot.switchBActivated ? "LIVE" : "OFF"} · BRIDGE{" "}
                    {snapshot.bridgeRepaired ? "OPEN" : snapshot.bridgeRepairing ? "MOVING" : "OUT"}
                    {" · "}CHECKPOINT {snapshot.checkpointIndex || "ENTRY"} · CACHE{" "}
                    {snapshot.cacheCollected ? `+${snapshot.bonusPoints}` : "OPTIONAL"}
                  </span>
                  {interactionLabel && (
                    <button
                      className="er-mobile-interact"
                      type="button"
                      onClick={() => controllerRef.current?.interact()}
                    >
                      {interactionLabel}
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
                    <span
                      className="er-mobile-timer"
                      aria-label={`Elapsed ${formatTime(snapshot.elapsed)}`}
                    >
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
                    aria-label="Mountain pass navigation map"
                  >
                    <div className="er-mobile-map-heading">
                      <span>SUMMIT ROUTE</span>
                      <button
                        type="button"
                        aria-expanded={mapExpanded}
                        aria-controls="er-mobile-mountain-map"
                        aria-label={mapExpanded ? "Close expanded navigation map" : "Expand navigation map"}
                        onClick={() => setMapExpanded((expanded) => !expanded)}
                      >
                        {mapExpanded ? "CLOSE" : "EXPAND"}
                      </button>
                    </div>
                    <div id="er-mobile-mountain-map">
                      <NavigationMap
                        player={{ x: snapshot.x, y: snapshot.y }}
                        heading={snapshot.heading}
                        switchActivated={snapshot.bridgeRepaired}
                        primaryActivated={snapshot.switchAActivated}
                        secondaryActivated={snapshot.switchBActivated}
                        barrierActivated={snapshot.bridgeRepaired}
                        layout={layout}
                        ariaLabel={`Mountain map showing roads and your position. Active destination: ${activeMission.title}.`}
                      />
                    </div>
                    <span className="er-mobile-map-status">GPS DESTINATION · {activeMission.title}</span>
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
                    {snapshot.onSlipperyRoad
                      ? "LOW GRIP"
                      : snapshot.speed > 4
                        ? "IN MOTION"
                        : "STOPPED"}
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
                  <span>CLIMBING INTO THE PASS</span>
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
                    <span className="er-pause-kicker">LEVEL 03 · LOCKED</span>
                    <h2>Earn the summit.</h2>
                    <p>Clear Underground Parking to unlock The Last Summit.</p>
                    {progressError && (
                      <p className="er-progress-error" role="alert">{progressError}</p>
                    )}
                    <Link className="er-resume-button" href="/games/escape-route/level-02">
                      PLAY LEVEL 02
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
              {snapshot.won && (
                <div className="er-pause-overlay" role="dialog" aria-modal="true" aria-label="Mission completed">
                  <LevelResults
                    levelName="The Last Summit"
                    elapsed={snapshot.elapsed}
                    collisions={snapshot.collisions}
                    score={
                      completionResult?.score ??
                      getCompletionScore(
                        LEVEL_NUMBER,
                        Math.floor(snapshot.elapsed),
                        snapshot.collisions,
                        snapshot.bonusPoints,
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
                    <span className="er-pause-kicker">LEVEL 03 · PAUSED</span>
                    <h2>Hold the pass.</h2>
                    <p>Your switches and saved checkpoint will be waiting.</p>
                    <button className="er-resume-button" type="button" onClick={togglePause}>
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
                  {snapshot.bridgeRepaired ? "BRIDGE REPAIRED" : "MOUNTAIN PASS · LANDSLIDE"}
                </span>
                <span>GPS TARGET <b>→</b> {activeMission.title}</span>
              </div>
            </div>
            <div className="er-game-actions">
              <div className="er-driving-help">
                <span className="er-key-cluster"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
                <span>OR ARROW KEYS</span>
                <span className="er-help-separator" />
                <span>DRIVE · BRAKE · E INTERACT</span>
              </div>
              {interactionLabel && (
                <button
                  className="er-interact-button"
                  type="button"
                  onClick={() => controllerRef.current?.interact()}
                >
                  {interactionLabel}
                </button>
              )}
              <div className="er-action-buttons">
                <button className="er-text-button" type="button" onClick={() => controllerRef.current?.restart()}>
                  <RotateCcw size={14} aria-hidden="true" />
                  RESTART
                </button>
                <button className="er-pause-button" type="button" onClick={togglePause} disabled={snapshot.won || !unlocked}>
                  {snapshot.paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
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

          <aside className="er-dashboard er-mountain-dashboard" aria-label="Mountain pass mission status">
            <div className="er-objective">
              <span className="er-section-label">LEVEL 03 · MISSION NAVIGATOR</span>
              <div className="er-objective-heading">
                <span className="er-objective-marker" />
                <h2>{activeMission.title}</h2>
              </div>
              <p className="er-objective-instruction">{activeMission.instruction}</p>
              <div className="er-objective-destination">
                <span>DESTINATION</span>
                <strong>{activeMission.destinationLabel}</strong>
              </div>
              <p className="er-objective-guidance">{getCallout(snapshot)}</p>
              <div className="er-route-progress" aria-label={`Mission objectives ${snapshot.routeIndex} of 5 complete`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <i
                    key={index}
                    className={
                      index < activeMissionIndex ||
                      (snapshot.levelCompleted && index === activeMissionIndex)
                        ? "is-active"
                        : index === activeMissionIndex
                          ? "is-current"
                          : ""
                    }
                  />
                ))}
              </div>
            </div>
            {ready && progressError && !snapshot.won && (
              <p className="er-progress-notice" role="alert">{progressError}</p>
            )}
            <div className="er-mountain-objectives" aria-label="Mission progression">
              <span className="er-section-label">MISSION ROUTE</span>
              {missionSteps.map((step, index) => {
                const completed =
                  index < activeMissionIndex ||
                  (snapshot.levelCompleted && index === activeMissionIndex);
                const isCurrent = index === activeMissionIndex && !completed;
                return (
                  <div
                    className={isCurrent ? "is-current" : ""}
                    key={step.title}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <i data-completed={completed} data-active={isCurrent}>
                      {completed ? "✓" : ""}
                    </i>
                    <span>{step.title}</span>
                    <b>
                      {completed
                        ? "DONE"
                        : isCurrent
                          ? "NOW"
                          : index === activeMissionIndex + 1
                            ? "NEXT"
                            : "LATER"}
                    </b>
                  </div>
                );
              })}
            </div>
            <div className="er-map-section">
              <div className="er-section-heading">
                <span className="er-section-label">MOUNTAIN PASS</span>
                <span>MAP 03</span>
              </div>
              <NavigationMap
                player={{ x: snapshot.x, y: snapshot.y }}
                heading={snapshot.heading}
                switchActivated={snapshot.bridgeRepaired}
                primaryActivated={snapshot.switchAActivated}
                secondaryActivated={snapshot.switchBActivated}
                barrierActivated={snapshot.bridgeRepaired}
                layout={layout}
                ariaLabel={`Mountain pass map showing roads and your position. Active destination: ${activeMission.title}.`}
              />
              <div className="er-map-legend" aria-hidden="true">
                <span><i className="er-legend-player" />YOU</span>
                <span><i className="er-legend-switch" />POWER</span>
                <span><i className="er-legend-barrier" />BRIDGE</span>
                <span><i className="er-legend-destination" />EXIT</span>
                <span><i className="er-legend-active-destination" />NEXT TARGET</span>
              </div>
            </div>
            <div className="er-mountain-objectives er-mountain-status" aria-label="Pass status">
              <span className="er-section-label">PASS STATUS</span>
              <div><i data-active={snapshot.switchAActivated} />POWER A <b>{snapshot.switchAActivated ? "LIVE" : "OFF"}</b></div>
              <div><i data-active={snapshot.switchBActivated} />POWER B <b>{snapshot.switchBActivated ? "LIVE" : "OFF"}</b></div>
              <div><i data-active={snapshot.bridgeRepaired} />BRIDGE <b>{snapshot.bridgeRepaired ? "OPEN" : snapshot.bridgeRepairing ? "EXTENDING" : "OUT"}</b></div>
              <div><i data-active={snapshot.checkpointActivated} />CHECKPOINT <b>{snapshot.checkpointIndex ? `${snapshot.checkpointIndex} SAVED` : "ENTRANCE"}</b></div>
              <div><i data-active={snapshot.cacheCollected} />HIDDEN CACHE <b>{snapshot.cacheCollected ? "+250 PTS" : "OPTIONAL"}</b></div>
            </div>
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
                  <i className={index < Math.min(snapshot.speed / 5, 22) ? "is-lit" : ""} key={index} />
                ))}
              </div>
              <span className="er-vehicle-state">
                {snapshot.onSlipperyRoad ? "LOW GRIP · STEER GENTLY" : snapshot.speed > 4 ? "IN MOTION" : "STOPPED"}
              </span>
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
          <span>WATCH THE CLIFF EDGE</span>
          <span>LEVEL 03 <ArrowUpRight size={13} aria-hidden="true" /></span>
        </footer>
      </div>
    </main>
  );
}
