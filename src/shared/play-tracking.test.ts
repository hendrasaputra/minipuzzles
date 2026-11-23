import { describe, it, expect, vi } from 'vitest';
import { PlayTracker } from './play-tracking';

// Plain event targets stand in for the page; the tracker only listens for visibility and pagehide.
vi.stubGlobal('window', new EventTarget());
vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));

describe('PlayTracker', () => {
  it('sends one start, counts stuck signals, and quits once before finishing late', () => {
    const sent: [string, Record<string, string | number>][] = [];
    const t = new PlayTracker('demo', (e, d) => sent.push([e, d]));
    t.start(3); t.count('undos'); t.count('undos'); t.count('hints');
    window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide'));
    t.finish({ moves: 12 }); t.finish();
    expect(sent.map(([e]) => e)).toEqual(['level_start', 'level_quit', 'level_finish']);
    expect(sent[2][1]).toMatchObject({ game: 'demo', level: '3', undos: 2, hints: 1, restarts: 0, returned: 1, moves: 12 });
  });
  it('ends an unfinished level as a quit when another level starts', () => {
    const sent: string[] = [];
    const t = new PlayTracker('demo', e => sent.push(e));
    t.start('a'); t.start('b'); t.finish();
    expect(sent).toEqual(['level_start', 'level_quit', 'level_start', 'level_finish']);
  });
});
