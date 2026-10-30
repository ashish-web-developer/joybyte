"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useMemo } from "react";
import GameBoard from "../../../components/snakes-and-ladders/GameBoard";
import GameControls from "../../../components/snakes-and-ladders/GameControls";
import PlayerCard from "../../../components/snakes-and-ladders/PlayerCard";
import WinnerModal from "../../../components/snakes-and-ladders/WinnerModal";
import useGame from "../../../hooks/useGame";

export default function Game() {
  const game = useGame();
  const winner = useMemo(
    () => Object.values(game.players).find((player) => player.position === 100) || null,
    [game.players],
  );
  const isComputerTurn = game.turn === "computer" && game.phase !== "finished";

  return (
    <main className="snl-page">
      <div className="snl-shell">
        <header className="snl-header">
          <Link className="snl-brand" href="/" aria-label="Back to the game menu">
            <span className="snl-brand-mark" aria-hidden="true">
              <span /><span /><span />
            </span>
            <span>little<span className="snl-brand-accent">play</span><i>.</i></span>
          </Link>
          <div className="snl-header-actions">
            <Link className="snl-back-link" href="/">
              <ArrowLeft size={15} aria-hidden="true" /> <span>All games</span>
            </Link>
            <button type="button" className="snl-icon-button" onClick={game.toggleSound} aria-label={game.soundEnabled ? "Turn sound off" : "Turn sound on"} title={game.soundEnabled ? "Turn sound off" : "Turn sound on"}>
              {game.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button type="button" className="snl-new-game-button" onClick={game.newGame}>
              New game
            </button>
          </div>
        </header>

        <section className="snl-intro">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="snl-eyebrow"><span /> A LITTLE LUCK GOES A LONG WAY</div>
            <h1>Snakes <span>&</span> Ladders</h1>
            <p>Race to the top. Try not to look down.</p>
          </motion.div>
          <div className="snl-intro-stamp" aria-hidden="true">
            <span>THE</span><strong>100</strong><span>SQUARE RACE</span>
          </div>
        </section>

        <div className="snl-player-row">
          <PlayerCard player={game.players.human} active={!isComputerTurn && game.phase !== "finished"} phase={game.phase} />
          <span className="snl-versus">VS</span>
          <PlayerCard player={game.players.computer} active={isComputerTurn} phase={game.phase} />
        </div>

        <section className="snl-game-layout" aria-label="Snakes and ladders game">
          <div className="snl-board-column">
            <GameBoard players={game.players} turn={game.turn} phase={game.phase} />
            <div className="snl-board-legend">
              <span><i className="snl-legend-ladder" /> Ladder: up you go</span>
              <span><i className="snl-legend-snake" /> Snake: watch your step</span>
              <span className="snl-board-rule">First to 100 wins</span>
            </div>
          </div>
          <aside className="snl-sidebar">
            <GameControls game={game} onRoll={game.rollDice} />
            <div className="snl-note-card">
              <span className="snl-note-icon" aria-hidden="true">✳</span>
              <p><strong>Good things take a little luck.</strong> Take turns, roll fairly, and let the board decide.</p>
            </div>
          </aside>
        </section>

        <footer className="snl-footer">
          <span>Made for one more round.</span>
          <span>Take turns <i>·</i> Roll 1–6 <i>·</i> Exact roll to finish</span>
        </footer>
      </div>
      <WinnerModal winner={winner} onPlayAgain={game.newGame} />
    </main>
  );
}
