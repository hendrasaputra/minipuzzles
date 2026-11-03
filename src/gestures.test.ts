import { describe, expect, it } from 'vitest';
import { BoardGesture } from './gestures';

const tile = { floor: 1, index: 8 };
describe('board gestures', () => {
  it('reveals only on primary pointer release and flags only once on hold', () => {
    const gesture = new BoardGesture();
    expect(gesture.down(1, 20, 20, 0, tile)).toBeUndefined();
    expect(gesture.up(1)).toEqual({ type: 'tap', tile });
    gesture.down(1, 20, 20, 0, tile);
    expect(gesture.hold()).toEqual({ type: 'flag', tile });
    expect(gesture.hold()).toBeUndefined();
    expect(gesture.up(1)).toBeUndefined();
  });
  it('does not reveal after right click, cancellation, background tap or unrelated release', () => {
    const gesture = new BoardGesture();
    expect(gesture.down(1, 20, 20, 2, tile)).toEqual({ type: 'flag', tile });
    expect(gesture.up(1)).toBeUndefined();
    gesture.down(1, 20, 20, 0, tile);
    expect(gesture.up(2)).toBeUndefined();
    gesture.cancel();
    expect(gesture.up(1)).toBeUndefined();
    gesture.down(1, 20, 20, 0);
    expect(gesture.up(1)).toBeUndefined();
  });
  it('never turns a drag into a tap or hold, even after dragging back', () => {
    const gesture = new BoardGesture();
    gesture.down(1, 20, 20, 0, tile);
    expect(gesture.move(1, 30, 20)).toEqual({ type: 'rotate', delta: 10 });
    gesture.move(1, 20, 20);
    expect(gesture.hold()).toBeUndefined();
    expect(gesture.up(1)).toBeUndefined();
  });
  it('suppresses taps until all pinch pointers have been released', () => {
    const gesture = new BoardGesture();
    gesture.down(1, 10, 10, 0, tile);
    gesture.down(2, 20, 10, 0, tile);
    expect(gesture.move(2, 30, 10)).toEqual({ type: 'zoom', ratio: 2 });
    expect(gesture.hold()).toBeUndefined();
    expect(gesture.up(2)).toBeUndefined();
    expect(gesture.move(1, 15, 10)).toBeUndefined();
    expect(gesture.up(1)).toBeUndefined();
    gesture.down(3, 10, 10, 0, tile);
    expect(gesture.up(3)).toEqual({ type: 'tap', tile });
  });
  it('handles coincident pinch coordinates without invalid zoom values', () => {
    const gesture = new BoardGesture();
    gesture.down(1, 10, 10, 0, tile);
    gesture.down(2, 10, 10, 0, tile);
    expect(gesture.move(2, 20, 10)).toEqual({ type: 'zoom', ratio: 1 });
  });
});
