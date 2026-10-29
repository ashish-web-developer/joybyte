"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clockwiseTurnsToMatch,
  DIRECTIONS,
  LOOPBREAK_LEVELS,
  rotateMask,
  solutionMasks,
  type LoopbreakLevel,
} from "./levels";

type Screen = "home" | "select" | "game";
type Modal = "tutorial" | "pause" | "complete" | "limit" | null;
type HistoryEntry = { tiles: number[]; moves: number };
type Progress = { unlocked: number; bests: Record<number, number> };

const PROGRESS_KEY = "loopbreak-progress-v1";
const PROGRESS_CHANGED = "loopbreak-progress-changed";
const DEFAULT_PROGRESS = JSON.stringify({ unlocked: 1, bests: {} });
const STORAGE_ERROR = "loopbreak-storage-unavailable";
const TILE_CENTERS = [
  { bit: 1, x: 32, y: 7 },
  { bit: 2, x: 57, y: 32 },
  { bit: 4, x: 32, y: 57 },
  { bit: 8, x: 7, y: 32 },
];

function makeBoard(level: LoopbreakLevel, levelIndex: number) {
  const targets = solutionMasks(level);
  const tiles = Array<number>(25).fill(0);

  level.route.forEach((cell) => {
    const turns = 1 + ((cell * 7 + levelIndex * 11) % 3);
    let mask = targets[cell];
    for (let turn = 0; turn < turns; turn += 1) mask = rotateMask(mask);
    tiles[cell] = mask;
  });

  return tiles;
}

function rotationForMask(mask: number, target: number) {
  let rotated = target;
  for (let turns = 0; turns < 4; turns += 1) {
    if (rotated === mask) return turns;
    rotated = rotateMask(rotated);
  }
  return 0;
}

function tracePath(level: LoopbreakLevel, tiles: number[]) {
  const start = level.route[0];
  const destination = level.route[level.route.length - 1];
  const checkpoints = level.checkpointIndexes.map(
    (index) => level.route[index],
  );
  const visited = new Set<number>();
  const path: number[] = [];
  let current = start;
  let previous = -1;
  let complete = false;

  while (true) {
    if (visited.has(current) || !tiles[current]) break;
    visited.add(current);
    path.push(current);

    if (current === destination) {
      complete = checkpoints.every((cell) => visited.has(cell));
      break;
    }

    const exits = DIRECTIONS.filter(({ bit }) => tiles[current] & bit);
    const direction = exits.find(({ opposite, row, col }) => {
      const nextRow = Math.floor(current / 5) + row;
      const nextCol = (current % 5) + col;
      const next = current + row * 5 + col;
      return (
        next !== previous &&
        nextRow >= 0 &&
        nextRow < 5 &&
        nextCol >= 0 &&
        nextCol < 5 &&
        !level.blocked.includes(next) &&
        (tiles[next] & opposite) !== 0
      );
    });

    if (!direction) break;

    const next = current + direction.row * 5 + direction.col;
    previous = current;
    current = next;
  }

  return { path, complete };
}

function shortestSolutionMoves(level: LoopbreakLevel, tiles: number[]) {
  const targets = solutionMasks(level);
  return level.route.reduce(
    (total, cell) =>
      total + clockwiseTurnsToMatch(tiles[cell], targets[cell]),
    0,
  );
}

let storageUnavailable = false;

function getProgressSnapshot() {
  if (storageUnavailable) return STORAGE_ERROR;

  try {
    return window.localStorage.getItem(PROGRESS_KEY) ?? DEFAULT_PROGRESS;
  } catch (error) {
    storageUnavailable = true;
    console.error("Loopbreak could not access local storage.", error);
    return STORAGE_ERROR;
  }
}

function getServerProgressSnapshot() {
  return DEFAULT_PROGRESS;
}

function subscribeToProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PROGRESS_CHANGED, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PROGRESS_CHANGED, callback);
  };
}

function parseProgress(snapshot: string): Progress {
  if (snapshot === STORAGE_ERROR) return { unlocked: 1, bests: {} };

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!parsed || typeof parsed !== "object") {
      throw new SyntaxError("Saved Loopbreak progress is not an object.");
    }

    const saved = parsed as { unlocked?: unknown; bests?: unknown };
    const unlocked =
      typeof saved.unlocked === "number" &&
      Number.isInteger(saved.unlocked) &&
      saved.unlocked >= 1
        ? Math.min(saved.unlocked, LOOPBREAK_LEVELS.length)
        : 1;
    const bests: Record<number, number> = {};

    if (saved.bests && typeof saved.bests === "object") {
      for (const [level, moves] of Object.entries(saved.bests)) {
        const levelNumber = Number(level);
        if (
          Number.isInteger(levelNumber) &&
          levelNumber >= 1 &&
          levelNumber <= LOOPBREAK_LEVELS.length &&
          typeof moves === "number" &&
          Number.isInteger(moves) &&
          moves > 0
        ) {
          bests[levelNumber] = moves;
        }
      }
    }

    return { unlocked, bests };
  } catch (error) {
    console.error("Could not parse saved Loopbreak progress.", error);
    return { unlocked: 1, bests: {} };
  }
}

function TileArt({
  mask,
  rotation,
  active,
  start,
  finish,
  checkpoint,
}: {
  mask: number;
  rotation: number;
  active: boolean;
  start: boolean;
  finish: boolean;
  checkpoint: boolean;
}) {
  const color = active ? "#b7ff5f" : "#516575";
  return (
    <svg
      className={`lb-tile-art${active ? " is-active" : ""}`}
      style={{ transform: `rotate(${rotation * 90}deg)` }}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      {TILE_CENTERS.filter(({ bit }) => mask & bit).map(({ bit, x, y }) => (
        <line
          key={bit}
          x1="32"
          y1="32"
          x2={x}
          y2={y}
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
      ))}
      {mask !== 0 && (
        <circle cx="32" cy="32" r="5.5" fill={color} />
      )}
      {checkpoint && (
        <circle
          className="lb-checkpoint-ring"
          cx="32"
          cy="32"
          r="17"
          fill="none"
          stroke="#8f7cff"
          strokeWidth="2"
        />
      )}
      {start && (
        <circle cx="32" cy="32" r="8" fill="#6fe4d2" stroke="#09201f" strokeWidth="3" />
      )}
      {finish && (
        <circle cx="32" cy="32" r="8" fill="#ffbe67" stroke="#2b1d0c" strokeWidth="3" />
      )}
    </svg>
  );
}

function playTone(enabled: boolean, frequency = 510) {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;

  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.055, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.onended = () => void context.close();
}

export default function Loopbreak() {
  const [screen, setScreen] = useState<Screen>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const progressSnapshot = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot,
  );
  const { unlocked, bests } = parseProgress(progressSnapshot);
  const [soundOn, setSoundOn] = useState(true);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [unlimitedPractice, setUnlimitedPractice] = useState(false);
  const audioPreference = useRef(true);
  const completedLevel = useRef<number | null>(null);

  const level = LOOPBREAK_LEVELS[levelIndex];
  const solution = useMemo(() => solutionMasks(level), [level]);
  const trace = useMemo(() => tracePath(level, tiles), [level, tiles]);
  const challengeLimit = useMemo(
    () =>
      level.moveSlack === null
        ? null
        : shortestSolutionMoves(level, makeBoard(level, levelIndex)) +
          level.moveSlack,
    [level, levelIndex],
  );

  useEffect(() => {
    audioPreference.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    if (
      screen !== "game" ||
      !trace.complete ||
      completedLevel.current === levelIndex
    ) {
      return;
    }

    completedLevel.current = levelIndex;
    setModal("complete");
    playTone(audioPreference.current, 820);

    const levelNumber = levelIndex + 1;
    const nextUnlocked = Math.min(
      LOOPBREAK_LEVELS.length,
      Math.max(unlocked, levelNumber + 1),
    );
    const nextBests = { ...bests };
    if (!nextBests[levelNumber] || moves < nextBests[levelNumber]) {
      nextBests[levelNumber] = moves;
    }

    try {
      window.localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ unlocked: nextUnlocked, bests: nextBests }),
      );
      window.dispatchEvent(new Event(PROGRESS_CHANGED));
    } catch (error) {
      storageUnavailable = true;
      console.error("Loopbreak could not save your progress.", error);
      window.dispatchEvent(new Event(PROGRESS_CHANGED));
    }
  }, [bests, levelIndex, moves, screen, trace.complete, unlocked]);

  const beginLevel = useCallback((index: number) => {
    const nextLevel = LOOPBREAK_LEVELS[index];
    setLevelIndex(index);
    setTiles(makeBoard(nextLevel, index));
    setMoves(0);
    setHistory([]);
    setHintCell(null);
    setUnlimitedPractice(false);
    setModal(null);
    setScreen("game");
    completedLevel.current = null;
  }, []);

  const rotateTile = useCallback(
    (cell: number) => {
      if (modal || tiles[cell] === 0) return;
      const limit = unlimitedPractice ? null : challengeLimit;
      if (limit !== null && moves >= limit) {
        setModal("limit");
        return;
      }

      const nextTiles = [...tiles];
      nextTiles[cell] = rotateMask(nextTiles[cell]);
      setHistory((previous) => [...previous, { tiles, moves }]);
      setTiles(nextTiles);
      setMoves((previous) => previous + 1);
      setHintCell(null);
      playTone(audioPreference.current);
    },
    [challengeLimit, modal, moves, tiles, unlimitedPractice],
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setTiles(last.tiles);
    setMoves(last.moves);
    setHistory((previous) => previous.slice(0, -1));
    setHintCell(null);
    setModal(null);
  }, [history]);

  const restart = useCallback(() => {
    setTiles(makeBoard(level, levelIndex));
    setMoves(0);
    setHistory([]);
    setHintCell(null);
    setUnlimitedPractice(false);
    setModal(null);
    completedLevel.current = null;
  }, [level, levelIndex]);

  const useHint = useCallback(() => {
    if (modal) return;
    const cell = level.route.find(
      (routeCell) => tiles[routeCell] !== solution[routeCell],
    );
    if (cell === undefined) return;

    const turns = clockwiseTurnsToMatch(tiles[cell], solution[cell]);
    const limit = unlimitedPractice ? null : challengeLimit;
    if (limit !== null && moves + turns > limit) {
      setModal("limit");
      return;
    }

    const nextTiles = [...tiles];
    for (let turn = 0; turn < turns; turn += 1) {
      nextTiles[cell] = rotateMask(nextTiles[cell]);
    }
    setHistory((previous) => [...previous, { tiles, moves }]);
    setTiles(nextTiles);
    setMoves((previous) => previous + turns);
    setHintCell(cell);
    playTone(audioPreference.current, 660);
  }, [challengeLimit, level, modal, moves, solution, tiles, unlimitedPractice]);

  const startPractice = useCallback(() => {
    setUnlimitedPractice(true);
    setModal(null);
  }, []);

  const openNextLevel = useCallback(() => {
    if (levelIndex + 1 < LOOPBREAK_LEVELS.length) {
      beginLevel(levelIndex + 1);
    } else {
      setModal(null);
      setScreen("select");
    }
  }, [beginLevel, levelIndex]);

  const poweredCells = new Set(trace.path);
  const checkpointCells = new Set(
    level.checkpointIndexes.map((index) => level.route[index]),
  );
  const limit = unlimitedPractice ? null : challengeLimit;
  const completedCheckpoints = trace.path.filter((cell) =>
    checkpointCells.has(cell),
  ).length;

  return (
    <main className="loopbreak-app">
      <div className="lb-frame">
        <header className="lb-header">
          <Link className="lb-brand" href="/" aria-label="AssetKit home">
            <span className="lb-brand-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>loopbreak<span className="lb-brand-period">.</span></span>
          </Link>
          <nav className="lb-nav" aria-label="Game navigation">
            <button
              className="lb-nav-link"
              onClick={() => setModal("tutorial")}
              type="button"
            >
              How to play
            </button>
            <button
              className="lb-sound"
              onClick={() => setSoundOn((previous) => !previous)}
              type="button"
              aria-label={soundOn ? "Mute sound" : "Enable sound"}
              title={soundOn ? "Mute sound" : "Enable sound"}
            >
              {soundOn ? "◖))" : "◖×"}
            </button>
          </nav>
        </header>

        {screen === "home" && (
          <section className="lb-home">
            <div className="lb-home-copy">
              <div className="lb-kicker"><span /> A CIRCUIT-BENDING PUZZLE</div>
              <h1>Find your<br /><em>way through.</em></h1>
              <p>
                Rotate the circuit. Catch every signal. Find the one path that
                brings the whole grid to life.
              </p>
              <div className="lb-home-actions">
                <button className="lb-button lb-button-primary" onClick={() => beginLevel(0)} type="button">
                  Start playing <span aria-hidden="true">↗</span>
                </button>
                <button className="lb-button lb-button-quiet" onClick={() => setScreen("select")} type="button">
                  Choose a level
                </button>
              </div>
              <button className="lb-how-link" onClick={() => setModal("tutorial")} type="button">
                New to the grid? <span>Learn in 30 seconds →</span>
              </button>
              <div className="lb-home-meta">
                <span><i className="lb-meta-dot" /> 20 handcrafted levels</span>
                <span>Free to play · No downloads</span>
              </div>
              {progressSnapshot === STORAGE_ERROR && (
                <p className="lb-storage-note" role="status">
                  Progress could not be saved in this browser.
                </p>
              )}
            </div>
            <div className="lb-home-art" aria-hidden="true">
              <div className="lb-orbit lb-orbit-one" />
              <div className="lb-orbit lb-orbit-two" />
              <div className="lb-art-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
                  <div
                    className={`lb-art-cell ${[0, 1, 4, 5, 8].includes(cell) ? "lit" : ""}`}
                    key={cell}
                  >
                    {([0, 1, 4, 5, 8].includes(cell)) && (
                      <span className={`lb-art-wire wire-${cell}`} />
                    )}
                  </div>
                ))}
              </div>
              <span className="lb-art-caption">EVERY TURN COUNTS</span>
              <span className="lb-art-plus plus-a">+</span>
              <span className="lb-art-plus plus-b">✳</span>
            </div>
          </section>
        )}

        {screen === "select" && (
          <section className="lb-select">
            <div className="lb-section-heading">
              <button className="lb-back-link" onClick={() => setScreen("home")} type="button">
                ← Back
              </button>
              <div className="lb-kicker"><span /> THE GRID IS YOURS</div>
              <h1>Choose your <em>circuit.</em></h1>
              <p>Complete a circuit to unlock the next one.</p>
            </div>
            <div className="lb-level-grid">
              {LOOPBREAK_LEVELS.map((item, index) => {
                const levelNumber = index + 1;
                const isUnlocked = levelNumber <= unlocked;
                const isComplete = bests[levelNumber] !== undefined;
                return (
                  <button
                    aria-label={`${isUnlocked ? "Play" : "Locked"} level ${levelNumber}: ${item.name}`}
                    className={`lb-level-card${isUnlocked ? "" : " is-locked"}${isComplete ? " is-complete" : ""}`}
                    disabled={!isUnlocked}
                    key={item.name}
                    onClick={() => beginLevel(index)}
                    type="button"
                  >
                    <span className="lb-level-top">
                      <span>{String(levelNumber).padStart(2, "0")}</span>
                      <span>{isComplete ? "✓" : isUnlocked ? "↗" : "⌑"}</span>
                    </span>
                    <strong>{item.name}</strong>
                    <span className="lb-level-bottom">
                      {isComplete
                        ? `${bests[levelNumber]} moves · best`
                        : item.moveSlack
                          ? `${item.moveSlack} extra moves`
                          : "Signal route"}
                    </span>
                  </button>
                );
              })}
            </div>
            {progressSnapshot === STORAGE_ERROR && (
              <p className="lb-storage-note" role="status">
                Progress could not be saved in this browser.
              </p>
            )}
          </section>
        )}

        {screen === "game" && (
          <section className="lb-game" aria-label={`Level ${levelIndex + 1}: ${level.name}`}>
            <div className="lb-game-top">
              <button className="lb-back-link" onClick={() => setModal("pause")} type="button">
                <span aria-hidden="true">←</span> Exit puzzle
              </button>
              <button className="lb-level-picker" onClick={() => setScreen("select")} type="button">
                LEVEL {String(levelIndex + 1).padStart(2, "0")} <span>⌄</span>
              </button>
            </div>
            <div className="lb-puzzle-heading">
              <div>
                <div className="lb-kicker"><span /> {level.moveSlack ? "MOVE CHALLENGE" : "SIGNAL ROUTE"}</div>
                <h1>{level.name}</h1>
              </div>
              <div className="lb-move-counter">
                <span>MOVES</span>
                <strong>{String(moves).padStart(2, "0")}{limit !== null && <small> / {limit}</small>}</strong>
              </div>
            </div>

            <div className="lb-play-layout">
              <div className="lb-board-wrap">
                <div className="lb-board-frame">
                  <div className="lb-board" role="group" aria-label="5 by 5 energy path puzzle">
                    {Array.from({ length: 25 }, (_, cell) => {
                      const blocked = level.blocked.includes(cell);
                      const isStart = cell === level.route[0];
                      const isFinish = cell === level.route[level.route.length - 1];
                      const hasTile = tiles[cell] !== 0;
                      const active = poweredCells.has(cell);
                      const checkpoint = checkpointCells.has(cell);
                      const label = isStart
                        ? "Start tile"
                        : isFinish
                          ? "Destination tile"
                          : checkpoint
                            ? "Signal node"
                            : "Path tile";

                      if (blocked) {
                        return (
                          <div className="lb-cell lb-blocked" key={cell} aria-label="Blocked tile">
                            <span aria-hidden="true">×</span>
                          </div>
                        );
                      }

                      if (!hasTile) {
                        return <div className="lb-cell lb-empty" key={cell} aria-hidden="true" />;
                      }

                      const turns = clockwiseTurnsToMatch(tiles[cell], solution[cell]);
                      return (
                        <button
                          aria-label={`${label}${active ? ", connected" : ""}. Rotate clockwise${turns ? `, ${turns} turns to align` : ""}`}
                          aria-pressed={active}
                          className={`lb-cell lb-tile${active ? " is-powered" : ""}${checkpoint ? " is-checkpoint" : ""}${hintCell === cell ? " is-hinted" : ""}${isStart ? " is-start" : ""}${isFinish ? " is-finish" : ""}`}
                          key={cell}
                          onClick={() => rotateTile(cell)}
                          type="button"
                        >
                          <TileArt
                            active={active}
                            checkpoint={checkpoint}
                            finish={isFinish}
                            mask={solution[cell]}
                            rotation={rotationForMask(tiles[cell], solution[cell])}
                            start={isStart}
                          />
                          {isStart && <span className="lb-terminal-label">IN</span>}
                          {isFinish && <span className="lb-terminal-label">OUT</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="lb-board-legend">
                  <span><i className="lb-legend-dot lb-legend-live" /> LIVE CURRENT</span>
                  <span><i className="lb-legend-dot lb-legend-node" /> SIGNAL NODE</span>
                  <span><i className="lb-legend-cross">×</i> BLOCKED</span>
                </div>
              </div>

              <aside className="lb-controls">
                <div className="lb-objective">
                  <div className="lb-card-eyebrow">YOUR OBJECTIVE</div>
                  <div className="lb-objective-line">
                    <span className="lb-objective-icon">↗</span>
                    <div><strong>Connect the current</strong><small>From the source to the exit</small></div>
                  </div>
                  <div className="lb-objective-line">
                    <span className="lb-objective-icon node-icon">✳</span>
                    <div><strong>Collect every signal</strong><small>{completedCheckpoints} of {checkpointCells.size} nodes reached</small></div>
                  </div>
                  {limit !== null && (
                    <div className="lb-objective-line">
                      <span className="lb-objective-icon limit-icon">⌁</span>
                      <div><strong>Stay under the limit</strong><small>{Math.max(0, limit - moves)} moves remaining</small></div>
                    </div>
                  )}
                </div>
                <p className="lb-hint-copy">
                  Tap any tile to turn it clockwise. Connect matching ends to
                  carry the current forward.
                </p>
                <div className="lb-action-grid">
                  <button className="lb-tool-button" onClick={undo} disabled={!history.length} type="button">
                    <span aria-hidden="true">↶</span> Undo
                  </button>
                  <button className="lb-tool-button" onClick={restart} type="button">
                    <span aria-hidden="true">↻</span> Restart
                  </button>
                  <button className="lb-tool-button lb-hint-button" onClick={useHint} type="button">
                    <span aria-hidden="true">✦</span> Hint
                  </button>
                  <button className="lb-tool-button" onClick={() => setModal("pause")} type="button">
                    <span aria-hidden="true">Ⅱ</span> Pause
                  </button>
                </div>
                {hintCell !== null && (
                  <div className="lb-hint-tip" role="status">
                    The highlighted tile is aligned. Follow its lit path.
                  </div>
                )}
                <div className="lb-progress">
                  <span>LEVEL PROGRESS</span>
                  <span>{completedCheckpoints}/{checkpointCells.size} signals</span>
                  <div className="lb-progress-track">
                    <i style={{ width: `${(completedCheckpoints / checkpointCells.size) * 100}%` }} />
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        <footer className="lb-footer">
          <span>LOOPBREAK <i>·</i> A LITTLE PUZZLE FOR YOUR BRAIN</span>
          <Link href="/">BACK TO ASSETKIT ↗</Link>
        </footer>
      </div>

      {modal && (
        <div className="lb-modal-backdrop" role="presentation">
          <section
            aria-labelledby="lb-modal-title"
            aria-modal="true"
            className={`lb-modal lb-modal-${modal}`}
            role="dialog"
          >
            <button
              aria-label="Close dialog"
              className="lb-modal-close"
              onClick={() => setModal(null)}
              type="button"
            >
              ×
            </button>
            {modal === "tutorial" && (
              <>
                <div className="lb-modal-icon">✳</div>
                <div className="lb-kicker"><span /> QUICK BRIEFING</div>
                <h2 id="lb-modal-title">Three turns.<br /><em>One clear path.</em></h2>
                <div className="lb-tutorial-steps">
                  <div><b>01</b><span><strong>Tap to rotate</strong><small>Every tile turns clockwise. Find the connections that fit.</small></span></div>
                  <div><b>02</b><span><strong>Follow the current</strong><small>Carry energy from the mint source to the amber exit.</small></span></div>
                  <div><b>03</b><span><strong>Light every signal</strong><small>Visit the violet nodes. Blocked cells are off limits.</small></span></div>
                </div>
                <button className="lb-button lb-button-primary lb-modal-primary" onClick={() => {
                  if (screen === "home") beginLevel(0);
                  else setModal(null);
                }} type="button">
                  Got it, let’s play <span aria-hidden="true">↗</span>
                </button>
              </>
            )}
            {modal === "pause" && (
              <>
                <div className="lb-modal-icon">Ⅱ</div>
                <div className="lb-kicker"><span /> CATCH YOUR BREATH</div>
                <h2 id="lb-modal-title">Paused<span className="lb-brand-period">.</span></h2>
                <p className="lb-modal-description">Your circuit is right where you left it.</p>
                <button className="lb-button lb-button-primary lb-modal-primary" onClick={() => setModal(null)} type="button">
                  Back to the grid <span aria-hidden="true">↗</span>
                </button>
                <button className="lb-modal-text-button" onClick={() => { setModal(null); setScreen("select"); }} type="button">
                  Choose another level
                </button>
                <button className="lb-modal-text-button lb-danger-text" onClick={() => { setModal(null); setScreen("home"); }} type="button">
                  Exit to home
                </button>
              </>
            )}
            {modal === "complete" && (
              <>
                <div className="lb-celebration" aria-hidden="true">
                  <span>✦</span><span>✳</span><span>✦</span><span>✧</span><span>✴</span>
                </div>
                <div className="lb-modal-icon lb-success-icon">✓</div>
                <div className="lb-kicker"><span /> CIRCUIT COMPLETE</div>
                <h2 id="lb-modal-title">You found<br /><em>the current.</em></h2>
                <p className="lb-modal-description">
                  Every signal, perfectly connected. You solved it in <strong>{moves} moves.</strong>
                </p>
                <div className="lb-result-row">
                  <span>LEVEL {String(levelIndex + 1).padStart(2, "0")} CLEARED</span>
                  <span>{bests[levelIndex + 1] === moves ? "NEW PERSONAL BEST ✦" : "ALL SIGNALS LIT"}</span>
                </div>
                <button className="lb-button lb-button-primary lb-modal-primary" onClick={openNextLevel} type="button">
                  {levelIndex + 1 === LOOPBREAK_LEVELS.length ? "Choose a level" : "Next circuit"} <span aria-hidden="true">↗</span>
                </button>
                <button className="lb-modal-text-button" onClick={restart} type="button">
                  Play this level again
                </button>
              </>
            )}
            {modal === "limit" && (
              <>
                <div className="lb-modal-icon lb-limit-icon">⌁</div>
                <div className="lb-kicker"><span /> MOVES USED UP</div>
                <h2 id="lb-modal-title">The current<br /><em>ran out.</em></h2>
                <p className="lb-modal-description">Undo a turn, restart the circuit, or switch to practice mode.</p>
                <button className="lb-button lb-button-primary lb-modal-primary" onClick={restart} type="button">
                  Try the circuit again <span aria-hidden="true">↻</span>
                </button>
                <button className="lb-modal-text-button" onClick={undo} disabled={!history.length} type="button">
                  Undo last move
                </button>
                <button className="lb-modal-text-button" onClick={startPractice} type="button">
                  Practice without a move limit
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
