export interface Point { x: number; y: number }
export const VIEW = { width: 480, height: 400, originX: 240, originY: 90, halfTileX: 34, halfTileY: 17, heightUnit: 32 };

export function project(x: number, y: number, z = 0): Point {
  return { x: VIEW.originX + (x - y) * VIEW.halfTileX, y: VIEW.originY + (x + y) * VIEW.halfTileY - z * VIEW.heightUnit };
}
export function unproject(point: Point, z = 0): Point {
  const across = (point.x - VIEW.originX) / VIEW.halfTileX;
  const along = (point.y - VIEW.originY + z * VIEW.heightUnit) / VIEW.halfTileY;
  return { x: (across + along) / 2, y: (along - across) / 2 };
}
export function canvasPoint(client: Point, rect: { left: number; top: number; width: number; height: number }): Point {
  const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
  return { x: (client.x - rect.left - (rect.width - VIEW.width * scale) / 2) / scale,
    y: (client.y - rect.top - (rect.height - VIEW.height * scale) / 2) / scale };
}
export function inside(point: Point, polygon: readonly Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
export function axisDelta(axis: 'h' | 'v', delta: Point): number {
  const dx = axis === 'h' ? VIEW.halfTileX : -VIEW.halfTileX;
  return (delta.x * dx + delta.y * VIEW.halfTileY) / (dx * dx + VIEW.halfTileY ** 2);
}
export function nearestSlide(value: number, allowed: readonly number[]): number {
  return allowed.reduce((best, next) => Math.abs(next - value) < Math.abs(best - value) ? next : best, 0);
}

/** Drag state uses CSS-pixel slop but projects movement onto the car's world axis. */
export class SlideGesture {
  private press: { id: string; axis: 'h' | 'v'; start: Point; client: Point; allowed: number[]; dragged: boolean; value: number } | null = null;
  begin(id: string, axis: 'h' | 'v', start: Point, client: Point, allowed: number[]): void {
    this.press = { id, axis, start, client, allowed: [0, ...allowed], dragged: false, value: 0 };
  }
  move(point: Point, client: Point): void {
    const p = this.press;
    if (!p) return;
    if (Math.hypot(client.x - p.client.x, client.y - p.client.y) > 8) p.dragged = true;
    if (!p.dragged) return;
    const desired = axisDelta(p.axis, { x: point.x - p.start.x, y: point.y - p.start.y });
    p.value = Math.max(Math.min(...p.allowed), Math.min(Math.max(...p.allowed), desired));
  }
  get preview(): { id: string; delta: number } | null {
    return this.press ? { id: this.press.id, delta: this.press.value } : null;
  }
  finish(): { id: string; delta: number } | null {
    const p = this.press; this.press = null;
    if (!p?.dragged) return null;
    const delta = nearestSlide(p.value, p.allowed);
    return delta ? { id: p.id, delta } : null;
  }
  cancel(): void { this.press = null; }
}
