export interface Point { x: number; y: number }

/** A car follows its current screen-space axis after any camera rotation. */
export function projectedAxisDelta(axis: Point, delta: Point): number {
  const lengthSquared = axis.x ** 2 + axis.y ** 2;
  return lengthSquared < 1 ? 0 : (delta.x * axis.x + delta.y * axis.y) / lengthSquared;
}
export function nearestSlide(value: number, allowed: readonly number[]): number {
  return allowed.reduce((best, next) => Math.abs(next - value) < Math.abs(best - value) ? next : best, 0);
}

/** CSS-pixel slop is independent of camera zoom and device resolution. */
export class SlideGesture {
  private press: { id: string; axis: Point; start: Point; allowed: number[]; dragged: boolean; value: number; desired: number } | null = null;
  begin(id: string, axis: Point, start: Point, allowed: number[]): void {
    this.press = { id, axis, start, allowed: [0, ...allowed], dragged: false, value: 0, desired: 0 };
  }
  move(point: Point): void {
    const p = this.press;
    if (!p) return;
    const delta = { x: point.x - p.start.x, y: point.y - p.start.y };
    if (Math.hypot(delta.x, delta.y) > 8) p.dragged = true;
    if (!p.dragged) return;
    const desired = projectedAxisDelta(p.axis, delta);
    p.desired = desired;
    p.value = Math.max(Math.min(...p.allowed), Math.min(Math.max(...p.allowed), desired));
  }
  get preview(): { id: string; delta: number } | null {
    return this.press ? { id: this.press.id, delta: this.press.value } : null;
  }
  get blocked(): number {
    const press = this.press;
    return press?.dragged && press.value === 0 && Math.abs(press.desired) > .18
      ? Math.sign(press.desired) : 0;
  }
  finish(): { id: string; delta: number } | null {
    const p = this.press; this.press = null;
    if (!p?.dragged) return null;
    const delta = nearestSlide(p.value, p.allowed);
    return delta ? { id: p.id, delta } : null;
  }
  cancel(): void { this.press = null; }
}
