# Water Garden

Turn the channel tiles until water from the spring reaches every flower. Water crosses only between matching openings. Flowers drink from any side and stop the flow. Open ends simply stop water; there is no leak penalty or timer.

- Tap a channel to turn it clockwise once, or choose one from the selector and press Turn. The selector names its shape, position and current openings.
- Straight channels have two opposite openings; corners bend; branches split water in three directions. Some channels already align and a later garden includes a decoy.
- Keyboard: choose a channel and use Turn, or focus the board and press Enter/Space.
- Choose Rotate to orbit/tilt the camera. Pinch/scroll zooms and ↺ resets it. Choose Play to turn channels again. Camera motion never counts as a turn.
- Hint turns one channel along a shortest solution. Undo reverses any turn, including a win. Retry resets only the current garden. Menu lets you revisit all eight gardens and toggle shared sound.

Eight stable 5×5 to 7×7 gardens have shortest openings of 1,2,3,3,4,5,6,7 clockwise turns. The first teaches a single connection; later gardens branch to two or three flowers. Wet channels turn blue and watered flowers brighten. Pure rules traverse reciprocal connections with a visited set, so cyclic routes terminate. The BFS hint solver explores at most 50,000 states and merges equivalent straight-channel orientations.

Local saves use `puzzles-water-garden-v1` on the browser origin. Reads validate/replay channel IDs from the original level rather than trusting saved positions or win flags. Selection and completed IDs persist; shared mute uses the existing preference. Saves are bounded at 5,000 turns / 1MiB, with a visible warning if saving fails. There is no file transfer UI yet.

Three.js rendering remains independent of the puzzle engine. No dependencies were added. Water Garden is currently available in the local build; live release 8bfeee8 has the previous four games.

Water is animated with moving foam/droplets on connected routes, a shimmering turquoise surface, and expanding ripples/bubbles at the spring. Effects stop in hidden tabs and stay still with the system’s reduced-motion preference. They never affect channel picking or puzzle turns.
