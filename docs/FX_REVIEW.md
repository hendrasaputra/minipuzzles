# Pixel effects pilot review

These browser captures use the same first levels at 390 × 844. The comparison build comes from the published 21-game release, commit 3149d6f. The updated build keeps the same puzzle outcomes.

| Pilot | Released board | Updated board | Effect frames |
| --- | --- | --- | --- |
| Petals mine | [Before](fx-review/petals-before.jpg) | [Dust at the triggered mine](fx-review/petals-after.jpg) | [Mine strip](../src/shared/fx/mine.png) |
| Water Balance pour | [Before](fx-review/water-before.jpg) | [Splash at the receiving surface](fx-review/water-after.jpg) | [Splash strip](../src/shared/fx/splash.png) |
| Rolling Stone contact | [Before](fx-review/stone-before.jpg) | [Upright landing sparks](fx-review/stone-after.jpg) | [Landing strip](../src/shared/fx/landing.png) |

The strips are transparent, effect-only exports sampled from the pinned PixelFX source. See [asset notes](../src/shared/fx/README.md) for the frame choices and upstream notices.

Petals still ends on the same mine and retry restores the authored opening. Water Balance still transfers 4 L from A to B and undo restores 6 L in A. Rolling Stone still finishes upright after two east rolls. The visuals add short contact cues that follow each scene. The captures show single frames. Use the local games to compare motion.
