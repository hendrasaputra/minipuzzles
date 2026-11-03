export interface TileHit { floor: number; index: number }
export type GestureAction =
  | { type: 'tap' | 'flag'; tile: TileHit }
  | { type: 'rotate'; delta: number }
  | { type: 'zoom'; ratio: number };

/** Pointer state stays independent of WebGL so interrupted touch sequences are testable. */
export class BoardGesture {
  private pointers = new Map<number, { x: number; y: number }>();
  private press: { id: number; x: number; y: number; tile?: TileHit; dragged: boolean } | null = null;
  private pinch = 0;
  private multiTouch = false;

  down(id: number, x: number, y: number, button: number, tile?: TileHit): GestureAction | undefined {
    if (button !== 0 && button !== 2) return;
    this.pointers.set(id, { x, y });
    if (this.pointers.size > 1 || this.multiTouch) {
      this.multiTouch = true;
      this.press = null;
      this.pinch = this.distance();
      return;
    }
    this.press = button === 0 ? { id, x, y, tile, dragged: false } : null;
    if (button === 2 && tile) return { type: 'flag', tile };
  }

  move(id: number, x: number, y: number): GestureAction | undefined {
    const old = this.pointers.get(id);
    if (!old) return;
    this.pointers.set(id, { x, y });
    if (this.pointers.size > 1) {
      const distance = this.distance();
      const ratio = this.pinch > 0 ? distance / this.pinch : 1;
      this.pinch = distance;
      return { type: 'zoom', ratio };
    }
    if (!this.press || this.press.id !== id || this.multiTouch) return;
    if (Math.hypot(x - this.press.x, y - this.press.y) > 8) this.press.dragged = true;
    if (this.press.dragged) return { type: 'rotate', delta: x - old.x };
  }

  up(id: number): GestureAction | undefined {
    const press = this.press;
    this.pointers.delete(id);
    if (press?.id === id) this.press = null;
    if (this.pointers.size === 0) this.multiTouch = false;
    if (press?.id === id && !press.dragged && press.tile) return { type: 'tap', tile: press.tile };
  }

  hold(): GestureAction | undefined {
    if (!this.press || this.press.dragged || !this.press.tile) return;
    const tile = this.press.tile;
    this.press = null;
    return { type: 'flag', tile };
  }

  cancel(): void {
    this.press = null;
    this.pointers.clear();
    this.multiTouch = false;
    this.pinch = 0;
  }

  private distance(): number {
    const points = [...this.pointers.values()];
    return points.length < 2 ? 0 : Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }
}
