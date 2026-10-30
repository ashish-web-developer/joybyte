"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYER_DETAILS, PLAYER_IDS } from "../lib/gameConfig";
import { getMoveResult, rollDie } from "../lib/gameLogic";

const INITIAL_PLAYERS = {
  [PLAYER_IDS.HUMAN]: { ...PLAYER_DETAILS[PLAYER_IDS.HUMAN], position: 0 },
  [PLAYER_IDS.COMPUTER]: { ...PLAYER_DETAILS[PLAYER_IDS.COMPUTER], position: 0 },
};

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const audioContextRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((error) => {
          console.error("Could not close the game audio context.", error);
        });
      }
    };
  }, []);

  const playSound = useCallback((kind) => {
    if (!soundEnabled || typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio is not supported by this browser.");
      }
      const context =
        audioContextRef.current || (audioContextRef.current = new AudioContextClass());
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const tones = {
        roll: [370, 0.11],
        ladder: [660, 0.17],
        snake: [190, 0.22],
        win: [880, 0.26],
      };
      const [frequency, duration] = tones[kind];
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.error("Could not play a game sound.", error);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((enabled) => !enabled);
  }, []);

  const newGame = useCallback(() => {
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
  }, []);

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

      const result = getMoveResult(start, value);
      if (result.exactFinishRequired) {
        setMessage(`${playerName} needs an exact roll to reach 100. No move this turn.`);
        await wait(650);
        if (!mountedRef.current || generationRef.current !== gameGeneration) return;
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
    }, 850);
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
