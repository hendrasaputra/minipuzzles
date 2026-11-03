import { restoreGame, startGame, type Config, type Game } from './engine';

export interface Session {
  game: Game;
  active: number;
  elapsed: number;
  exploded: boolean;
  action: 'reveal' | 'flag' | 'inspect';
  levelId: string | null;
  completed: string[];
}

const MAX_ELAPSED = 7 * 24 * 60 * 60;

/** Versionless saves are the original Classic/Layered envelope. */
export function readSession(raw: string | null, knownLevelIds: readonly string[]): Session | null {
  if (!raw) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
    const data = saved as Record<string, unknown>;
    if (data.version !== undefined && data.version !== 2) return null;
    const game = restoreGame(data.game);
    if (!game) return null;
    const known = new Set(knownLevelIds);
    return {
      game,
      active: typeof data.active === 'number' && Number.isInteger(data.active)
        ? Math.max(0, Math.min(game.config.floors - 1, data.active)) : 0,
      elapsed: typeof data.elapsed === 'number' && Number.isFinite(data.elapsed)
        ? Math.max(0, Math.min(MAX_ELAPSED, Math.floor(data.elapsed))) : 0,
      exploded: data.exploded === true,
      action: data.action === 'flag' || data.action === 'inspect' ? data.action : 'reveal',
      levelId: typeof data.levelId === 'string' && known.has(data.levelId) ? data.levelId : null,
      completed: Array.isArray(data.completed)
        ? [...new Set(data.completed.filter((id): id is string => typeof id === 'string' && known.has(id)))] : [],
    };
  } catch {
    return null;
  }
}

export function writeSession(session: Session): string {
  return JSON.stringify({ ...session, version: 2 });
}


export const MAX_SAVE_BYTES = 1024 * 1024;

/** Imports accept the same validated v1/v2 envelopes as local saves, with a file-size bound. */
export function readTransfer(raw: string, levels: readonly { id: string; config: Config }[]): Session | null {
  if (new TextEncoder().encode(raw).byteLength > MAX_SAVE_BYTES) return null;
  const session = readSession(raw, levels.map(level => level.id));
  if (!session) return null;
  const level = levels.find(level => level.id === session.levelId);
  if (level && !matchesLevel(session.game.config, level.config)) return null;
  return session;
}


export function matchesLevel(config: Config, level: Config): boolean {
  const expected = startGame(level).config;
  const signature = (value: Config) => JSON.stringify([value.width, value.height, value.mines, value.floors,
    value.seed, value.mode, value.vertical, value.generatorVersion, value.firstReveal]);
  return signature(config) === signature(expected);
}
