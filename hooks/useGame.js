"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PLAYER_DETAILS, PLAYER_IDS } from "../lib/gameConfig";
import { getMoveResult, rollDie } from "../lib/gameLogic";
import { SOUND_EFFECTS, SOUND_PREFERENCE_KEY } from "../lib/soundEffects";

const INITIAL_PLAYERS = {
  [PLAYER_IDS.HUMAN]: { ...PLAYER_DETAILS[PLAYER_IDS.HUMAN], position: 0 },
  [PLAYER_IDS.COMPUTER]: { ...PLAYER_DETAILS[PLAYER_IDS.COMPUTER], position: 0 },
};
const COMPUTER_TURN_DELAY = 1500;
const SOUND_PREFERENCE_EVENT = "snakes-ladders-sound-preference";
let inMemorySoundPreference = true;

function getSoundPreferenceSnapshot() {
  try {
    const savedPreference = window.sessionStorage.getItem(SOUND_PREFERENCE_KEY);
    if (savedPreference !== null) {
      inMemorySoundPreference = savedPreference === "true";
    }
  } catch (error) {
    console.error("Could not read the sound preference for this game session.", error);
  }
  return inMemorySoundPreference;
}

function getServerSoundPreferenceSnapshot() {
  return true;
}

function subscribeToSoundPreference(callback) {
  window.addEventListener(SOUND_PREFERENCE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SOUND_PREFERENCE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function saveSoundPreference(enabled) {
  inMemorySoundPreference = enabled;
  try {
    window.sessionStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  } catch (error) {
    console.error("Could not save the sound preference for this game session.", error);
  }
  window.dispatchEvent(new Event(SOUND_PREFERENCE_EVENT));
}

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

export default function useGame() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [turn, setTurn] = useState(PLAYER_IDS.HUMAN);
  const [phase, setPhase] = useState("ready");
  const [die, setDie] = useState(1);
  const [lastRoll, setLastRoll] = useState(null);
  const [message, setMessage] = useState("Your adventure starts at square 0.");
  const soundEnabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundPreferenceSnapshot,
    getServerSoundPreferenceSnapshot,
  );
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const soundEnabledRef = useRef(true);
  const audioRefs = useRef({});
  const activeSoundsRef = useRef(new Set());

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const activeSounds = activeSoundsRef.current;
    mountedRef.current = true;
    for (const [kind, effect] of Object.entries(SOUND_EFFECTS)) {
      const audio = new Audio(effect.src);
      audio.preload = "auto";
      audio.volume = effect.volume;
      audio.addEventListener("ended", () => {
        activeSounds.delete(kind);
      });
      audioRefs.current[kind] = audio;
    }

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      for (const audio of Object.values(audioRefs.current)) {
        audio.pause();
      }
      activeSounds.clear();
      audioRefs.current = {};
    };
  }, []);

  const stopAllSounds = useCallback(() => {
    for (const audio of Object.values(audioRefs.current)) {
      audio.pause();
      audio.currentTime = 0;
    }
    activeSoundsRef.current.clear();
  }, []);

  const playSound = useCallback((kind, { force = false } = {}) => {
    if ((!soundEnabledRef.current && !force) || typeof window === "undefined") return;

    const audio = audioRefs.current[kind];
    if (!audio) {
      console.error(`The "${kind}" game sound is not available.`);
      return;
    }

    if (kind === "step" && activeSoundsRef.current.has("step")) return;
    if (kind === "step" && (activeSoundsRef.current.has("ladder") || activeSoundsRef.current.has("snake") || activeSoundsRef.current.has("win"))) return;

    if (["ladder", "snake", "win", "turn"].includes(kind)) {
      stopAllSounds();
    } else if (kind === "land") {
      const rolling = audioRefs.current.roll;
      rolling.pause();
      rolling.currentTime = 0;
      activeSoundsRef.current.delete("roll");
    }
    audio.volume = SOUND_EFFECTS[kind].volume;
    audio.currentTime = 0;
    activeSoundsRef.current.add(kind);
    const playback = audio.play();
    if (playback) {
      playback.catch((error) => {
        if (audio.paused) {
          activeSoundsRef.current.delete(kind);
        }
        if (error?.name === "AbortError") return;
        console.error(`Could not play the "${kind}" game sound.`, error);
      });
    }
  }, [stopAllSounds]);

  const toggleSound = useCallback(() => {
    const enabled = !soundEnabledRef.current;
    soundEnabledRef.current = enabled;
    saveSoundPreference(enabled);

    if (enabled) {
      playSound("click", { force: true });
    } else {
      stopAllSounds();
    }
  }, [playSound, stopAllSounds]);

  const newGame = useCallback(() => {
    stopAllSounds();
    playSound("click");
    generationRef.current += 1;
    busyRef.current = false;
    setPlayers({
      [PLAYER_IDS.HUMAN]: { ...PLAYER_DETAILS[PLAYER_IDS.HUMAN], position: 0 },
      [PLAYER_IDS.COMPUTER]: {
        ...PLAYER_DETAILS[PLAYER_IDS.COMPUTER],
        position: 0,
      },
    });
    setTurn(PLAYER_IDS.HUMAN);
    setPhase("ready");
    setDie(1);
    setLastRoll(null);
    setMessage("Your adventure starts at square 0.");
  }, [playSound, stopAllSounds]);

  const rollDice = useCallback(async () => {
    if (busyRef.current || phase !== "ready") return;
    if (turn === PLAYER_IDS.HUMAN && phase !== "ready") return;

    busyRef.current = true;
    const gameGeneration = generationRef.current;
    const playerId = turn;
    const playerName = PLAYER_DETAILS[playerId].name;
    const start = players[playerId].position;
    const currentMessage = playerId === PLAYER_IDS.HUMAN
      ? "The die is rolling..."
      : "Clover is thinking...";
    setPhase("rolling");
    setMessage(currentMessage);
    playSound("roll");

    try {
      await wait(720);
      if (!mountedRef.current || generationRef.current !== gameGeneration) return;

      const value = rollDie();
      setDie(value);
      setLastRoll({ playerId, value });
      setPhase("moving");
      setMessage(`${playerName} rolled a ${value}.`);
      playSound("land");

      const result = getMoveResult(start, value);
      if (result.exactFinishRequired) {
        setMessage(`${playerName} needs an exact roll to reach 100. No move this turn.`);
        await wait(650);
        if (!mountedRef.current || generationRef.current !== gameGeneration) return;
        if (playerId === PLAYER_IDS.HUMAN) playSound("turn");
        setTurn(playerId === PLAYER_IDS.HUMAN ? PLAYER_IDS.COMPUTER : PLAYER_IDS.HUMAN);
        setPhase("ready");
        return;
      }

      for (let square = start + 1; square <= result.landedOn; square += 1) {
        await wait(175);
        if (!mountedRef.current || generationRef.current !== gameGeneration) return;
        setPlayers((current) => ({
          ...current,
          [playerId]: { ...current[playerId], position: square },
        }));
        playSound("step");
      }

      if (result.effect) {
        const detail = result.effect === "ladder" ? "climbed a ladder" : "slid down a snake";
        setMessage(`${playerName} ${detail} from ${result.landedOn} to ${result.position}!`);
        playSound(result.effect);
        await wait(620);
        if (!mountedRef.current || generationRef.current !== gameGeneration) return;
        setPlayers((current) => ({
          ...current,
          [playerId]: { ...current[playerId], position: result.position },
        }));
      }

      if (result.position === 100) {
        setMessage(`${playerName} reached square 100 and won!`);
        setPhase("finished");
        playSound("win");
        return;
      }

      if (!result.effect) {
        setMessage(`${playerName} landed on square ${result.position}.`);
      }
      if (playerId === PLAYER_IDS.HUMAN) playSound("turn");
      setTurn(playerId === PLAYER_IDS.HUMAN ? PLAYER_IDS.COMPUTER : PLAYER_IDS.HUMAN);
      setPhase("ready");
    } finally {
      if (generationRef.current === gameGeneration) {
        busyRef.current = false;
      }
    }
  }, [phase, players, playSound, turn]);

  useEffect(() => {
    if (turn !== PLAYER_IDS.COMPUTER || phase !== "ready") return undefined;
    const timeout = window.setTimeout(() => {
      rollDice();
    }, COMPUTER_TURN_DELAY);
    return () => window.clearTimeout(timeout);
  }, [phase, rollDice, turn]);

  return {
    players,
    turn,
    phase,
    die,
    lastRoll,
    message,
    soundEnabled,
    rollDice,
    newGame,
    toggleSound,
  };
}
