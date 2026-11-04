# Puzzles

Browser puzzle games you can play with touch or a keyboard.

**[Play at puzzles.hensap.id](https://puzzles.hensap.id/)**

Play **Petals** (Minesweeper), **Traffic Garden** (sliding cars), **Crate Garden** (crate pushing), **Crystal Light** (mirrors and animated lasers), **Water Garden** (flowing channels), and **Frosty Paths** (penguin sliding). All have rotatable 3D boards, touch and keyboard controls, sound, and local saves.

Every game offers fresh random puzzles at several difficulties. Petals uses board sizes and floor counts. The other games offer Easy, Medium, and Hard. Open Menu to start a random puzzle or choose an authored level where available.

Use **How to play** in each game menu for short animated examples.

**Marble Workshop** is the seventh game. Turn the tracks, then tap the marble or press **Roll**.

**Shadow Blocks** and **Picture Islands** join the collection. Their first levels guide you through the rules.

## Run locally

Use Node.js 22.12+, 24, or 26+. In macOS/Linux Terminal or Windows PowerShell:

```sh
npm ci
npm run dev
```

The homepage is the game library. Petals lives at `/games/petals/`; Traffic Garden at `/games/traffic-garden/`; Crate Garden at `/games/crate-garden/`; Crystal Light at `/games/crystal-light/`; Water Garden at `/games/water-garden/`; Frosty Paths at `/games/frosty-paths/`.

## Project guide

- [Development](docs/DEVELOPMENT.md) · [Petals gameplay](docs/GAMEPLAY.md) · [Traffic Garden](docs/TRAFFIC_GARDEN.md) · [Crate Garden](docs/CRATE_GARDEN.md) · [Crystal Light](docs/CRYSTAL_LIGHT.md) · [Water Garden](docs/WATER_GARDEN.md) · [Frosty Paths](docs/FROSTY_PATHS.md) · [Marble Workshop](docs/MARBLE_WORKSHOP.md) · [Shadow Blocks](docs/SHADOW_BLOCKS.md) · [Picture Islands](docs/PICTURE_ISLANDS.md)
- [Icon prompts and art workflow](docs/art/README.md)
- [Progress](TODO.md) · [Developer handoff](HANDOFF.md) · [Agent instructions](AGENTS.md)
- [Deployment and save migration](docs/DEPLOYMENT.md) · [Validation](VALIDATION.md)
- [Original Minesweeper ideas](INITIAL_IDEAS.md)

[MIT License](LICENSE) © 2026 Hendra Saputra.
