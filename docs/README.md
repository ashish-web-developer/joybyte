# Project documentation

This folder contains the deeper documentation for the arcade app and its supporting utility.

## Contents

- [architecture.md](architecture.md) — overview of the app layout, route structure, and shared patterns
- [games.md](games.md) — summaries of the game experiences and how they work
- [asset-generator.md](asset-generator.md) — guide to the logo export API and generated icon pack

## Quick app summary

The app is a multi-game browser experience built with Next.js and React. It focuses on playful UI, lightweight local progress, and a small set of self-contained game loops rather than a backend-heavy system.

The main goals of the project are:

- provide a small arcade-style landing page
- let users play multiple browser games from one interface
- demonstrate front-end logic, animation, and state handling
- include a useful utility API for generating icon assets from uploaded logos

## Main entry points

- [../app/page.tsx](../app/page.tsx) — landing page and game menu
- [../app/games/snack-attack/snack-swipe.tsx](../app/games/snack-attack/snack-swipe.tsx) — Snack Attack gameplay logic
- [../app/games/loopbreak/loopbreak.tsx](../app/games/loopbreak/loopbreak.tsx) — Loopbreak puzzle flow
- [../app/games/snakes-and-ladders/game.js](../app/games/snakes-and-ladders/game.js) — board game logic and UI
- [../app/api/generate/route.ts](../app/api/generate/route.ts) — asset export API

## Development notes

- Use the app as a front-end prototype or showcase.
- Keep state and game logic mostly client-side.
- Progress and unlocks are intentionally browser-based for simplicity.
- The export API is the main server-side responsibility in the app.
