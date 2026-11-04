# Puzzles

A shelf of small browser puzzle games, with tactile isometric worlds and touch-friendly controls.

**[Play at puzzles.hensap.id](https://puzzles.hensap.id/)**

Play **Petals**, a 3D Minesweeper with connected floors, or **Traffic Garden**, a sliding-car puzzle with three difficulty levels. Both have touch and keyboard controls, sound, and local saves. **Crate Garden**, an eight-level crate-pushing puzzle, is ready in the local development build. The local build gives all three games rotatable 3D boards.

## Run locally

Use Node.js 22.12+, 24, or 26+. In macOS/Linux Terminal or Windows PowerShell:

```sh
npm ci
npm run dev
```

The homepage is the game library. Petals lives at `/games/petals/`; Traffic Garden at `/games/traffic-garden/`; Crate Garden at `/games/crate-garden/`.

## Project guide

- [Development](docs/DEVELOPMENT.md) · [Petals gameplay](docs/GAMEPLAY.md) · [Traffic Garden](docs/TRAFFIC_GARDEN.md) · [Crate Garden](docs/CRATE_GARDEN.md)
- [Icon prompts and art workflow](docs/art/README.md)
- [Progress](TODO.md) · [Developer handoff](HANDOFF.md) · [Agent instructions](AGENTS.md)
- [Deployment and save migration](docs/DEPLOYMENT.md) · [Validation](VALIDATION.md)
- [Original Minesweeper ideas](INITIAL_IDEAS.md)

[MIT License](LICENSE) © 2026 Hendra Saputra.
