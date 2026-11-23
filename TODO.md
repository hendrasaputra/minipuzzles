# Puzzles progress

Updated: 4 November 2026. Check items only after the relevant implementation and verification exist.

## Current milestone: collection structure

- [x] Define a stable catalog with Petals plus 20 planned puzzle concepts.
- [x] Keep planned entries non-navigable and avoid missing image URLs.
- [x] Save a shared icon style contract and 21 editable draft GPT prompts.
- [x] Add repository instructions and developer handoff notes.
- [x] Finish the Puzzles selection page and touch-friendly interim icon shelf.
- [x] Move Petals into its own game module and reusable helpers into `src/shared/`.
- [x] Configure Vite to build the hub and standalone Petals page.
- [x] Verify hub → Petals → hub navigation and direct game entry.
- [x] Verify save/audio compatibility after the move and Petals rename.
- [x] Provide validated save export/import before domain cutover.
- [x] Run the final tests, production build and browser checks; record results.

- [x] Rename the GitHub repository to `hendrasaputra/minipuzzles` and update its remote/links.

- [x] Review Pixel Plays as an alternative and record the per-game renderer decision.

## Hosting migration

- [x] Verify `puzzles.hensap.id` CNAME to `hendrasaputra.github.io`.
- [x] Deploy the verified hub build and attach the new Pages custom domain.
- [x] Confirm trusted HTTPS, enforcement, and live hub/game assets.
- [x] Document that `mines.hensap.id` saves need export/import across origins.

## GPT artwork: first family

- [x] Generate and select the Petals reference icon (v03, agent technical/art review).
- [x] Record exact generation/edit prompts, reference inputs and revision notes.
- [x] Generate the other 20 icons individually against the Petals reference.
- [x] Review actual master size and 128/64px masked renders on light/dark backgrounds.
- [x] Add reviewed runtime assets and catalog URLs; verify no broken requests.
- [x] Owner explicitly approved publication of the icon batch and Traffic Garden on 4 November 2026.
- [ ] Collect owner feedback and create targeted v02/v04 revisions if requested.

- [x] Adopt Iconfactory-inspired skeuomorphic craft in the saved icon direction.

## Traffic Garden

- [x] Implement independent sliding-car rules, undo, shortest-slide solver and seeded solvable puzzles.
- [x] Add Easy, Medium and Hard, fresh random seeds, exact retry and solver hints.
- [x] Build a tactile rotatable Three.js garden with drag, large buttons and keyboard controls.
- [x] Validate local saves by replaying legal history; use a separate game key and shared mute preference.
- [x] Add standalone Vite entry and a real playable shelf link.
- [x] Run the initial 152 tests, production build and browser checks; see VALIDATION.md.
- [x] Verify the approved Traffic Garden/icon deployment live (d584e90, successful Pages workflow).
- [ ] Check actual iOS/Android touch gestures and speaker loudness.
- [ ] Expand the 13 verified layout families if repeated play needs more variety.

## Crate Garden

- [x] Add pure push-only Sokoban rules, undo and bounded shortest-step solver.
- [x] Create eight stable solver-verified gardens (6×6 and 7×7).
- [x] Add an original Three.js garden with swipe/tap, large direction buttons and keyboard play.
- [x] Save move history, current garden and completed gardens under a separate validated key.
- [x] Add standalone Vite entry and playable shelf link in the local build.
- [x] Complete all eight gardens in browser, check saved completion/undo, responsive layouts, tests and build.
- [x] Publish Crate Garden with the shared rotation update (3e2eef4, verified live).
- [ ] Test physical iOS/Android input and audio.

## Later games

The collection now has 21 playable games.

## Shared 3D rotation

- [x] Require rotatable 3D boards for all future games.
- [x] Replace the fixed Traffic/Crate Canvas views with real Three.js geometry.
- [x] Add shared Play/Rotate modes, orbit/tilt, pinch/wheel zoom, keyboard camera control and reset.
- [x] Keep puzzle gestures separate and update direction arrows for the current camera.
- [x] Verify rotated car dragging and gardener swipes, unchanged progress during orbit, Petals compatibility, tests and build.
- [x] Release Crate Garden and rotation for all three games (Pages run 41749026138).
- [ ] Check rotation, pinch and frame cost on physical phones.

## Crystal Light

- [x] Add pure mirror reflection/beam tracing, walls, transparent target crystals and bounded loop detection.
- [x] Create eight stable solver-verified lights with shortest solutions of 1–5 turns.
- [x] Add brass mirrors, faceted lavender crystals, warm beams and the shared 3D camera.
- [x] Support mirror taps, dropdown/Turn controls, keyboard, undo, hints and retry.
- [x] Add validated local replay saves and completed-light tracking under a separate key.
- [x] Verify all eight completions, reload/undo, rotation safety, responsive layouts, 222 tests and production build.
- [x] Animate laser glow, traveling pulses and particles with hidden-tab/reduced-motion handling.
- [x] Publish Crystal Light and laser effects after explicit owner approval (8bfeee8; verified live).
- [ ] Test touch/pinch and GPU cost on physical phones.

## Water Garden

- [x] Add pure clockwise channel rotation, reciprocal-port flow, terminal flowers and bounded cyclic flow.
- [x] Create eight stable solvable gardens, including branches and a decoy channel.
- [x] Add 3D recessed channels, blue water, spring, flower pots and the shared rotation camera.
- [x] Support channel taps, dropdown/Turn with opening directions, keyboard, hints, undo and retry.
- [x] Validate local replay saves and preserve completed gardens under a separate key.
- [x] Complete all eight gardens in-browser; verify reload, rotation safety, responsive layouts, 261 tests and build.
- [x] Publish and verify animated Water Garden (569cf93; successful Pages run 41755490204).
- [ ] Test physical-phone input and GPU performance.

## Material effects

- [x] Animate connected water with foam/droplets, spring ripples/bubbles and surface shimmer.
- [x] Share the capped, visibility-aware, reduced-motion MaterialMotion controller with laser effects.
- [x] Require fitting water/laser/fire/ice effects as those materials appear in future games.
- [x] Verify 269 tests, production build, route changes and decorative picking safety.

## Frosty Paths

- [x] Add slide-until-blocked rules, fish collection, home-stop win, undo and bounded shortest-slide hints.
- [x] Create eight stable paths with 1–3 fish and verified solutions from 2 to 11 slides.
- [x] Add friendly penguin, snow-capped rocks, ice, fish and home beacon with full 3D rotation.
- [x] Animate visual slides, ice glints and drifting snow through MaterialMotion.
- [x] Add swipe/tap, large direction buttons, camera-relative glyphs and keyboard play.
- [x] Validate separate replay saves and completed paths.
- [x] Verify all eight paths, saved win/undo/fish restoration, rotated swipe, responsive fit, 301 tests and build.
- [x] Publish and verify Frosty Paths (5420daf, Pages run 41758892888), retaining rotation, eased slides, ice glints and snow.
- [ ] Check physical-phone input, GPU and battery cost.

## Random puzzle replayability

- [x] Audit Petals size and floor presets plus Traffic Garden difficulty bands.
- [x] Add seeded Easy, Medium, and Hard puzzles to Crate Garden, Crystal Light, Water Garden, and Frosty Paths.
- [x] Keep authored campaigns and compatible save keys, with random wins separate from campaign progress.

## Easier game instructions

- [x] Use plain descriptions and labels across the game shelf and games.
- [x] Replace long in-game instructions with animated examples and short captions.
- [x] Check all seven help panels at 320 px.

## Marble Workshop

- [x] Add eight levels and three seeded difficulty tiers.
- [x] Add turn, roll, hint, undo, retry, and replay saves.
- [x] Keep 3D camera controls and animate the marble through track curves with particles.
- [x] Add plain labels and visual help.
- [x] Publish Marble Workshop as game seven with tap-to-roll and the Roll button.

## Next two games

- [x] Build Shadow Blocks with two shadow targets, a block budget, 3D rotation, and seeded puzzles.
- [x] Build Picture Islands with unique solutions, 3D rotation, a flat keyboard grid, and seeded puzzles.
- [x] Verify both local shelf links, first-level wins, save restore, and mobile layouts.
- [ ] Review Shadow Blocks and Picture Islands.
- [x] Make Shadow Blocks easier to learn with a guided first level and labeled row and column shadows.
- [x] Add a worked clue example and guided first picture to Picture Islands.
- [x] Publish Shadow Blocks and Picture Islands with their updated guides.
- [x] Build Pocket Railroads with eight levels, seeded difficulty, 3D trains, and a visual guide.
- [x] Verify wrong-route recovery, delivery, reload, and the local shelf link.
- [ ] Review Pocket Railroads.
- [x] Publish Pocket Railroads and verify its live shelf link and guide.
- [x] Build Robot Garden with a rotatable board, command queue, and worked example.
- [x] Verify blocked runs, restored commands, the first dock win, and the local shelf link.
- [ ] Review Robot Garden.
- [x] Publish Robot Garden and verify its shelf link and worked example.
- [x] Build Bridge Islands with a rotatable 3D board and a worked bridge example.
- [x] Verify first-level taps, saved completion, rotation, and the local shelf link.
- [ ] Review Bridge Islands.
- [x] Publish Bridge Islands and verify its live shelf link and example.
- [x] Build Flip Garden and Tiny Tangrams with rotatable boards, worked examples, and seeded puzzles.
- [x] Verify both first-level wins, saved completion, and local shelf links.
- [ ] Review Flip Garden and Tiny Tangrams.

## Full local collection

- [x] Build Color Stacks, Garden Sudoku, Rolling Stone, Stepping Stones, Water Balance, Perspective Paths, and Pocket Escape.
- [x] Open all 21 games from the local shelf.
- [x] Verify the seven new first-level wins, visual examples, rotations, and save restore.
- [x] Verify the seven new Hard modes at 320 px.
- [ ] Review the full collection locally.
- [x] Publish all 21 games and verify every live route.

## Pixel effects rollout

- [x] Export and review the three PixelFX pilots.
- [x] Compare the pilots against the released build.
- [x] Add action feedback and physical motion across all 21 games.
- [x] Run the full suite, build, and browser regression checks.
- [x] Review touch, rotation, and animation performance on a physical phone.
- [ ] Prototype tap to play and two-finger orbit in games that use one-finger swipes.
- [x] Make Bridge Islands labels readable and show the goal on the board.
- [x] Add animated blue ocean waves and water-height bridge splashes.
- [x] Add shoreline spray to every Bridge Islands island and a one-shot win celebration.
- [x] Add Petals Volume with three solver-verified lessons and random puzzles.
- [x] Add a local two-finger orbit prototype to Crate Garden.
- [ ] Try the Crate Garden prototype on a physical phone.
- [x] Verify two-finger rotation on a physical phone.
- [x] Add a touch hint and prototype a grainier Crate Garden render.
- [ ] Review the pixel finish and gesture hint on a physical phone.
- [x] Give Crate Garden distinct pixel textures and build out the terrain and gardener.
- [x] Give all 21 boards distinct pixel materials, setting details, and game-specific sound.
- [ ] Review the full art pass and listen to the new cues on a physical phone.
- [x] Restore the earlier board look across the collection and tune action motion and particles.
- [x] Add two-finger camera rotation and a touch hint across all 21 games.
- [ ] Check two-finger gestures across the collection on a physical phone.
- [x] Hide Play and Rotate on touch-first devices while keeping the hint and camera reset.
- [x] Prototype the Polyfork Ground Disc Signal in Pocket Railroads.
- [ ] Review the signal on a physical phone before expanding the asset trial.
- [x] Add attributed Polyfork props to Crate Garden, Crystal Light, and Bridge Islands.
- [ ] Review the three Polyfork props on a physical phone.
- [x] Share the game page base styles in `src/shared/game-base.css`, fix the blue back arrow and match the Petals header.
- [x] On touch-first screens, hide list controls that the board already covers (9 games). Shadow Blocks and Tiny Tangrams keep theirs because removing blocks and choosing or turning pieces need them.
- [x] Retire the two-finger tip after the player has learned it, show Traffic Garden's fewest moves only after a win, add a win banner, tighten the board fit and compact the hub on phones.
- [ ] On a physical phone, check the hidden list controls, the win banner and that the tighter board fit keeps edge props in view.
- [x] Shadow Blocks: hold a square (or right-click, or press Delete) to remove a block. Tiny Tangrams: a touch piece tray, tap a placed piece to choose it, tap again to turn it, hold to lift it. Both now hide their list rows on touch.
- [x] Add generated zen background music (`src/shared/ambient.ts`): Garden, Water or Night mood in each game's own key, a Music row in every menu (`puzzles-music`, follows Sound until chosen), suspended when off or hidden.
- [ ] Listen to the music on a physical phone: volume against action sounds, battery feel, and iOS silent-switch behavior.
- [x] iPhone pass: safe-area padding (notch, Dynamic Island, home indicator), ambient audio session, Sound and Music switches at the top of menus, home-screen icon and manifest, edge-on Petals view for large boards on portrait phones (tiles about 38 px instead of 27 px), larger board labels on small views, goal line under the board on phones, no sticky hover on the hub.
- [ ] On a physical iPhone: check landscape insets, Add to Home Screen, the standalone app's status bar, and the edge-on Petals view.
- [x] Help rework: animated finger drawings for each touch action (`gestureDrawing` in `src/shared/game-guide.ts`), touch-first help text with an "Other controls" line for keyboard, mouse and list controls, one shared camera step, How to play opening on a player's first visit, and a finger mark on the first level's next target (`MiniScene.showFinger`). Traffic Garden has no fixed levels, so its finger guides Easy puzzles until the first win (`puzzles-traffic-garden-first-win`). Tiny Tangrams now places the chosen piece wherever it fits under a tap, which touch players needed for level 1's second triangle.
- [ ] On a physical iPhone: watch a first visit to a few games (help opens once, the finger lands on the right object at every camera angle).

## Game 22: Garden Keys (working title)

A tile maze in the style of the 1990 Windows game Chip's Challenge. It uses the same kinds of mechanics, set in our garden style. The name, characters, art, sounds and levels are our own; none are copied from the original. Folder `src/games/garden-keys/`, page `games/garden-keys/`.

**What carries over**

- Collect every seed to open the gate, then reach the burrow. In the original you collect chips to open the socket, then reach the exit.
- Keys and doors in four colours. Blue, red and yellow keys are used up; the green key is kept.
- Four kinds of boots: swim ring for water, clay clogs for fire, ice spikes for ice, grip soles for conveyors. A thief tile takes them all.
- Hazards: water and fire kill you without the right boots. Ice keeps you sliding, and ice corners turn you. Conveyors push you along. A bomb destroys whatever moves onto it.
- Pushable crates. A crate pushed into water fills it and leaves mud, and stepping on mud turns it to floor. Monsters can't cross gravel.
- Wall tiles:
  - hidden walls;
  - fake walls that vanish when touched;
  - walls that rise after you step off them;
  - walls switched by the green button.
- Buttons:
  - blue turns the tanks around;
  - brown opens a trap;
  - red starts a clone machine.
- Teleports, hint tiles and an optional timer.
- Monsters that follow fixed rules:
  - beetle: keeps the wall on its left;
  - firefly: turns right at walls;
  - bouncing ball: reverses at walls;
  - tank: drives straight until a blue button turns it;
  - dragonfly: turns left at walls;
  - snapper: chases you;
  - newt: keeps the wall on its right.
- Left out for now:
  - The original's random monsters and random conveyors. Add them later as seeded versions only, so every level can still be tested.
  - Level passwords, because saves already remember progress.

**Plan**

- [x] Rules in `src/games/garden-keys/engine.ts` (no DOM, rendering or storage):
  - [x] A deterministic tick engine. One tick is one step for you or a monster, so the same moves always give the same result.
  - [x] An ASCII level format; the legend is at the top of `engine.ts`.
  - [x] Every tile and monster listed above, plus death and win states.
  - [x] Tests for each tile and monster rule (23 tests in `engine.test.ts`).
  - [x] Undo goes back to before your last input, including a whole slide.
  - [x] Replay rebuilds a game from its list of inputs.
- [x] Two speeds:
  - [x] Engine side: `step` runs one tick (classic), `act` runs one calm action and finishes any slide, and the timer counts only when `timed` is on.
  - [x] UI: **Classic** runs ticks on a timer, as in the original, and you can hold a direction to keep moving.
  - [x] UI: **Calm** moves the world only when you do, with a Wait button and no timer. This is the default on touch screens.
- [x] Levels in `src/games/garden-keys/levels.ts`:
  - [x] Twelve original stable levels: First Seeds, Colored Doors, Wet and Hot, Ice Rink, Moving Paths, Crate Bridges, Beetle Walk, Switch Walls, Traps and Clones, Teleports, Thief in the Walls, Grand Garden.
  - [x] Ice Rink and Moving Paths came from a seeded search that picked the layout with the longest slide-heavy solution. The other ten are hand-drawn.
  - [x] A recorded solution for each level, 12 to 64 moves. Tests replay each one in calm mode and again as classic ticks with the timer on.
  - [x] Classic time limits of 40 to 70 seconds: double the recorded solution's time plus 30 seconds, rounded up to 10.
  - [x] A test shows Wet and Hot can't be finished without the swim ring.
  - [x] A breadth-first solver (`solver.ts`) finds the fewest calm moves, including waits for monsters. It found eleven of the recorded solutions. Traps and Clones has too many crate positions to search in time, so its recorded solution is hand-written and verified by replay.
  - [x] Hint follows the level's recorded route, so it answers at once on every board. It only runs the solver (up to 20,000 states) after you leave that route; on big boards it may then say there is no hint.
  - [x] Levels 13–50 (23 November 2026), in four acts. They were designed with a checker in the session scratchpad that replays or searches each level:
    - 13–22, one idea deeper each: Key Thrift, Grip Soles, Steady Spikes, Firefly Ring, Three Ponds, Newt Halls, Crate Blasting, One-Way Rooms, Secret Hedges, Snapper Shelter.
    - 23–32, two ideas at once: Carry the Key, Belt Ring, Snapper Bait, Dragonfly Pond, Newt Switch, Skating Crates, Firefly Field, Crate Maker, Crate Relay, Beetle Box.
    - 33–41, three or more ideas: Thief's Toll, Bomb Orchard, Popup Presses, Belt and Tank, Slippery Post, Crate Post, Belt Ferry, Trap Keeper, Garden Gauntlet.
    - 42–50, large gardens up to 15×13: Belt Factory, Bomb Foundry, Flooded Orchard, Teleport Ruins, Switch Garden, Ice Palace, Monster Zoo, Hedge Maze, Grand Tour.
    - Every level replays its recorded solution (29 to 181 moves) in calm and classic within its time limit (50 to 130 seconds).
  - [x] Grip soles, ice spikes, bombs, popup walls, newts, fireflies, dragonflies and snappers now all appear in levels.
  - [x] Engine fix: the player can no longer push a cloner's template crate off from the side (test added). Levels 1–12 were unaffected.
  - [ ] Play each level by hand. The solver proves they can be won, not that they are fun or fair. Watch for: Crate Maker (141 moves of repeated trips), Hedge Maze (181 moves with many waits), and difficulty order within acts, which follows how many ideas combine rather than move count. The finale, Grand Tour, is 90 moves.
  - [ ] Some rooms in Belt Factory, Ice Palace and Grand Tour came from a random layout search and look irregular. Redraw them if they read badly.
- [x] Scene in `scene.ts`, built on MiniScene:
  - [x] Rotatable 3D board with distinct shapes for every square, item, crate and monster type.
  - [x] Steps are tweened one square at a time, and calm slides play out square by square.
  - [x] Flickering fire, bobbing water, moving conveyor arrows and spinning teleports through MaterialMotion, plus sparkles on pickups and on losing.
  - [ ] Camera that follows you on big boards. The largest level is now 15×13. It fits at 375 px but squares are small; pinch zoom helps. Revisit after a phone playthrough.
- [x] Controls and display in `main.ts`:
  - [x] Swipe or tap the next square, five large buttons (four directions plus Wait in calm), and arrow keys, WASD and Space.
  - [x] Direction glyphs follow the camera.
  - [x] Inventory strip for keys and boots, seeds left, and a countdown in classic.
  - [x] Calm has Undo, Hint and Wait; classic hides them. Classic's clock starts on your first move and pauses while the menu is open.
  - [x] Holding a direction keeps walking in classic.
- [x] Saves under `puzzles-garden-keys-v1`: level, speed, every tick's input, completed levels and best times. Loading replays the inputs, and saves with inputs after a game ended are rejected (`storage.test.ts`).
- [x] Shelf and help:
  - [x] Catalog entry (game 22, monogram GK, no icon yet) and the Vite page `games/garden-keys/`.
  - [x] Its own action sound and a Garden music mood in F.
  - [x] Touch-first How to play, opening on the first visit.
  - [x] A level 1 finger that follows one solved route.
- [x] Icon v01 (`public/icons/garden-keys.png`): a Three.js render, because there was no GPT Image tool. It shows hedges, a blush door, a brass key, a burrow and a seed on the shelf's peach tile. Prompt, source, review sheet and assets entry are in `docs/art/`.
- [x] Generate matching GPT Image Garden Keys v02 with the full 22-icon refresh; original procedural v01 preserved. Owner aesthetic review remains possible.
- [x] Browser checks on the local production build:
  - [x] Levels 1 and 4 won by keyboard in calm.
  - [x] Classic timer counts down.
  - [x] Grand Garden renders.
  - [x] At 375 px with touch: How to play opens on the first visit, calm is the default, the finger shows, and there is no sideways scroll.
- [ ] Play every level by hand on a phone, in both speeds, and check the monster timing feels fair.
- [ ] Publish only after the owner approves.
# Marketing image campaign — 23 November 2026

- [x] Read `AGENTS.md` and `docs/marketing/social-kit.md` in full; ground artwork in the 22 catalog entries and real icons.
- [x] Generate and preserve 27 original GPT Image artworks, exact prompts and versioned reviews in `docs/marketing/creatives/v01/`.
- [x] Export 36 posting PNGs: 22 game spotlights, winter variant, two launch images, eight carousel slides and three Story images.
- [x] Verify image decoding/dimensions and all-22 coverage in both spotlights and carousel; visually inspect the full contact sheet and representative full-size layouts.
- [x] Run the production build successfully after creating the image package.
- [x] Capture real stills for all 22 games with local Playwright: 1080×1920 portrait, 1600×1000 desktop, raw boards and 1080×1350 captioned gameplay posts; see `docs/marketing/creatives/v01/captures/README.md`.
- [x] Check all 22 hub icons/links, game return navigation and horizontal layout at 375px and 1600px; 564 tests across 69 files passed.
- [x] Refresh all 22 game icons and the installable app icon; preserve originals, exact prompts and hashes, review at 128/64px, and rebuild the campaign carousel.
- [ ] Record board-turning and final-solving-move video clips separately from the still images.
- [ ] Check the live URL on a phone and add platform-native links/poll stickers when posting. Nothing was published by this image task.


# Play analytics — 23 November 2026

- [x] Cloudflare Web Analytics on every page (page views).
- [x] Shared `PlayTracker` and Umami hook; all 22 games send level start, finish and quit with restart, undo, hint and fail counts.
- [x] Umami website ID added to `vite.config.ts` and deployed.
- [ ] Confirm play events show in the Umami dashboard (Events tab) after real visits.
- [ ] After a few weeks, review finish and quit rates per level and pick the levels to rework.
