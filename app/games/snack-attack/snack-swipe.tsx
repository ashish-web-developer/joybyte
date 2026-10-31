"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PointerEvent } from "react";

type GamePhase = "ready" | "playing" | "paused" | "over";
type SnackKind = "food" | "bomb" | "rotten" | "shield" | "slow";
type GameMode = "classic" | "zen" | "rush";

interface BasketSkin {
  id: string;
  name: string;
  description: string;
  requirement: string;
  unlockScore?: number;
  unlockDaily?: boolean;
  top: string;
  bottom: string;
  rim: string;
  face: string;
}

interface DailyChallenge {
  date: string;
  id: string;
  progress: number;
  completed: boolean;
}

interface FallingItem {
  x: number;
  y: number;
  speed: number;
  radius: number;
  rotation: number;
  wobble: number;
  kind: SnackKind;
  emoji: string;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Feedback {
  id: number;
  title: string;
  detail: string;
  kind: "points" | "power" | "danger";
}

interface GameEngine {
  width: number;
  height: number;
  playerX: number;
  items: FallingItem[];
  sparkles: Sparkle[];
  spawnClock: number;
  elapsed: number;
  score: number;
  lives: number;
  combo: number;
  lastCatch: number;
  shieldCharges: number;
  slowUntil: number;
  level: number;
  snacksCaught: number;
  bestCombo: number;
  feedbackUntil: number;
  mode: GameMode;
  skinId: string;
}

const SNACKS = ["🍔", "🍕", "🍩", "🍟", "🍪", "🌮", "🧁"];
const BEST_SCORE_KEY = "snack-swipe-best";
const DAILY_CHALLENGE_KEY = "snack-swipe-daily";
const SELECTED_MODE_KEY = "snack-swipe-mode";
const SELECTED_SKIN_KEY = "snack-swipe-skin";
const UNLOCKED_SKINS_KEY = "snack-swipe-unlocked-skins";
const DAILY_REWARD_SKIN_ID = "gold";
const GAME_MODES: {
  id: GameMode;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "classic",
    name: "Classic",
    description: "3 lives · go for your high score",
    icon: "❤️",
  },
  {
    id: "zen",
    name: "Zen",
    description: "No lives to lose · practice freely",
    icon: "🌿",
  },
  {
    id: "rush",
    name: "60-second rush",
    description: "Beat the clock · 3 lives",
    icon: "⏱️",
  },
];
const BASKET_SKINS: BasketSkin[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original snack catcher",
    requirement: "Always unlocked",
    top: "#fb895c",
    bottom: "#e65b47",
    rim: "#ffb27b",
    face: "#7a3d3c",
  },
  {
    id: "mint",
    name: "Mint chip",
    description: "A cool new look",
    requirement: "Reach 100 points",
    unlockScore: 100,
    top: "#65c7ad",
    bottom: "#31977f",
    rim: "#9ce5c8",
    face: "#245e52",
  },
  {
    id: "berry",
    name: "Berry swirl",
    description: "A sweet score reward",
    requirement: "Reach 400 points",
    unlockScore: 400,
    top: "#bd83dc",
    bottom: "#8052b6",
    rim: "#ddb4f2",
    face: "#54396e",
  },
  {
    id: DAILY_REWARD_SKIN_ID,
    name: "Golden bite",
    description: "A shiny daily challenge reward",
    requirement: "Complete a daily challenge",
    unlockDaily: true,
    top: "#f6c552",
    bottom: "#d48b28",
    rim: "#ffe59a",
    face: "#795124",
  },
];
const DAILY_CHALLENGES = [
  { id: "snacks", title: "Snack stacker", detail: "Catch 20 tasty snacks", target: 20, unit: "snacks" },
  { id: "score", title: "Point collector", detail: "Earn 250 points in a round", target: 250, unit: "points" },
  { id: "combo", title: "Combo chef", detail: "Build a 6× snack combo", target: 6, unit: "combo" },
] as const;
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyChallenge(date: string): DailyChallenge {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const definition =
    DAILY_CHALLENGES[((dayNumber % DAILY_CHALLENGES.length) + DAILY_CHALLENGES.length) % DAILY_CHALLENGES.length];
  return { date, id: definition.id, progress: 0, completed: false };
}

function getDailyDefinition(id: string) {
  return DAILY_CHALLENGES.find((challenge) => challenge.id === id) ?? DAILY_CHALLENGES[0];
}

function isGameMode(value: string | null): value is GameMode {
  return GAME_MODES.some((mode) => mode.id === value);
}

function isDailyChallenge(value: unknown, date: string): value is DailyChallenge {
  if (typeof value !== "object" || value === null) return false;
  const challenge = value as Partial<DailyChallenge>;
  return (
    challenge.date === date &&
    typeof challenge.id === "string" &&
    DAILY_CHALLENGES.some((definition) => definition.id === challenge.id) &&
    typeof challenge.progress === "number" &&
    Number.isFinite(challenge.progress) &&
    challenge.progress >= 0 &&
    typeof challenge.completed === "boolean"
  );
}
const TUTORIAL_STEPS = [
  {
    icon: "🧺",
    label: "01 · MOVE",
    title: "Your basket follows you",
    text: "Move your mouse or drag a finger across the playfield. On a keyboard? Hold ← / → or A / D.",
    tip: "The basket stays near the bottom of the screen.",
  },
  {
    icon: "🍕",
    label: "02 · CATCH",
    title: "Catch snacks for points",
    text: "Catch burgers, pizza, donuts, fries, cookies, tacos, and cupcakes for 10 points each.",
    tip: "Miss a snack? No life lost—but your combo resets.",
  },
  {
    icon: "💣",
    label: "03 · DODGE",
    title: "Let the yucky stuff fall",
    text: "Avoid catching bombs 💣 and rotten snacks 🤢. In Classic and Rush, catching one costs a life unless a shield blocks it; Zen is a no-lives practice mode.",
    tip: "Classic and Rush start with 3 lives. Let hazards pass safely.",
  },
  {
    icon: "🛡️",
    label: "04 · POWER-UPS",
    title: "Catch a boost when it drops",
    text: "A shield 🛡️ blocks one bomb or rotten snack. A clock ⏱️ slows falling items for 5 seconds.",
    tip: "Your ready shields and active slow-mo are shown above the playfield.",
  },
  {
    icon: "🔥",
    label: "05 · COMBOS",
    title: "Keep catching to rack it up",
    text: "Catch another snack within 1.45 seconds to continue your combo. Each consecutive catch adds 2 bonus points, up to 20.",
    tip: "Every 14 seconds, the snack heat rises and items fall faster.",
  },
];

function createGame(mode: GameMode = "classic", skinId = "classic"): GameEngine {
  return {
    width: 0,
    height: 0,
    playerX: 0,
    items: [],
    sparkles: [],
    spawnClock: 0,
    elapsed: 0,
    score: 0,
    lives: 3,
    combo: 0,
    lastCatch: 0,
    shieldCharges: 0,
    slowUntil: 0,
    level: 1,
    snacksCaught: 0,
    bestCombo: 0,
    feedbackUntil: 0,
    mode,
    skinId,
  };
}

function addSparkles(game: GameEngine, x: number, y: number, color: string) {
  for (let index = 0; index < 9; index += 1) {
    const angle = (Math.PI * 2 * index) / 9;
    const speed = 45 + Math.random() * 100;
    game.sparkles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.65 + Math.random() * 0.3,
      color,
    });
  }
}

function getGameScale(width: number) {
  return Math.min(1, Math.max(0.65, width / 480));
}

function getBasketHalfWidth(game: GameEngine) {
  return 57 * getGameScale(game.width);
}

function spawnItem(game: GameEngine) {
  const scale = getGameScale(game.width);
  const radius = 21 * scale;
  const roll = Math.random();
  let kind: SnackKind = "food";
  let emoji = SNACKS[Math.floor(Math.random() * SNACKS.length)];

  if (roll < 0.1) {
    kind = "bomb";
    emoji = "💣";
  } else if (roll < 0.2) {
    kind = "rotten";
    emoji = "🤢";
  } else if (roll < 0.27) {
    kind = "shield";
    emoji = "🛡️";
  } else if (roll < 0.34) {
    kind = "slow";
    emoji = "⏱️";
  }

  game.items.push({
    x: radius + 5 + Math.random() * Math.max(1, game.width - 2 * (radius + 5)),
    y: -35 * scale,
    speed: 145 + game.elapsed * 2.2 + Math.random() * 55,
    radius,
    rotation: (Math.random() - 0.5) * 0.25,
    wobble: Math.random() * Math.PI * 2,
    kind,
    emoji,
  });
}

function drawGame(context: CanvasRenderingContext2D, game: GameEngine, time: number) {
  const { width, height } = game;
  if (!width || !height) return;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#ffe8a6");
  background.addColorStop(1, "#ffc4a0");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.22;
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const x = 26 + column * (width / 12);
      const y = 24 + row * (height / 7);
      context.beginPath();
      context.arc(x, y, 2 + ((row + column) % 3), 0, Math.PI * 2);
      context.fillStyle = (row + column) % 2 ? "#ffffff" : "#f08c62";
      context.fill();
    }
  }
  context.restore();

  const scale = getGameScale(width);
  for (const item of game.items) {
    const bob = Math.sin(time / 180 + item.wobble) * 3 * scale;
    context.save();
    context.translate(item.x, item.y + bob);
    context.rotate(Math.sin(time / 350 + item.wobble) * item.rotation);
    context.shadowColor = "rgba(98, 53, 38, 0.2)";
    context.shadowBlur = 12 * scale;
    context.shadowOffsetY = 5 * scale;
    context.beginPath();
    context.arc(0, 0, item.radius + 3 * scale, 0, Math.PI * 2);
    context.fillStyle =
      item.kind === "bomb"
        ? "#57465f"
        : item.kind === "rotten"
          ? "#92a96e"
          : item.kind === "shield" || item.kind === "slow"
            ? "#fff9e9"
            : "#fff8ec";
    context.fill();
    context.shadowColor = "transparent";
    context.font = `${item.radius * 1.65}px system-ui, "Apple Color Emoji", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(item.emoji, 0, 1);
    context.restore();
  }

  for (let index = game.sparkles.length - 1; index >= 0; index -= 1) {
    const sparkle = game.sparkles[index];
    context.save();
    context.globalAlpha = Math.max(0, sparkle.life);
    context.fillStyle = sparkle.color;
    context.beginPath();
    context.arc(sparkle.x, sparkle.y, 3.5 * sparkle.life, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const catcherY = height - 48 * scale;
  const basketSkin =
    BASKET_SKINS.find((skin) => skin.id === game.skinId) ?? BASKET_SKINS[0];
  context.save();
  context.translate(game.playerX, catcherY);
  context.scale(scale, scale);
  if (game.shieldCharges > 0) {
    context.beginPath();
    context.ellipse(0, 3, 72, 33, 0, 0, Math.PI * 2);
    context.strokeStyle = "rgba(92, 178, 221, 0.68)";
    context.lineWidth = 3;
    context.shadowColor = "#8ae3f4";
    context.shadowBlur = 16;
    context.stroke();
    context.shadowBlur = 0;
  }
  context.beginPath();
  context.ellipse(0, 26, 59, 9, 0, 0, Math.PI * 2);
  context.fillStyle = "rgba(105, 62, 49, 0.2)";
  context.fill();

  const bowl = context.createLinearGradient(0, -13, 0, 29);
  bowl.addColorStop(0, basketSkin.top);
  bowl.addColorStop(1, basketSkin.bottom);
  context.beginPath();
  context.moveTo(-57, -5);
  context.lineTo(-45, 18);
  context.quadraticCurveTo(0, 42, 45, 18);
  context.lineTo(57, -5);
  context.closePath();
  context.fillStyle = bowl;
  context.strokeStyle = basketSkin.bottom;
  context.lineWidth = 3;
  context.fill();
  context.stroke();
  context.beginPath();
  context.ellipse(0, -5, 57, 12, 0, Math.PI, Math.PI * 2);
  context.fillStyle = basketSkin.rim;
  context.fill();
  context.strokeStyle = basketSkin.bottom;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = basketSkin.face;
  context.beginPath();
  context.arc(-11, 12, 2.5, 0, Math.PI * 2);
  context.arc(11, 12, 2.5, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(0, 14, 7, 0.15, Math.PI - 0.15);
  context.strokeStyle = basketSkin.face;
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

export default function SnackSwipe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine>(createGame());
  const phaseRef = useRef<GamePhase>("ready");
  const pauseStartedRef = useRef<number | null>(null);
  const bestRef = useRef(0);
  const dailyRef = useRef<DailyChallenge | null>(null);
  const unlockedSkinsRef = useRef<string[]>(["classic"]);
  const feedbackIdRef = useRef(0);
  const feedbackRef = useRef<Feedback | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const audioRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(true);

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");
  const [setupOpen, setSetupOpen] = useState(false);
  const [roundMode, setRoundMode] = useState<GameMode>("classic");
  const [selectedSkin, setSelectedSkin] = useState("classic");
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(["classic"]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [score, setScore] = useState(0);
  const [roundStats, setRoundStats] = useState({ snacksCaught: 0, bestCombo: 0 });
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [heat, setHeat] = useState(1);
  const [shieldCharges, setShieldCharges] = useState(0);
  const [slowMotion, setSlowMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const changePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const showFeedback = useCallback(
    (title: string, detail: string, kind: Feedback["kind"]) => {
      feedbackIdRef.current += 1;
      const nextFeedback = { id: feedbackIdRef.current, title, detail, kind };
      feedbackRef.current = nextFeedback;
      gameRef.current.feedbackUntil = gameRef.current.elapsed + 1.8;
      setFeedback(nextFeedback);
    },
    [],
  );

  const unlockSkin = useCallback((skinId: string) => {
    if (unlockedSkinsRef.current.includes(skinId)) return;
    const nextUnlocked = [...unlockedSkinsRef.current, skinId];
    unlockedSkinsRef.current = nextUnlocked;
    setUnlockedSkins(nextUnlocked);
    const skin = BASKET_SKINS.find((candidate) => candidate.id === skinId);
    showFeedback(
      "BASKET UNLOCKED!",
      `${skin?.name ?? "A new basket"} is ready to use after this round.`,
      "power",
    );
    try {
      window.localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(nextUnlocked));
    } catch (error) {
      console.error("Could not save unlocked Snack Swipe baskets.", error);
      setStorageWarning(true);
    }
  }, [showFeedback]);

  const refreshDailyChallenge = useCallback(() => {
    const today = getTodayKey();
    if (dailyRef.current?.date === today) return;
    const nextDaily = getDailyChallenge(today);
    dailyRef.current = nextDaily;
    setDailyChallenge(nextDaily);
    try {
      window.localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(nextDaily));
    } catch (error) {
      console.error("Could not refresh today's challenge.", error);
      setStorageWarning(true);
    }
  }, []);

  const updateDailyProgress = useCallback((game: GameEngine) => {
    const today = getTodayKey();
    const current =
      dailyRef.current?.date === today ? dailyRef.current : getDailyChallenge(today);
    const challenge = getDailyDefinition(current.id);
    const observed =
      current.id === "snacks"
        ? game.snacksCaught
        : current.id === "score"
          ? game.score
          : game.bestCombo;
    const progress = Math.max(current.progress, observed);
    if (progress === current.progress && dailyRef.current?.date === today) return;

    const next: DailyChallenge = {
      ...current,
      progress: Math.min(progress, challenge.target),
      completed: current.completed || progress >= challenge.target,
    };
    dailyRef.current = next;
    setDailyChallenge(next);
    try {
      window.localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Could not save daily challenge progress.", error);
      setStorageWarning(true);
    }
    if (next.completed && !current.completed) unlockSkin(DAILY_REWARD_SKIN_ID);
  }, [unlockSkin]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    keysRef.current.left = false;
    keysRef.current.right = false;
    pauseStartedRef.current = performance.now();
    changePhase("paused");
  }, [changePhase]);

  const resumeGame = useCallback(() => {
    const pausedAt = pauseStartedRef.current;
    if (
      phaseRef.current !== "paused" ||
      document.visibilityState === "hidden" ||
      pausedAt === null
    ) {
      return;
    }

    const pauseDuration = performance.now() - pausedAt;
    if (gameRef.current.slowUntil !== 0) {
      gameRef.current.slowUntil += pauseDuration;
    }
    pauseStartedRef.current = null;
    keysRef.current.left = false;
    keysRef.current.right = false;
    changePhase("playing");
  }, [changePhase]);

  const playTone = useCallback((frequency: number, duration = 0.11) => {
    if (!soundEnabledRef.current) return;

    const audio = audioRef.current ?? new AudioContext();
    audioRef.current = audio;
    if (audio.state === "suspended") {
      void audio.resume().catch((error: unknown) => {
        console.error("Could not resume Snack Swipe audio.", error);
      });
    }

    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    volume.gain.setValueAtTime(0.0001, audio.currentTime);
    volume.gain.linearRampToValueAtTime(0.12, audio.currentTime + 0.012);
    volume.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + duration,
    );
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }, []);

  useEffect(() => {
    let storedBest: string | null = null;
    let failedToRead = false;
    try {
      storedBest = window.localStorage.getItem(BEST_SCORE_KEY);
    } catch (error) {
      console.error("Could not load the Snack Swipe high score.", error);
      failedToRead = true;
    }

    const frame = window.requestAnimationFrame(() => {
      if (failedToRead) {
        setStorageWarning(true);
        return;
      }
      if (storedBest === null) return;
      const parsedBest = Number(storedBest);
      if (Number.isFinite(parsedBest) && parsedBest >= 0) {
        bestRef.current = parsedBest;
        setBest(parsedBest);
      } else {
        console.error("The saved Snack Swipe high score is invalid.");
        setStorageWarning(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const today = getTodayKey();
    let restoredDaily: DailyChallenge | null = null;
    let restoredUnlocked: string[] = ["classic"];
    let restoredMode: GameMode | null = null;
    let restoredSkin: string | null = null;
    let storageFailed = false;

    try {
      const savedDaily = window.localStorage.getItem(DAILY_CHALLENGE_KEY);
      if (savedDaily) {
        const parsed: unknown = JSON.parse(savedDaily);
        if (isDailyChallenge(parsed, today)) {
          const definition = getDailyDefinition(parsed.id);
          restoredDaily = {
            ...parsed,
            progress: Math.min(parsed.progress, definition.target),
            completed: parsed.completed || parsed.progress >= definition.target,
          };
        }
      }

      const savedUnlocked = window.localStorage.getItem(UNLOCKED_SKINS_KEY);
      if (savedUnlocked) {
        const parsed: unknown = JSON.parse(savedUnlocked);
        if (Array.isArray(parsed)) {
          restoredUnlocked = [
            "classic",
            ...parsed.filter(
              (skinId): skinId is string =>
                typeof skinId === "string" &&
                BASKET_SKINS.some((skin) => skin.id === skinId),
            ),
          ];
        }
      }

      const savedBest = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
      if (Number.isFinite(savedBest)) {
        for (const skin of BASKET_SKINS) {
          if (skin.unlockScore !== undefined && savedBest >= skin.unlockScore) {
            restoredUnlocked.push(skin.id);
          }
        }
      }

      const storedMode = window.localStorage.getItem(SELECTED_MODE_KEY);
      if (isGameMode(storedMode)) restoredMode = storedMode;

      const savedSkin = window.localStorage.getItem(SELECTED_SKIN_KEY);
      if (savedSkin && restoredUnlocked.includes(savedSkin)) {
        restoredSkin = savedSkin;
      }
    } catch (error) {
      console.error("Could not restore Snack Swipe preferences.", error);
      storageFailed = true;
    }

    const nextDaily = restoredDaily ?? getDailyChallenge(today);
    if (!restoredDaily) {
      try {
        window.localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(nextDaily));
      } catch (error) {
        console.error("Could not initialize today's challenge.", error);
        storageFailed = true;
      }
    }
    if (nextDaily.completed && !restoredUnlocked.includes(DAILY_REWARD_SKIN_ID)) {
      restoredUnlocked.push(DAILY_REWARD_SKIN_ID);
      try {
        window.localStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(restoredUnlocked));
      } catch (error) {
        console.error("Could not restore the daily reward basket.", error);
        storageFailed = true;
      }
    }
    if (restoredUnlocked.length > 1) {
      try {
        window.localStorage.setItem(
          UNLOCKED_SKINS_KEY,
          JSON.stringify([...new Set(restoredUnlocked)]),
        );
      } catch (error) {
        console.error("Could not save score-unlocked baskets.", error);
        storageFailed = true;
      }
    }

    dailyRef.current = nextDaily;
    unlockedSkinsRef.current = [...new Set(restoredUnlocked)];
    const frame = window.requestAnimationFrame(() => {
      if (restoredMode) setSelectedMode(restoredMode);
      if (restoredSkin) setSelectedSkin(restoredSkin);
      setDailyChallenge(nextDaily);
      setUnlockedSkins(unlockedSkinsRef.current);
      if (storageFailed) setStorageWarning(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!tutorialOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTutorialOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [tutorialOpen]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      refreshDailyChallenge();
      if (document.visibilityState === "hidden") pauseGame();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const dailyRefresh = window.setInterval(refreshDailyChallenge, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(dailyRefresh);
    };
  }, [pauseGame, refreshDailyChallenge]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      audioRef.current = null;
      if (audio && audio.state !== "closed") {
        void audio.close().catch((error: unknown) => {
          console.error("Could not close Snack Swipe audio.", error);
        });
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      console.error("Could not initialize the Snack Swipe game canvas.");
      return;
    }

    const resize = () => {
      const game = gameRef.current;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const previousWidth = game.width;
      const previousScale = getGameScale(previousWidth);
      game.width = bounds.width;
      game.height = bounds.height;
      const scale = getGameScale(bounds.width);
      if (previousWidth > 0 && previousWidth !== bounds.width) {
        const widthRatio = bounds.width / previousWidth;
        const objectScaleRatio = scale / previousScale;
        game.items.forEach((item) => {
          item.x *= widthRatio;
          item.radius *= objectScaleRatio;
        });
        game.sparkles.forEach((sparkle) => {
          sparkle.x *= widthRatio;
        });
        game.playerX *= widthRatio;
      }
      const basketHalfWidth = getBasketHalfWidth(game);
      game.playerX = Math.min(
        Math.max(game.playerX || bounds.width / 2, basketHalfWidth),
        Math.max(basketHalfWidth, bounds.width - basketHalfWidth),
      );
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frame = 0;
    let lastFrame = 0;
    let displayedSeconds = -1;
    const animate = (time: number) => {
      const game = gameRef.current;
      const delta = Math.min((time - (lastFrame || time)) / 1000, 0.04);
      lastFrame = time;

      if (phaseRef.current === "playing") {
        game.elapsed += delta;
        if (game.mode === "rush") game.elapsed = Math.min(game.elapsed, 60);
        const nextSeconds = Math.floor(game.elapsed);
        if (nextSeconds !== displayedSeconds) {
          displayedSeconds = nextSeconds;
          setSeconds(nextSeconds);
        }
        if (
          feedbackRef.current !== null &&
          game.elapsed >= game.feedbackUntil
        ) {
          feedbackRef.current = null;
          setFeedback(null);
        }
        const nextLevel = 1 + Math.floor(game.elapsed / 14);
        if (nextLevel !== game.level) {
          game.level = nextLevel;
          setHeat(nextLevel);
        }

        const scale = getGameScale(game.width);
        const basketHalfWidth = getBasketHalfWidth(game);
        const catcherY = game.height - 48 * scale;
        if (keysRef.current.left) game.playerX -= 370 * scale * delta;
        if (keysRef.current.right) game.playerX += 370 * scale * delta;
        game.playerX = Math.min(
          Math.max(game.playerX, basketHalfWidth),
          Math.max(basketHalfWidth, game.width - basketHalfWidth),
        );

        game.spawnClock += delta * 1000;
        const spawnDelay = Math.max(330, 890 - game.elapsed * 8);
        while (game.spawnClock >= spawnDelay) {
          game.spawnClock -= spawnDelay;
          spawnItem(game);
        }

        const slowFactor = time < game.slowUntil ? 0.48 : 1;
        if (time >= game.slowUntil && game.slowUntil !== 0) {
          game.slowUntil = 0;
          setSlowMotion(false);
        }

        for (let index = game.items.length - 1; index >= 0; index -= 1) {
          const item = game.items[index];
          const previousY = item.y;
          item.y += item.speed * delta * slowFactor;

          const reachedCatcher =
            previousY + item.radius < catcherY - 5 * scale &&
            item.y + item.radius >= catcherY - 5 * scale;
          if (reachedCatcher) {
            const caught =
              Math.abs(item.x - game.playerX) < basketHalfWidth + item.radius;
            if (caught) {
              game.items.splice(index, 1);

              if (item.kind === "food") {
                game.combo =
                  time - game.lastCatch < 1450 ? game.combo + 1 : 1;
                game.lastCatch = time;
                game.snacksCaught += 1;
                game.bestCombo = Math.max(game.bestCombo, game.combo);
                const points = 10 + Math.min(game.combo - 1, 10) * 2;
                game.score += points;
                setScore(game.score);
                setCombo(game.combo);
                updateDailyProgress(game);
                showFeedback(
                  `+${points} POINTS`,
                  game.combo > 1
                    ? `Combo ×${game.combo} · +${points - 10} bonus`
                    : "Snack caught · +10 points",
                  "points",
                );
                addSparkles(game, item.x, catcherY, "#fff8e6");
                playTone(Math.min(880, 480 + game.combo * 24));

                if (game.score > bestRef.current) {
                  setNewRecord(true);
                  bestRef.current = game.score;
                  setBest(game.score);
                  for (const skin of BASKET_SKINS) {
                    if (
                      skin.unlockScore !== undefined &&
                      game.score >= skin.unlockScore
                    ) {
                      unlockSkin(skin.id);
                    }
                  }
                  try {
                    window.localStorage.setItem(
                      BEST_SCORE_KEY,
                      String(game.score),
                    );
                  } catch (error) {
                    console.error(
                      "Could not save the Snack Swipe high score.",
                      error,
                    );
                    setStorageWarning(true);
                  }
                }
              } else if (item.kind === "shield") {
                game.shieldCharges += 1;
                setShieldCharges(game.shieldCharges);
                showFeedback(
                  "SHIELD READY!",
                  `Blocks your next bad bite · ${game.shieldCharges} ready`,
                  "power",
                );
                addSparkles(game, item.x, catcherY, "#84d9ed");
                playTone(680, 0.18);
              } else if (item.kind === "slow") {
                game.slowUntil = time + 5000;
                setSlowMotion(true);
                showFeedback(
                  "SLOW-MO ACTIVATED!",
                  "Falling items slow down for 5 seconds.",
                  "power",
                );
                addSparkles(game, item.x, catcherY, "#b49aff");
                playTone(610, 0.2);
              } else {
                addSparkles(
                  game,
                  item.x,
                  catcherY,
                  item.kind === "bomb" ? "#ff8c70" : "#a5ba79",
                );
                if (game.shieldCharges > 0) {
                  game.shieldCharges -= 1;
                  setShieldCharges(game.shieldCharges);
                  showFeedback(
                    "SHIELD BLOCKED IT!",
                    `One charge used · ${game.shieldCharges} left`,
                    "power",
                  );
                  playTone(390, 0.18);
                } else if (game.mode === "zen") {
                  showFeedback(
                    "ZEN MODE",
                    "No lives to lose · keep catching snacks!",
                    "power",
                  );
                  playTone(280, 0.16);
                } else {
                  game.lives -= 1;
                  setLives(game.lives);
                  showFeedback(
                    "OUCH! −1 LIFE",
                    `${game.lives} ${game.lives === 1 ? "life" : "lives"} left · dodge 💣 and 🤢`,
                    "danger",
                  );
                  playTone(150, 0.24);
                }
              }
            } else if (item.kind === "food") {
              game.items.splice(index, 1);
              game.combo = 0;
              setCombo(0);
            }

            if (game.mode !== "zen" && game.lives <= 0) {
              setRoundStats({
                snacksCaught: game.snacksCaught,
                bestCombo: game.bestCombo,
              });
              changePhase("over");
              break;
            }
          } else if (item.y - item.radius > game.height) {
            game.items.splice(index, 1);
          }
        }

        for (let index = game.sparkles.length - 1; index >= 0; index -= 1) {
          const sparkle = game.sparkles[index];
          sparkle.x += sparkle.vx * delta;
          sparkle.y += sparkle.vy * delta;
          sparkle.vy += 120 * delta;
          sparkle.life -= delta * 1.5;
          if (sparkle.life <= 0) game.sparkles.splice(index, 1);
        }

        if (game.combo > 0 && time - game.lastCatch > 1450) {
          game.combo = 0;
          setCombo(0);
        }

        if (game.mode === "rush" && game.elapsed >= 60) {
          setRoundStats({
            snacksCaught: game.snacksCaught,
            bestCombo: game.bestCombo,
          });
          changePhase("over");
        }
      }

      if (phaseRef.current !== "paused") drawGame(context, game, time);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [changePhase, playTone, showFeedback, unlockSkin, updateDailyProgress]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (phaseRef.current === "playing") pauseGame();
        else if (phaseRef.current === "paused") resumeGame();
        return;
      }
      if (phaseRef.current !== "playing") return;
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keysRef.current.left = true;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keysRef.current.left = false;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = false;
      }
    };
    const onBlur = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [pauseGame, resumeGame]);

  const startGame = (
    mode: GameMode = selectedMode,
    skinId: string = selectedSkin,
  ) => {
    if (phaseRef.current === "playing") return;
    const previous = gameRef.current;
    gameRef.current = {
      ...createGame(mode, skinId),
      width: previous.width,
      height: previous.height,
      playerX: previous.width / 2,
    };
    setRoundMode(mode);
    setScore(0);
    setRoundStats({ snacksCaught: 0, bestCombo: 0 });
    setLives(3);
    setCombo(0);
    setHeat(1);
    setShieldCharges(0);
    setSlowMotion(false);
    setSeconds(0);
    setFeedback(null);
    feedbackRef.current = null;
    setNewRecord(false);
    setTutorialOpen(false);
    setTutorialStep(0);
    setSetupOpen(false);
    keysRef.current.left = false;
    keysRef.current.right = false;
    pauseStartedRef.current = null;
    changePhase("playing");
    playTone(520, 0.13);
  };

  const restartGame = () => {
    if (phaseRef.current !== "paused") return;
    startGame(gameRef.current.mode, gameRef.current.skinId);
  };

  const selectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    try {
      window.localStorage.setItem(SELECTED_MODE_KEY, mode);
    } catch (error) {
      console.error("Could not save the selected game mode.", error);
      setStorageWarning(true);
    }
  };

  const selectSkin = (skinId: string) => {
    if (!unlockedSkinsRef.current.includes(skinId)) return;
    setSelectedSkin(skinId);
    gameRef.current.skinId = skinId;
    try {
      window.localStorage.setItem(SELECTED_SKIN_KEY, skinId);
    } catch (error) {
      console.error("Could not save the selected basket.", error);
      setStorageWarning(true);
    }
  };

  const openTutorial = () => {
    setTutorialStep(0);
    setTutorialOpen(true);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const remainder = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  const moveCatcher = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || phaseRef.current !== "playing") return;
    const bounds = canvas.getBoundingClientRect();
    const basketHalfWidth = getBasketHalfWidth(gameRef.current);
    gameRef.current.playerX = Math.min(
      Math.max(event.clientX - bounds.left, basketHalfWidth),
      Math.max(basketHalfWidth, bounds.width - basketHalfWidth),
    );
  };

  const toggleSound = () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    if (next) playTone(540, 0.1);
  };

  const modeForDisplay = phase === "ready" ? selectedMode : roundMode;
  const displayedSeconds =
    modeForDisplay === "rush" ? Math.max(0, 60 - seconds) : seconds;
  const activeDaily = dailyChallenge
    ? getDailyDefinition(dailyChallenge.id)
    : null;
  const activeBasket =
    BASKET_SKINS.find((skin) => skin.id === selectedSkin) ?? BASKET_SKINS[0];
  const dailyProgress = activeDaily
    ? Math.min(dailyChallenge?.progress ?? 0, activeDaily.target)
    : 0;

  return (
    <main className="game-shell">
      <div className="game-wrap">
        <header className="topbar">
          <Link className="brand" href="/" aria-label="Snack Swipe home">
            <span className="brand-mark" aria-hidden="true">🍟</span>
            <span>snack<span className="brand-accent">swipe</span></span>
          </Link>
          <button
            className="sound-button"
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
          >
            <span aria-hidden="true">{soundEnabled ? "♫" : "♪"}</span>
            <span>{soundEnabled ? "Sound on" : "Sound off"}</span>
          </button>
        </header>

        <section className="intro" aria-labelledby="game-title">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> THE SNACK ATTACK STARTS NOW</p>
            <h1 id="game-title">Snack <span>Swipe!</span></h1>
            <p className="intro-copy">
              Catch the tasty stuff. Dodge the nasty stuff. <strong>Easy peasy?</strong>
            </p>
          </div>
          <div className="doodle-burger" aria-hidden="true">🍔</div>
        </section>

        {(phase === "ready" || phase === "over") && (
          <section className="game-lobby" aria-label="Game setup and daily challenge">
            <div className="lobby-compact-row">
              <div
                className={`daily-challenge-card ${dailyChallenge?.completed ? "is-complete" : ""}`}
                aria-live="polite"
              >
                <span className="daily-challenge-icon" aria-hidden="true">
                  {dailyChallenge?.completed ? "🏆" : "🌟"}
                </span>
                <span className="daily-challenge-copy">
                  <span className="lobby-kicker">TODAY&apos;S CHALLENGE</span>
                  <strong>{activeDaily?.title ?? "Loading challenge…"}</strong>
                  <small>
                    {dailyChallenge?.completed
                      ? "Complete · Golden Bite basket earned"
                      : activeDaily?.detail ?? "A new challenge every day"}
                  </small>
                </span>
                {activeDaily && (
                  <span className="daily-compact-progress">
                    {dailyChallenge?.completed
                      ? "DONE"
                      : `${dailyProgress} / ${activeDaily.target}`}
                  </span>
                )}
                {activeDaily && (
                  <span
                    className="daily-progress-track"
                    role="progressbar"
                    aria-label="Daily challenge progress"
                    aria-valuemin={0}
                    aria-valuemax={activeDaily.target}
                    aria-valuenow={dailyProgress}
                  >
                    <span
                      style={{
                        width: `${(dailyProgress / activeDaily.target) * 100}%`,
                      }}
                    />
                  </span>
                )}
              </div>
              <button
                className={`setup-toggle setup-toggle-${selectedMode} ${setupOpen ? "is-open" : ""}`}
                type="button"
                aria-expanded={setupOpen}
                aria-controls="game-setup-options"
                onClick={() => setSetupOpen((open) => !open)}
              >
                <span className="setup-current-mode">
                  {GAME_MODES.find((mode) => mode.id === selectedMode)?.icon}{" "}
                  {selectedMode === "zen" ? "Zen mode" : GAME_MODES.find((mode) => mode.id === selectedMode)?.name}
                </span>
                <span
                  className="setup-current-basket"
                  aria-label={`${activeBasket.name} basket`}
                  style={{
                    background: `linear-gradient(160deg, ${activeBasket.rim} 0 25%, ${activeBasket.top} 26%, ${activeBasket.bottom} 100%)`,
                  }}
                />
                <span>{setupOpen ? "Done" : "Customize"}</span>
                <span className="setup-chevron" aria-hidden="true">
                  {setupOpen ? "⌃" : "⌄"}
                </span>
              </button>
            </div>

            {setupOpen && (
              <div className="lobby-options" id="game-setup-options">
                <div className="lobby-section">
                  <div className="lobby-section-title">
                    <span>Choose your mode</span>
                    <span>Switch it up anytime</span>
                  </div>
                  <div className="mode-picker">
                    {GAME_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={`mode-option mode-option-${mode.id} ${selectedMode === mode.id ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => selectMode(mode.id)}
                        aria-pressed={selectedMode === mode.id}
                      >
                        <span className="mode-option-icon" aria-hidden="true">
                          {mode.icon}
                        </span>
                        <span className="mode-option-copy">
                          <strong>{mode.name}</strong>
                          <small>{mode.description}</small>
                        </span>
                        <span className="mode-check" aria-hidden="true">
                          {selectedMode === mode.id ? "✓" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lobby-section basket-section">
                  <div className="lobby-section-title">
                    <span>Choose your basket</span>
                    <span>{unlockedSkins.length} / {BASKET_SKINS.length} unlocked</span>
                  </div>
                  <div className="basket-picker">
                    {BASKET_SKINS.map((skin) => {
                      const isUnlocked = unlockedSkins.includes(skin.id);
                      return (
                        <button
                          key={skin.id}
                          className={`basket-option ${selectedSkin === skin.id ? "is-selected" : ""} ${!isUnlocked ? "is-locked" : ""}`}
                          type="button"
                          onClick={() => selectSkin(skin.id)}
                          disabled={!isUnlocked}
                          aria-pressed={selectedSkin === skin.id}
                          title={isUnlocked ? skin.description : skin.requirement}
                        >
                          <span
                            className="basket-swatch"
                            aria-hidden="true"
                            style={{
                              background: `linear-gradient(160deg, ${skin.rim} 0 25%, ${skin.top} 26%, ${skin.bottom} 100%)`,
                            }}
                          >
                            {isUnlocked ? "☺" : "🔒"}
                          </span>
                          <strong>{skin.name}</strong>
                          <small>{isUnlocked ? skin.description : skin.requirement}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section
          className={`game-card ${phase === "paused" ? "is-paused" : ""}`}
          aria-label="Snack Swipe game"
        >
          <div className="scoreboard">
            <div className="score-tile score-main">
              <span className="tile-label">YOUR SCORE</span>
              <strong
                className="score-number"
                aria-live="polite"
                aria-label={`Score ${score}`}
              >
                {score.toString().padStart(3, "0")}
              </strong>
              {combo > 1 && phase === "playing" ? (
                <span className="combo-status">
                  <span
                    className="combo-badge"
                    title="Catch another snack within 1.45 seconds to keep your combo going."
                  >
                    🔥 Combo ×{combo}
                  </span>
                  <span
                    key={combo}
                    className="combo-timer"
                    role="progressbar"
                    aria-label="Time remaining to continue combo"
                    aria-valuemin={0}
                    aria-valuemax={1450}
                    aria-valuenow={1450}
                  >
                    <span />
                  </span>
                </span>
              ) : (
                <span className="tile-caption">Snacks are +10 each</span>
              )}
            </div>
            <div className="score-tile">
              <span className="tile-label">
                {modeForDisplay === "rush" ? "TIME LEFT" : "TIME"}
              </span>
              <strong className="mini-score timer-score">
                {formatTime(displayedSeconds)}
              </strong>
              <span className="tile-caption">
                {modeForDisplay === "rush" ? "60-second rush" : "Time in this round"}
              </span>
            </div>
            <div className="score-tile lives-tile">
              <span className="tile-label">
                {modeForDisplay === "zen" ? "PRACTICE MODE" : "LIVES LEFT"}
              </span>
              <strong
                key={`${modeForDisplay}-${lives}`}
                className={`life-icons ${modeForDisplay === "zen" ? "zen-lives" : ""}`}
                aria-label={modeForDisplay === "zen" ? "Unlimited lives" : `${lives} lives left`}
              >
                {modeForDisplay === "zen"
                  ? "∞"
                  : "❤️".repeat(Math.max(0, lives)) +
                    "🤍".repeat(Math.max(0, 3 - lives))}
              </strong>
              <span className="tile-caption">
                {modeForDisplay === "zen"
                  ? "No lives · no game over"
                  : "Avoid 💣 & 🤢"}
              </span>
            </div>
            <div className="score-tile">
              <span className="tile-label">PERSONAL BEST</span>
              <strong className="mini-score">{best.toString().padStart(3, "0")}</strong>
              <span className="tile-caption">Saved on this device</span>
            </div>
          </div>

          {phase === "playing" && activeDaily && dailyChallenge && (
            <div
              className={`live-challenge ${dailyChallenge.completed ? "is-complete" : ""}`}
              aria-live="polite"
            >
              <span className="live-challenge-icon" aria-hidden="true">
                {dailyChallenge.completed ? "🏆" : "✨"}
              </span>
              <span className="live-challenge-copy">
                <strong>
                  {dailyChallenge.completed
                    ? "Daily challenge complete!"
                    : `Daily: ${activeDaily.title}`}
                </strong>
                <small>
                  {dailyChallenge.completed
                    ? "Golden Bite basket unlocked"
                    : `${dailyProgress} / ${activeDaily.target} ${activeDaily.unit} · Golden Bite reward`}
                </small>
              </span>
              <span
                className="live-challenge-value"
                aria-label={`${dailyProgress} of ${activeDaily.target}`}
              >
                {dailyProgress}/{activeDaily.target}
              </span>
              <span
                className="live-challenge-track"
                role="progressbar"
                aria-label="Daily challenge progress"
                aria-valuemin={0}
                aria-valuemax={activeDaily.target}
                aria-valuenow={dailyProgress}
              >
                <span
                  style={{
                    width: `${(dailyProgress / activeDaily.target) * 100}%`,
                  }}
                />
              </span>
            </div>
          )}

          <div className={`playfield-wrap ${phase === "playing" ? "is-playing" : ""}`}>
            <canvas
              ref={canvasRef}
              className="playfield"
              onPointerMove={moveCatcher}
              onPointerDown={moveCatcher}
              aria-label="Game field. Drag with your finger or pointer, or use arrow keys or A and D. Catch food, avoid bombs and rotten snacks."
              role="img"
            />
            <div className="field-guide" aria-label="Quick game instructions">
              <span className="field-guide-controls">
                <span aria-hidden="true">↔</span> DRAG TO MOVE
                <span className="guide-divider">·</span>
                <kbd>←</kbd><kbd>→</kbd><span>or</span><kbd>A</kbd><kbd>D</kbd>
              </span>
              <span className="field-guide-goal">
                <span><b>Catch</b> 🍕 +10</span>
                <span className="guide-divider">·</span>
                <span><b>Avoid</b> 💣 🤢</span>
              </span>
            </div>
            {phase === "playing" && (
              <>
                <button
                  className="pause-button"
                  type="button"
                  onClick={pauseGame}
                  aria-label="Pause game"
                >
                  <span aria-hidden="true">Ⅱ</span>
                  <span>Pause</span>
                </button>
                <div className="level-pill" title="Heat rises every 14 seconds; snacks fall faster at each level.">
                  <span className="level-dot" /> HEAT {heat}
                  <span className="level-caption">
                    · next heat in {14 - (seconds % 14)}s
                  </span>
                  <span
                    className="heat-meter"
                    role="progressbar"
                    aria-label="Progress until the next heat level"
                    aria-valuemin={0}
                    aria-valuemax={14}
                    aria-valuenow={seconds % 14}
                    aria-valuetext={`${14 - (seconds % 14)} seconds until the next heat level`}
                  >
                    <span style={{ width: `${((seconds % 14) / 14) * 100}%` }} />
                  </span>
                </div>
                <div className="power-status" aria-live="polite">
                  {shieldCharges > 0 && (
                    <span
                      className="power-chip shield-chip"
                      title="Each shield charge blocks one caught bomb or rotten snack."
                    >
                      🛡️ {shieldCharges} {shieldCharges === 1 ? "block" : "blocks"} left
                    </span>
                  )}
                  {slowMotion && (
                    <span
                      className="power-chip slow-chip"
                      title="Slow-mo reduces falling item speed for 5 seconds."
                    >
                      ⏱️ Slow-mo · items slowed
                    </span>
                  )}
                </div>
                {feedback && (
                  <div
                    key={feedback.id}
                    className={`game-feedback feedback-${feedback.kind}`}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <strong>{feedback.title}</strong>
                    <span>{feedback.detail}</span>
                  </div>
                )}
              </>
            )}
            {(phase === "ready" || phase === "over") && (
              <div className="game-overlay">
                <div className={`overlay-card ${phase === "over" ? "game-over-card" : ""}`}>
                  <span className="overlay-emoji" aria-hidden="true">
                    {phase === "over" ? (newRecord ? "🏆" : "🥺") : "🤤"}
                  </span>
                  <h2>
                    {phase === "over"
                      ? newRecord
                        ? "New personal best!"
                        : "Snack break!"
                      : "Ready, snacktion!"}
                  </h2>
                  <p>
                    {phase === "over"
                      ? "Here’s how that round stacked up."
                      : "Catch the tasty stuff. Let the bad bites pass."}
                  </p>
                  {phase === "over" ? (
                    <>
                      <div className="round-summary" aria-label="Round summary">
                        <div>
                          <strong>{score}</strong>
                          <span>POINTS</span>
                        </div>
                        <div>
                          <strong>{roundStats.snacksCaught}</strong>
                          <span>SNACKS CAUGHT</span>
                        </div>
                        <div>
                          <strong>×{roundStats.bestCombo}</strong>
                          <span>BEST COMBO</span>
                        </div>
                        <div>
                          <strong>{formatTime(seconds)}</strong>
                          <span>TIME PLAYED</span>
                        </div>
                      </div>
                      <div className="achievement-row" aria-label="Round achievements">
                        <span>
                          {GAME_MODES.find((mode) => mode.id === roundMode)?.icon}{" "}
                          {GAME_MODES.find((mode) => mode.id === roundMode)?.name} mode
                        </span>
                        {newRecord && <span>🌟 Personal best</span>}
                        {roundStats.bestCombo >= 3 && <span>🔥 Combo chef</span>}
                        {roundStats.snacksCaught >= 10 && <span>🍱 Snack collector</span>}
                        {dailyChallenge?.completed && <span>🌟 Daily challenge complete</span>}
                        {!newRecord &&
                          roundStats.bestCombo < 3 &&
                          roundStats.snacksCaught < 10 && (
                            <span>🥄 Every snack counts—give it another go!</span>
                          )}
                      </div>
                      <button className="start-button" type="button" onClick={() => startGame()}>
                        <span>Retry</span>
                        <span aria-hidden="true">↻</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="welcome-rules">
                        <span>🍕 <b>Catch</b> for +10</span>
                        <span>💣🤢 <b>Let them pass</b></span>
                        <span>
                          {selectedMode === "zen"
                            ? <>🌿 <b>Unlimited practice</b></>
                            : selectedMode === "rush"
                              ? <>⏱️ <b>60 seconds · 3 lives</b></>
                              : <>❤️ <b>3 lives</b></>}
                        </span>
                      </div>
                      <button className="start-button" type="button" onClick={() => startGame()}>
                        <span>Play</span>
                        <span aria-hidden="true">→</span>
                      </button>
                      <button className="tutorial-link" type="button" onClick={openTutorial}>
                        First time? Take the quick how-to tour <span aria-hidden="true">→</span>
                      </button>
                    </>
                  )}
                  {phase === "over" && (
                    <button className="tutorial-link" type="button" onClick={openTutorial}>
                      Review the rules <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {phase === "paused" && (
              <div className="game-overlay pause-overlay">
                <div className="overlay-card pause-card">
                  <span className="overlay-emoji" aria-hidden="true">⏸️</span>
                  <span className="pause-eyebrow">TAKE YOUR TIME</span>
                  <h2>Game paused</h2>
                  <p>
                    {roundMode === "rush"
                      ? `${formatTime(displayedSeconds)} left on the clock · your game is frozen.`
                      : "Your snacks are frozen. Pick up right where you left off."}
                  </p>
                  <button
                    className="start-button resume-button"
                    type="button"
                    onClick={resumeGame}
                  >
                    <span>Resume</span>
                    <span aria-hidden="true">▶</span>
                  </button>
                  <button
                    className="pause-secondary-button"
                    type="button"
                    onClick={restartGame}
                  >
                    ↻ Restart this game
                  </button>
                  <Link className="pause-exit-link" href="/">
                    ← Exit game
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="game-footer">
            <div className="controls-hint">
              <span className="control-icon" aria-hidden="true">↔</span>
              <span>
                <strong>Goal:</strong>{" "}
                {modeForDisplay === "zen"
                  ? "practice freely and build your best combo."
                  : modeForDisplay === "rush"
                    ? "score as much as you can in 60 seconds."
                    : "score as much as you can before your 3 lives run out."}
              </span>
            </div>
            <span className="keyboard-hint">Personal best: {best}</span>
          </div>
        </section>

        <section className="how-to-play" aria-label="How to play">
          <div className="how-title">
            <span className="how-spark" aria-hidden="true">✳</span>
            <div>
              <h2>How to play</h2>
              <p>Three simple rules. One hungry basket.</p>
            </div>
            <button className="section-tour-button" type="button" onClick={openTutorial}>
              Take the 20-second tour
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="rule-list">
            <div className="rule-item">
              <span className="rule-icon food-icon" aria-hidden="true">🍕</span>
              <span>
                <strong>Catch tasty snacks</strong>
                <small>+10 each; catch within 1.45s to build a combo (+2 each, up to +20).</small>
              </span>
            </div>
            <div className="rule-item">
              <span className="rule-icon danger-icon" aria-hidden="true">💣</span>
              <span>
                <strong>Let bombs &amp; rotten snacks pass</strong>
                <small>Catching either costs 1 life unless a shield blocks it. Missing food only resets your combo.</small>
              </span>
            </div>
            <div className="rule-item" title="One shield charge blocks one caught bomb or rotten snack.">
              <span className="rule-icon power-icon" aria-hidden="true">🛡️</span>
              <span><strong>🛡️ Shield</strong><small>Blocks one caught bomb or rotten snack.</small></span>
            </div>
            <div className="rule-item" title="The clock slows all falling items for 5 seconds.">
              <span className="rule-icon slow-icon" aria-hidden="true">⏱️</span>
              <span><strong>⏱️ Slow-mo</strong><small>Slows falling items for 5 seconds.</small></span>
            </div>
          </div>
        </section>

        {storageWarning && (
          <p className="storage-warning" role="status">
            Your high score couldn&apos;t be saved in this browser.
          </p>
        )}
        <footer className="page-footer">
          <span>MADE WITH 🍟 &amp; A LITTLE BIT OF CHAOS</span>
          <span>ONE MORE ROUND? ALWAYS.</span>
        </footer>
      </div>
      {tutorialOpen && (
        <div
          className="tutorial-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setTutorialOpen(false);
          }}
        >
          <section
            className="tutorial-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            aria-describedby="tutorial-description"
          >
            <button
              className="tutorial-close"
              type="button"
              onClick={() => setTutorialOpen(false)}
              aria-label="Close how-to tour"
            >
              ×
            </button>
            <span className="tutorial-step-icon" aria-hidden="true">
              {TUTORIAL_STEPS[tutorialStep].icon}
            </span>
            <span className="tutorial-step-label">{TUTORIAL_STEPS[tutorialStep].label}</span>
            <h2 id="tutorial-title">{TUTORIAL_STEPS[tutorialStep].title}</h2>
            <p id="tutorial-description">{TUTORIAL_STEPS[tutorialStep].text}</p>
            <p className="tutorial-tip">
              <span aria-hidden="true">💡</span> {TUTORIAL_STEPS[tutorialStep].tip}
            </p>
            <div className="tutorial-progress" aria-label={`Step ${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`}>
              {TUTORIAL_STEPS.map((step, index) => (
                <span
                  key={step.label}
                  className={index === tutorialStep ? "is-current" : index < tutorialStep ? "is-complete" : ""}
                />
              ))}
              <span className="tutorial-step-count">
                {tutorialStep + 1} / {TUTORIAL_STEPS.length}
              </span>
            </div>
            <div className="tutorial-actions">
              <button
                className="tutorial-back-button"
                type="button"
                onClick={() => setTutorialStep((step) => Math.max(0, step - 1))}
                disabled={tutorialStep === 0}
              >
                Back
              </button>
              {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                <button
                  className="start-button tutorial-next-button"
                  type="button"
                  onClick={() => setTutorialStep((step) => Math.min(TUTORIAL_STEPS.length - 1, step + 1))}
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="start-button tutorial-next-button"
                  type="button"
                  onClick={() => startGame()}
                >
                  Let&apos;s play <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
            <button
              className="tutorial-skip"
              type="button"
              onClick={() => setTutorialOpen(false)}
            >
              Skip tour
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
