# Deployment and domain migration

- Repository: https://github.com/hendrasaputra/minipuzzles
- Workflow: https://github.com/hendrasaputra/minipuzzles/actions/workflows/pages.yml
- Pages settings: https://github.com/hendrasaputra/minipuzzles/settings/pages
- New domain: `puzzles.hensap.id`
- Hub route: `/`
- Petals route: `/games/petals/`

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
