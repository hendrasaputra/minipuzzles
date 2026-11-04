# Deployment and domain migration

- Repository: https://github.com/hendrasaputra/minipuzzles
- Workflow: https://github.com/hendrasaputra/minipuzzles/actions/workflows/pages.yml
- Pages settings: https://github.com/hendrasaputra/minipuzzles/settings/pages
- New domain: `puzzles.hensap.id`
- Hub route: `/`
- Petals route: `/games/petals/`
- Traffic Garden route: `/games/traffic-garden/`
- Crate Garden route: `/games/crate-garden/`
- Crystal Light route: `/games/crystal-light/`
- Water Garden route: `/games/water-garden/`
- Frosty Paths route: `/games/frosty-paths/`

## DNS and Pages

The `hensap.id` DNS zone uses:

| Type | Name / Host | Target / Value | TTL |
| --- | --- | --- | --- |
| CNAME | `puzzles` | `hendrasaputra.github.io` | Default |

Use the hostname only, without `https://` or a repository path. A custom domain is configured through the repository's Pages settings/API; this Actions workflow does not use a CNAME file.

**Verified live, 3 November 2026:** `puzzles.hensap.id` passes DNS checks, has a trusted issued certificate, and enforces HTTPS. Both the hub and Petals return HTTP 200 with assets identical to the tested production build. The previous `mines.hensap.id` Pages binding has been replaced; no old-host alias/redirect is configured. Account-wide Pages settings are unchanged.

[GitHub custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain).

## Moving a saved game

Browser storage belongs to its origin, not its URL path or Git repository. Moving Petals from `/` to `/games/petals/` on the same host keeps its save and sound preference. Changing `mines.hensap.id` to `puzzles.hensap.id` cannot automatically read the old host's storage.

1. Before cutover, open Petals on the old host and use **Menu → Export save**.
2. On the new host, open Petals and use **Menu → Import save**.
3. Check the seed, floor, flags and lesson progress. Sound preference is separate; set it again if needed.

Files are limited to 1MiB and validate before replacing progress. If you did not export before cutover, do not clear the old site's browser data: it remains on the device, but recovery requires access to that old-origin storage. There is no automatic old-host redirect or cross-origin save migration.

## Builds

Pushes to `main` run `npm ci`, tests, TypeScript checking, the Vite multi-page build and Pages deployment. Pull requests run checks without deployment. Node.js 24 and pinned official Actions are used.

`dist/index.html` is the lightweight hub; `dist/games/petals/index.html` is the standalone game. Relative asset URLs support the custom-domain root and project subpaths. Deploy the complete `dist/` tree, not just its top-level HTML.

**4 November 2026 release:** d584e90 deployed successfully via Pages run 41743698825. Live browser checks confirmed all 21 generated icons loaded and Traffic Garden responds to input. Crate Garden and shared 3D rotation were subsequently published in 3e2eef4.

**4 November 2026 rotation release:** 3e2eef4 deployed successfully via Pages run 41749026138. Live checks verified all three game pages and rotating Crate/Traffic views with preserved progress. Crystal Light is the next local build and is not yet deployed.

**Crystal Light release:** 8bfeee8 deployed successfully via Pages run 41753843808 after explicit owner approval. Live first-light completion and four-game shelf checks pass. Animated lasers are included. Water Garden is the next local build.

**Animated Water Garden release:** 569cf93 deployed successfully via Pages run 41755490204. Live water effects, first-turn completion and five-game shelf checks pass. The shared MaterialMotion controller and laser refactor are included.

**Frosty Paths release:** 5420daf deployed successfully via Pages run 41758892888. Live checks verified six shelf links, 3D orbit, first-puzzle completion and saved win after refresh, with no console warnings/errors. Rotation, smooth slides, ice glints, snow and reduced-motion handling are retained. All six implemented games are now deployed.

Marble Workshop shipped in commit 34b1411 through Pages run 41782249698. The public shelf opens it as the seventh game. Mobile viewport checks covered tapping the marble, using Roll, and rotating after a win.

Shadow Blocks and Picture Islands shipped in commit 81dd22e. The public shelf has nine playable games. Both games open from the shelf with their guided first levels and examples.
