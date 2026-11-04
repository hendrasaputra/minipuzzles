# Pilot sprites

These transparent strips adapt PixelFX revision [a841596](https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e). They use the effect-only exporter at 12 fps and seed 7. Eight sampled frames are scaled to half size with nearest-neighbor sampling. Playback takes 0.6 seconds and fades out. No character art or gallery font is included.

| Strip | Source effect | Frame indices |
| --- | --- | --- |
| mine.png | explosions/dirt-explosion | 1, 3, 5, 7, 10, 14, 18, 23 |
| splash.png | water/splash | 3, 4, 5, 6, 8, 11, 14, 18 |
| landing.png | impacts/heavy-landing | 1, 2, 3, 4, 6, 8, 11, 15 |

See LICENSE and UPSTREAM_NOTICE.md for attribution.

Bridge Islands uses `confetti.png` from `ui/confetti` at the same revision and export settings. The strip keeps frames 2 through 40 at every second frame, at their original size.
