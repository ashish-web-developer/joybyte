# Next UI Toolkit

A playful browser-game showcase built with Next.js, combining multiple arcade-style mini-games with a lightweight asset-generation API. This project is designed as a polished front-end playground where each route feels like its own self-contained experience.

## Overview

The app currently includes:

- Snack Attack — a reflex-and-combo arcade game
- Loopbreak — a rotating tile puzzle game
- Snakes & Ladders — a classic board game with a computer opponent
- Asset generator API — converts uploaded logos into a downloadable icon pack

The codebase is structured around the Next.js App Router and is intentionally lightweight, colorful, and easy to extend.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Sharp
- JSZip

## Project structure

```text
joybyte/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts
│   ├── games/
│   │   ├── loopbreak/
│   │   │   ├── levels.ts
│   │   │   ├── loopbreak.css
│   │   │   ├── loopbreak.tsx
│   │   │   └── page.tsx
│   │   ├── snack-attack/
│   │   │   ├── page.tsx
│   │   │   └── snack-swipe.tsx
│   │   ├── snakes-and-ladders/
│   │   │   ├── game.css
│   │   │   ├── game.js
│   │   │   └── page.js
│   │   └── time-thief/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── snakes-and-ladders/
├── hooks/
│   └── useGame.js
├── lib/
│   ├── boardUtils.js
│   ├── gameConfig.js
│   ├── gameLogic.js
│   └── soundEffects.js
├── public/
│   └── sounds/
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── README.md
└── AGENTS.md
```

## Routes

- `/` — landing page and game selection menu
- `/games/snack-attack` — Snack Attack game
- `/games/loopbreak` — Loopbreak puzzle
- `/games/snakes-and-ladders` — classic board game
- `/api/generate` — logo-to-icon export API

## Feature walkthrough

### Snack Attack

Snack Attack is a falling-item arcade game where the player controls a basket at the bottom of the screen and catches good items while avoiding hazards.

Key features:

- Falling food items for points
- Bombs and rotten snacks that cost lives
- Shield pickups and slow-motion power-ups
- Combo system with accelerated scoring
- Classic, Zen, and Rush modes
- Unlockable basket skins
- Daily challenge progression
- Persistent best score and unlock data using browser storage

Controls:

- Mouse
- Touch drag
- Keyboard left/right or A/D

Goal:

- Stay alive, keep your streak alive, and push for a high score.

### Loopbreak

Loopbreak is a logic puzzle built around rotating tiles and tracing a valid path. Each level presents a pattern that must be solved with minimal turns or correct route completion.

Key features:

- Procedural level generation logic
- Tile rotation and route tracing
- Progression and level unlocks
- Best-score tracking per level
- Pause, completion, and tutorial flow
- Local persistence for unlocked levels and best runs

Goal:

- Solve the pattern by rotating the correct tiles and completing the route.

### Snakes & Ladders

This game delivers the classic board-race experience in a browser UI using a human-vs-computer turn structure.

Key features:

- Dice rolls and turn-based movement
- Snake and ladder interactions
- Winner modal and replay flow
- Sound toggle
- Animated board UI

Goal:

- Reach square 100 before the computer while navigating snakes and ladders.

### Asset generator API

The API in `app/api/generate/route.ts` accepts an uploaded logo and returns a ZIP archive containing icon assets for web use.

What it does:

- Accepts PNG, JPG, WebP, and SVG images
- Validates upload size and content safety
- Rejects unsafe SVG elements like scripts and external references
- Resizes the logo into a centered square canvas
- Produces multiple icon sizes:
  - 16x16
  - 32x32
  - 48x48
  - 180x180
  - 192x192
  - 512x512
- Generates a manifest file and asset pack README
- Downloads the result as a ZIP file

This is useful for quickly preparing a basic app icon set.

## Documentation

This project has a small docs set under [docs/README.md](docs/README.md) for deeper explanations of the app, architecture, and game systems.

- [docs/README.md](docs/README.md) — documentation index
- [docs/architecture.md](docs/architecture.md) — app structure and flow
- [docs/games.md](docs/games.md) — gameplay overview for each title
- [docs/asset-generator.md](docs/asset-generator.md) — logo export API guide

## Getting started

### Install dependencies

```bash
pnpm install
```

### Run the app locally

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

## Production build

```bash
pnpm build
pnpm start
```

## Linting

```bash
pnpm lint
```

## Notes on architecture

- Game state is mostly client-side and browser-driven.
- Persistent progress is stored with `localStorage` where supported.
- The project emphasizes visual experimentation and gameplay prototypes more than backend complexity.
- The app is designed to be easy to extend with additional games or UI modules.

## Current status

This repository is a compact front-end arcade and utilities app. It works well for:

- interactive demos
- portfolio projects
- game prototype exploration
- lightweight asset-generation workflows

It is not a backend-heavy application and does not currently depend on a database or authentication layer.

## Contributing

If you want to extend the project:

1. Add a new game route under `app/games/`
2. Reuse or adapt styling conventions already used in the existing games
3. Keep game state logic client-focused and browser-friendly
4. Validate new routes with the project lint/build checks

---

This project is intentionally lightweight, playful, and flexible—making it a good base for additional mini-games, experiments, and front-end showcases.
