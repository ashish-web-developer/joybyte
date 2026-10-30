# Architecture overview

## High-level structure

The app is organized as a simple Next.js project with an App Router layout. The home route acts as a game hub, while each game gets its own route and client-side logic.

### Key directories

- app/ — route-level pages and page-specific UI
- components/ — reusable UI building blocks
- hooks/ — stateful React hooks
- lib/ — game helper logic and board utilities
- public/ — static assets such as sound files

## App routing pattern

The application uses route-based composition rather than a single shared game shell.

Examples:

- / — landing page and collection overview
- /games/snack-attack — arcade action game
- /games/loopbreak — puzzle route
- /games/snakes-and-ladders — board game route
- /api/generate — server-side utility route

This pattern keeps each experience isolated while still allowing the home page to act as a central menu.

## Front-end state model

Most game logic is kept in the client layer. This works well for:

- local gameplay loops
- animation and input handling
- ephemeral UI state
- browser persistence with localStorage

A typical pattern is:

- page component renders shell and layout
- game component owns state or hook logic
- localStorage stores progression or unlocks
- UI updates reactively as game state changes

## Shared conventions

Across the repo, the general approach is:

- simple, direct component composition
- CSS-driven visuals with a playful arcade aesthetic
- minimal framework abstraction
- fast iteration over deep architecture layers

This is intentionally not built like a large enterprise app. It is structured as a compact demo and interactive showcase.

## Server-side utility

The main server-side functionality is the icon generator in [../app/api/generate/route.ts](../app/api/generate/route.ts). It accepts a file upload, processes it with Sharp, and returns a ZIP of assets.

This area is useful because it demonstrates:

- request parsing with form data
- image processing and validation
- zip generation with JSZip
- binary response handling in Next.js Route Handlers

## Notes for future extensions

If more features are added later, the project can safely grow by continuing this pattern:

- add new route folders under app/games/
- keep per-game logic contained within that route or component tree
- store any persistent data in localStorage or a future backend service
- leave shared UI conventions stable for the home page and navigation shell
