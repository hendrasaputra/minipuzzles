export interface Point { x: number; y: number; z: number }
export interface View { yaw: number; tilt: number }
export interface Level { id: string; title: string; points: Point[] }
export interface Game { level: Level; history: View[] }

export const initialView: View = { yaw: Math.PI / 4, tilt: Math.atan2(18, 20) };
const alignmentAngle = .095;

export function createGame(level: Level): Game {
  return { level, history: [] };
}

export function currentGap(game: Game): [Point, Point] | undefined {
  const index = game.history.length;
  return index < game.level.points.length - 1
    ? [game.level.points[index], game.level.points[index + 1]]
    : undefined;
}

export function complete(game: Game): boolean {
  return !currentGap(game);
}

export function validView(view: unknown): view is View {
  if (!view || typeof view !== 'object') return false;
  const { yaw, tilt } = view as View;
  return Number.isFinite(yaw) && Math.abs(yaw) <= Math.PI
    && Number.isFinite(tilt) && tilt >= .35 - 1e-8 && tilt <= 1.25 + 1e-8;
}

export function angleDifference(target: number, current: number): number {
  const delta = target - current;
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

export function requiredView([from, to]: [Point, Point]): View {
  const x = to.x - from.x;
  const y = to.y - from.y;
  return { yaw: Math.atan2(x, y), tilt: Math.atan2(to.z - from.z, Math.hypot(x, y)) };
}

export function aligned(game: Game, view: View): boolean {
  const gap = currentGap(game);
  if (!gap || !validView(view)) return false;
  const target = requiredView(gap);
  // A gap projects to a point when it lies along the camera's view axis.
  const dot = Math.sin(view.tilt) * Math.sin(target.tilt)
    + Math.cos(view.tilt) * Math.cos(target.tilt) * Math.cos(view.yaw - target.yaw);
  return dot >= Math.cos(alignmentAngle);
}

export function join(game: Game, view: View): boolean {
  if (!aligned(game, view)) return false;
  game.history.push({ yaw: view.yaw, tilt: view.tilt });
  return true;
}

export function undo(game: Game): boolean {
  return game.history.pop() !== undefined;
}

export function hint(game: Game, view: View): string {
  const gap = currentGap(game);
  if (!gap) return 'Path complete!';
  if (aligned(game, view)) return 'The dots line up. Press Join.';
  const target = requiredView(gap);
  const yaw = angleDifference(target.yaw, view.yaw);
  const tilt = target.tilt - view.tilt;
  if (Math.abs(yaw) > .075) return yaw > 0 ? 'Turn left to bring the dots together.' : 'Turn right to bring the dots together.';
  return tilt > 0 ? 'Tilt up to bring the dots together.' : 'Tilt down to bring the dots together.';
}
