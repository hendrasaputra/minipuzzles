# Puzzles

A shelf of small browser puzzle games, with tactile isometric worlds and touch-friendly controls.

**[Play at puzzles.hensap.id](https://puzzles.hensap.id/)**

Play **Petals** (Minesweeper), **Traffic Garden** (sliding cars), **Crate Garden** (crate pushing), **Crystal Light** (mirrors and animated lasers), and **Water Garden** (flowing channels). All have rotatable 3D boards, touch and keyboard controls, sound, and local saves.

## Run locally

Use Node.js 22.12+, 24, or 26+. In macOS/Linux Terminal or Windows PowerShell:

```sh
npm ci
npm run dev
```

The homepage is the game library. Petals lives at `/games/petals/`; Traffic Garden at `/games/traffic-garden/`; Crate Garden at `/games/crate-garden/`; Crystal Light at `/games/crystal-light/`; Water Garden at `/games/water-garden/`.

## Project guide

- [Development](docs/DEVELOPMENT.md) · [Petals gameplay](docs/GAMEPLAY.md) · [Traffic Garden](docs/TRAFFIC_GARDEN.md) · [Crate Garden](docs/CRATE_GARDEN.md) · [Crystal Light](docs/CRYSTAL_LIGHT.md) · [Water Garden](docs/WATER_GARDEN.md)
- [Icon prompts and art workflow](docs/art/README.md)
- [Progress](TODO.md) · [Developer handoff](HANDOFF.md) · [Agent instructions](AGENTS.md)
- [Deployment and save migration](docs/DEPLOYMENT.md) · [Validation](VALIDATION.md)
- [Original Minesweeper ideas](INITIAL_IDEAS.md)

[MIT License](LICENSE) © 2026 Hendra Saputra.
