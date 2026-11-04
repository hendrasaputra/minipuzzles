import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { bounceHeight, PixelBurst } from '../../shared/pixel-burst';
import { canPlace, colors, complete, footprint, vertices, type Game, type Placement, type Point, type Triangle } from './engine';

const dropTime = .13;
const bounceTime = .12;

function boundary(tiles: readonly Triangle[]): [Point, Point][] {
  const edges = new Map<string, [Point, Point]>();
  for (const tile of tiles) {
    const points = vertices(tile);
    for (let i = 0; i < 3; i++) {
      const a = points[i], b = points[(i + 1) % 3];
      const id = [a.join(','), b.join(',')].sort().join('|');
      if (edges.has(id)) edges.delete(id);
      else edges.set(id, [a, b]);
    }
  }
  return [...edges.values()];
}

export class TangramScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst();
  private drop?: { mesh: THREE.Mesh; x: number; y: number; piece: number };
  private elapsed = 0;
  private previous?: number;
  private press?: { id: number; x: number; y: number; cell: string };

  constructor(host: HTMLElement, private readonly onPlace: (x: number, y: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const canvas = this.mini.canvas;
    canvas.setAttribute('aria-label', '3D fitting board. Tap a square to place the selected piece. Choose Rotate to look around.');
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private down = (event: PointerEvent) => {
    if (this.mini.rotating || event.button !== 0) return;
    const cell = this.mini.pick(event.clientX, event.clientY);
    if (!cell) return;
    event.preventDefault();
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, cell };
  };

  private move = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) this.cancelInput();
  };

  private up = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id !== event.pointerId) return;
    this.cancelInput();
    if (!this.mini.rotating && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8
      && this.mini.pick(event.clientX, event.clientY) === press.cell) {
      const [x, y] = press.cell.split(',').map(Number);
      this.onPlace(x, y);
    }
  };

  private shape(tiles: Triangle[], low: number, high: number, color: string, opacity = 1) {
    const positions: number[] = [];
    const push = ([x, y]: Point, height: number) => positions.push(x, height, y);
    for (const tile of tiles) {
      const [a, b, c] = vertices(tile);
      push(a, high); push(c, high); push(b, high);
    }
    for (const [a, b] of boundary(tiles)) {
      push(a, low); push(a, high); push(b, high);
      push(a, low); push(b, high); push(b, low);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const mesh = this.mini.mesh(geometry, new THREE.MeshLambertMaterial({
      color, opacity, transparent: opacity < 1, depthWrite: opacity === 1,
    }), 0, 0, 0);
    if (opacity < 1) mesh.castShadow = false;
    return mesh;
  }

  private animate = (seconds: number) => {
    if (seconds === 0) {
      if (this.drop) this.drop.mesh.position.y = 0;
      this.burst.clear();
      this.motion.stop();
      return;
    }
    const wasAirborne = this.elapsed < dropTime;
    if (this.previous !== undefined) this.elapsed += Math.max(0, Math.min(.05, seconds - this.previous));
    this.previous = seconds;
    if (this.drop) {
      const { mesh, x, y, piece } = this.drop;
      const t = Math.min(1, this.elapsed / dropTime);
      mesh.position.y = t < 1 ? .23 * (1 - t * t) : bounceHeight(.48, this.elapsed - dropTime);
      if (t === 1 && wasAirborne) this.burst.start(x, .05, y, 'spark', piece, 4);
      if (this.elapsed >= dropTime + bounceTime) {
        mesh.position.y = 0;
        this.drop = undefined;
      }
    }
    if (!this.burst.update(Math.max(0, this.elapsed - dropTime)) && !this.drop) this.motion.stop();
  };

  draw(game: Game, selected: number, draft: Placement, placedPiece?: number) {
    this.cancelInput();
    this.motion.stop();
    this.burst.clear();
    this.drop = undefined;
    this.previous = undefined;
    this.elapsed = 0;
    this.mini.clear();
    const { width, height, target, pieces } = game.level;
    this.mini.box(-.18, -.18, width + .18, height + .18, -.30, -.04, '#8e9380');
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      this.mini.box(x + .013, y + .013, x + .987, y + .987, -.04, 0, '#cbd2b9', `${x},${y}`);
    }
    this.shape(target, 0, .021, '#e9dbb9');
    for (const [[x, y], [nx, ny]] of boundary(target)) {
      const start = new THREE.Vector3(x, .035, y);
      const end = new THREE.Vector3(nx, .035, ny);
      const mesh = this.mini.mesh(new THREE.CylinderGeometry(.016, .016, start.distanceTo(end), 5),
        new THREE.MeshBasicMaterial({ color: '#806c48' }), (x + nx) / 2, (y + ny) / 2, .035);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
      mesh.castShadow = false;
    }
    game.placements.forEach((placement, i) => {
      if (!placement) return;
      const tiles = footprint(pieces[i], placement);
      const mesh = this.shape(tiles, .023, .15, colors[i]);
      if (i === placedPiece) {
        const points = vertices(tiles[0]);
        const x = points.reduce((sum, point) => sum + point[0], 0) / 3;
        const y = points.reduce((sum, point) => sum + point[1], 0) / 3;
        this.drop = { mesh, x, y, piece: i };
      }
    });
    if (!complete(game)) {
      const placed = game.placements[selected];
      const unchanged = placed?.x === draft.x && placed.y === draft.y && placed.turn === draft.turn;
      if (!unchanged && canPlace(game, selected, draft)) {
        this.shape(footprint(pieces[selected], draft), .027, .174, colors[selected], .52);
      }
      this.mini.box(draft.x + .35, draft.y + .35, draft.x + .65, draft.y + .65, .18, .193,
        canPlace(game, selected, draft) ? '#e6c17a' : '#aa5351');
    }
    for (let x = 0; x < width; x++) {
      this.mini.box(x + .18, height + .04, x + .82, height + .53, -.14, .015, '#7d806f');
      this.mini.label(String.fromCharCode(65 + x), x + .5, height + .28, .025);
    }
    for (let y = 0; y < height; y++) {
      this.mini.box(-.53, y + .18, -.04, y + .82, -.14, .015, '#7d806f');
      this.mini.label(String(y + 1), -.28, y + .5, .025);
    }
    this.mini.render();
    if (this.drop) this.motion.refresh();
  }
}
