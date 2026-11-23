/**
 * Cookie-free play events sent to Umami (the script is added to production pages by vite.config.ts).
 * Without that script (local dev, ad blockers) every call is a quiet no-op.
 *
 * One level session per `start`:
 * - `level_start`  {game, level}
 * - `level_finish` {game, level, seconds, restarts, undos, hints, fails, ...extra}
 * - `level_quit`   same fields, sent once per session when the page is hidden (or another level
 *   starts) with the level unfinished. The session stays open: if the player comes back and
 *   solves it, `level_finish` still follows with `returned: 1`, so quits are an upper bound.
 * Restarts, undos, hints and fails are counted, not sent one by one, to keep event volume low.
 */
type Data = Record<string, string | number>;
interface Umami { track(event: string, data?: Data): unknown }
declare global { interface Window { umami?: Umami } }

const pending: [string, Data][] = [];
let waiting = 0;
function send(event: string, data: Data) {
  if (window.umami) {
    // Earlier held events go first so a level's start never arrives after its finish.
    for (const [e, d] of pending.splice(0)) window.umami.track(e, d);
    window.umami.track(event, data);
    return;
  }
  // The tracker loads deferred; hold early events for up to ten seconds, then drop them.
  pending.push([event, data]);
  if (waiting) return;
  let tries = 0;
  waiting = window.setInterval(() => {
    if (window.umami) for (const [e, d] of pending.splice(0)) window.umami.track(e, d);
    if (window.umami || ++tries >= 20) { pending.length = 0; window.clearInterval(waiting); waiting = 0; }
  }, 500);
}

export type Counter = 'restarts' | 'undos' | 'hints' | 'fails';

export class PlayTracker {
  private level = '';
  private open = false;
  private quitSent = false;
  private activeMs = 0;
  private since = 0;
  private counts: Record<Counter, number> = { restarts: 0, undos: 0, hints: 0, fails: 0 };

  constructor(private readonly game: string, private readonly sink: (event: string, data: Data) => void = send) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.pause(); this.quit(); } else if (this.open) this.since = performance.now();
    });
    window.addEventListener('pagehide', () => { this.pause(); this.quit(); });
  }

  /** A level is shown and playable. Starting another level first ends the unfinished one as a quit. */
  start(level: string | number) {
    this.pause(); this.quit();
    this.level = String(level); this.open = true; this.quitSent = false; this.activeMs = 0; this.since = performance.now();
    this.counts = { restarts: 0, undos: 0, hints: 0, fails: 0 };
    this.sink('level_start', { game: this.game, level: this.level });
  }

  count(what: Counter) { if (this.open) this.counts[what]++; }

  /** The level is solved. `extra` holds game-specific numbers such as moves. */
  finish(extra: Data = {}) {
    if (!this.open) return;
    this.pause();
    this.sink('level_finish', { ...this.summary(), ...(this.quitSent ? { returned: 1 } : {}), ...extra });
    this.open = false;
  }

  private summary(): Data { return { game: this.game, level: this.level, seconds: Math.round(this.activeMs / 1000), ...this.counts }; }
  private pause() { if (this.open && this.since) { this.activeMs += performance.now() - this.since; this.since = 0; } }
  private quit() {
    if (!this.open || this.quitSent) return;
    this.sink('level_quit', this.summary());
    this.quitSent = true;
  }
}
