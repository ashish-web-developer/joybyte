# Game overview

## Snack Attack

Snack Attack is the most feature-rich game in the app. It combines arcade timing, scoring, power-ups, and progression.

### Gameplay loop

The player moves a basket across the width of the playfield, collecting falling snacks. Each successful catch adds score, while bombs and rotten items can reduce lives or trigger penalties.

### Systems included

- score tracking
- combo multiplier
- daily challenges
- power-ups such as shields and time-slowing clocks
- unlockable basket skins
- localStorage-based progression

### Modes

- Classic — default mode with lives and score chasing
- Zen — no life penalty, intended for practice
- Rush — timed challenge with a short high-pressure round

### Controls

- pointer movement
- touch drag
- keyboard arrows or A/D

## Loopbreak

Loopbreak is a puzzle route that focuses on logic and spatial manipulation rather than quick reaction speed.

### Core idea

Players rotate circuit-like tiles so that the route connects correctly and reaches the finish state under the puzzle rules.

### Gameplay systems

- route tracing
- checkpoint validation
- tile rotation logic
- level progression and best-score tracking
- persistent unlocked progress

### Intent

This game emphasizes puzzle-solving and optimization rather than reflexes. It feels more like a small brain teaser than a reflex game.

## Snakes & Ladders

This game recreates a familiar board-game loop with a bright UI and a competitive human-versus-computer structure.

### Gameplay loop

Players roll dice, advance tokens, and try to reach square 100 before the rival. Ladders help progress, while snakes set players back.

### Systems included

- dice rolling
- player turn handling
- board movement logic
- winner detection
- sound toggle and replay flow

### Intent

This title provides a classic game feel and acts as a contrast to the more arcade-oriented Snack Attack and the puzzle-driven Loopbreak.

## Comparison

| Game | Core feel | Main challenge | State model |
| --- | --- | --- | --- |
| Snack Attack | Fast arcade | Reflexes and timing | Client-side score and unlock state |
| Loopbreak | Puzzle | Logic and planning | Client-side progression |
| Snakes & Ladders | Classic board game | Turn strategy and luck | Client-side game state |

All three games share the same home-page entry structure but differ strongly in how they handle feedback, progression, and play rhythm.
