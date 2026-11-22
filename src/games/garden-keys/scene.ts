import * as THREE from 'three';
import type { Direction, Entity, Game, Item, Kind, Terrain } from './engine';
import { MiniScene, type Point } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';

/** Turns a screen swipe into a board direction, using the screen axes of one board step. */
export function swipeDirection(delta: Point, xAxis: Point, yAxis: Point): Direction | null {
  if (Math.hypot(delta.x, delta.y) < 12) return null;
  const determinant = xAxis.x * yAxis.y - xAxis.y * yAxis.x;
  if (Math.abs(determinant) < 1e-6) return null;
  const x = (delta.x * yAxis.y - delta.y * yAxis.x) / determinant, y = (xAxis.x * delta.y - xAxis.y * delta.x) / determinant;
  return Math.abs(x) > Math.abs(y) ? x > 0 ? 'e' : 'w' : y > 0 ? 's' : 'n';
}

const keyColors: Record<string, string> = { red: '#d9787a', blue: '#7f9fc9', yellow: '#e6c260', green: '#86b37c' };
const bootColors: Record<string, string> = { ring: '#f0a35c', clogs: '#c46a4f', spikes: '#9fc7d8', grips: '#9a8a6e' };
const monsterColors: Record<string, string> = {
  beetle: '#4f7d57', firefly: '#f2c14e', ball: '#e48aa8', tank: '#7f8a96', dragonfly: '#6fa8c9', snapper: '#c9584f', newt: '#e59a52',
};
const arrows: Partial<Record<Terrain, [number, number]>> = { 'push-n': [0, -1], 'push-e': [1, 0], 'push-s': [0, 1], 'push-w': [-1, 0] };
const lambert = (color: string, emissive?: string) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...(emissive ? { emissive, emissiveIntensity: .45 } : {}) });

interface Piece { meshes: { mesh: THREE.Mesh; base: THREE.Vector3 }[]; from: Point; elapsed: number }

/** Draws the garden maze. The rules advance at once; steps are tweened for the eye only. */
export class GardenScene {
  private mini: MiniScene;
  private motion: MaterialMotion;
  private burst = new PixelBurst();
  private game?: Game;
  private previous = new Map<number, Point>();
  private pieces: Piece[] = [];
  private fire: THREE.Mesh[] = [];
  private water: THREE.Mesh[] = [];
  private belts: { mesh: THREE.Mesh; base: THREE.Vector3; dx: number; dy: number }[] = [];
  private pads: THREE.Mesh[] = [];
  private last = 0;
  private burstAt = -Infinity;
  private press: { id: number; point: Point } | null = null;

  constructor(host: HTMLElement, private onMove: (direction: Direction) => void) {
    this.mini = new MiniScene(host, () => { this.press = null; });
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label', '3D garden maze. Swipe or tap a square next to the gardener to step. Drag with two fingers to turn the board.');
    this.mini.canvas.addEventListener('pointerdown', this.down);
    this.mini.canvas.addEventListener('pointerup', this.up);
    this.mini.canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = null; this.mini.cancelInput(); };
  screenDirection(dir: Direction) { const [x, y] = dir === 'n' ? [0, -1] : dir === 'e' ? [1, 0] : dir === 's' ? [0, 1] : [-1, 0]; return this.mini.direction(x, y); }
  /** Points the tutorial finger at a square, or hides it. */
  pointAt(cell?: Point) { if (cell) this.mini.showFinger(cell.x + .5, cell.y + .5, .1); else this.mini.hideFinger(); }

  update(game: Game) {
    const same = this.game?.level === game.level;
    const before = same ? this.previous : new Map<number, Point>();
    const picked = same && this.game ? this.pickups(this.game, game) : [];
    this.game = game;
    this.draw(before);
    for (const [x, y] of picked) this.sparkle(x, y, 'spark');
    const p = game.state.player;
    if (game.state.status === 'lost') this.sparkle(p.x, p.y, game.state.cause === 'water' ? 'water' : 'dust');
  }

  private pickups(old: Game, now: Game): [number, number][] {
    const out: [number, number][] = [];
    old.state.items.forEach((item, i) => { if (item && !now.state.items[i]) out.push([i % now.level.width, Math.floor(i / now.level.width)]); });
    return out;
  }
  private sparkle(x: number, y: number, kind: 'spark' | 'water' | 'dust') {
    this.burst.start(x + .5, .15, y + .5, kind, x + y * 17, 8);
    this.burstAt = this.last;
  }

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || !this.game || this.game.state.status !== 'playing' || this.mini.rotating) return;
    event.preventDefault();
    this.press = { id: event.pointerId, point: { x: event.clientX, y: event.clientY } };
  };
  private up = (event: PointerEvent) => {
    const press = this.press, game = this.game;
    if (press?.id !== event.pointerId || !game || this.mini.rotating) return;
    this.press = null;
    const { x, y } = game.state.player;
    const a = this.mini.project(x, y), b = this.mini.project(x + 1, y), c = this.mini.project(x, y + 1);
    const dir = swipeDirection({ x: event.clientX - press.point.x, y: event.clientY - press.point.y }, { x: b.x - a.x, y: b.y - a.y }, { x: c.x - a.x, y: c.y - a.y });
    if (dir) return this.onMove(dir);
    const owner = this.mini.pick(press.point.x, press.point.y)?.match(/^tile:(\d+),(\d+)$/);
    const tile = owner ? { x: Number(owner[1]), y: Number(owner[2]) } : this.mini.ground(press.point.x, press.point.y);
    if (!tile) return;
    const dx = Math.floor(tile.x) - x, dy = Math.floor(tile.y) - y;
    if (Math.abs(dx) + Math.abs(dy) === 1) this.onMove(dx === 1 ? 'e' : dx === -1 ? 'w' : dy === 1 ? 's' : 'n');
  };

  private animate = (seconds: number) => {
    const dt = seconds === 0 ? 1 : Math.min(.08, Math.max(0, seconds - this.last));
    if (seconds > 0) this.last = seconds;
    for (const piece of this.pieces) {
      piece.elapsed += dt;
      const t = Math.min(1, piece.elapsed / .12), k = 1 - (1 - t) ** 2;
      for (const { mesh, base } of piece.meshes) mesh.position.set(base.x + piece.from.x * (1 - k), base.y + Math.sin(t * Math.PI) * .06, base.z + piece.from.y * (1 - k));
    }
    this.pieces = this.pieces.filter(p => p.elapsed < .12);
    const s = seconds;
    this.fire.forEach((mesh, i) => { mesh.scale.y = 1 + Math.sin(s * 9 + i * 1.7) * .18; mesh.scale.x = 1 + Math.cos(s * 7 + i) * .08; });
    this.water.forEach((mesh, i) => { mesh.position.y = -.07 + Math.sin(s * 2 + i * .9) * .012; });
    for (const belt of this.belts) {
      const shift = (s * .8) % 1 - .5;
      belt.mesh.position.set(belt.base.x + belt.dx * shift * .5, belt.base.y, belt.base.z + belt.dy * shift * .5);
    }
    for (const pad of this.pads) pad.rotation.z = s * 1.5;
    this.burst.update(this.last - this.burstAt);
  };

  private draw(before: Map<number, Point>) {
    const game = this.game!, { width, height } = game.level, s = game.state;
    this.mini.clear();
    this.fire = []; this.water = []; this.belts = []; this.pads = []; this.pieces = [];
    this.mini.box(-.15, -.15, width + .15, height + .15, -.45, -.12, '#9fb08a');
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      this.tile(s.terrain[i], x, y, s.revealed.includes(i));
      const item = s.items[i];
      if (item) this.item(item, x, y);
    }
    for (const e of [...s.crates, ...s.monsters, s.player]) this.entity(e, before.get(e.id));
    this.previous = new Map([...s.crates, ...s.monsters, s.player].map(e => [e.id, { x: e.x, y: e.y }]));
    this.mini.render();
    this.motion.refresh();
  }

  private tile(t: Terrain, x: number, y: number, revealed: boolean) {
    const m = this.mini, owner = `tile:${x},${y}`, inset = (d: number, z0: number, z1: number, color: string) => m.box(x + d, y + d, x + 1 - d, y + 1 - d, z0, z1, color, owner);
    const ground = (x + y) % 2 ? '#c9d6ad' : '#d3debb';
    if (t === 'wall' || t === 'fake-wall' || (t === 'hidden-wall' && revealed)) {
      inset(.02, -.12, .62, t === 'hidden-wall' ? '#9fb08a' : '#7f9a6b');
      inset(.08, .62, .72, '#93ae7d');
      return;
    }
    if (t === 'water') { inset(.02, -.12, -.1, '#5f87a6'); this.water.push(inset(.04, -.08, -.06, '#86b0cc')); return; }
    if (t === 'mud') { inset(.02, -.12, -.02, '#9a7a5a'); return; }
    inset(.02, -.12, 0, t === 'ice' || t.startsWith('ice-') ? '#dceef2' : t === 'gravel' ? '#b9b4a6' : ground);
    if (t === 'gravel') for (const [a, b] of [[.25, .3], [.6, .25], [.4, .65], [.75, .7]]) m.box(x + a, y + b, x + a + .12, y + b + .1, 0, .04, '#8f8a7d');
    if (t.startsWith('ice-')) {
      const walls = t.slice(4); // ice-nw → nw: the two walled sides.
      if (walls.includes('n')) m.box(x, y, x + 1, y + .12, 0, .3, '#b6d4dc', owner);
      if (walls.includes('s')) m.box(x, y + .88, x + 1, y + 1, 0, .3, '#b6d4dc', owner);
      if (walls.includes('w')) m.box(x, y, x + .12, y + 1, 0, .3, '#b6d4dc', owner);
      if (walls.includes('e')) m.box(x + .88, y, x + 1, y + 1, 0, .3, '#b6d4dc', owner);
    }
    const arrow = arrows[t];
    if (arrow) {
      inset(.06, 0, .02, '#b7a487');
      const [dx, dy] = arrow, head = m.mesh(new THREE.ConeGeometry(.16, .3, 3), lambert('#efe2c4'), x + .5, y + .5, .05, owner);
      head.rotation.set(Math.PI / 2, Math.atan2(dx, dy), 0, 'YXZ'); // Lay the cone flat, then aim it along the belt.
      this.belts.push({ mesh: head, base: head.position.clone(), dx, dy });
    }
    if (t === 'fire') for (const [a, b, h] of [[.3, .35, .5], [.62, .4, .4], [.45, .65, .45]]) {
      const flame = m.mesh(new THREE.ConeGeometry(.13, h, 5), lambert('#ef8a4c', '#d9552c'), x + a, y + b, h / 2, owner);
      this.fire.push(flame);
    }
    if (t === 'gate') { inset(.06, 0, .5, '#b08a5f'); m.box(x + .3, y + .3, x + .7, y + .7, .5, .56, '#d9b97a', owner); }
    if (t === 'exit') {
      const mound = new THREE.SphereGeometry(.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      m.mesh(mound, lambert('#a98764'), x + .5, y + .5, 0, owner);
      const hole = m.mesh(new THREE.CircleGeometry(.18, 12), new THREE.MeshBasicMaterial({ color: '#4b3a2c' }), x + .5, y + .82, .16, owner);
      hole.rotation.x = -.3;
    }
    if (t.startsWith('door-')) { inset(.04, 0, .66, keyColors[t.slice(5)]); m.box(x + .44, y + .9, x + .56, y + .98, .25, .42, '#4b3a2c', owner); }
    if (t === 'thief') { const sack = new THREE.SphereGeometry(.28, 8, 6); sack.scale(1, 1.1, 1); m.mesh(sack, lambert('#8a6fa8'), x + .5, y + .5, .3, owner); }
    if (t === 'bomb') { m.mesh(new THREE.SphereGeometry(.26, 10, 7), lambert('#4a4a52'), x + .5, y + .5, .26, owner); m.box(x + .48, y + .48, x + .52, y + .52, .5, .64, '#e6c260', owner); }
    if (t === 'teleport') {
      const ring = m.mesh(new THREE.TorusGeometry(.3, .06, 6, 20), lambert('#b5add7', '#7d6fb8'), x + .5, y + .5, .05, owner);
      ring.rotation.x = Math.PI / 2; this.pads.push(ring);
    }
    if (t === 'hint') { inset(.18, 0, .05, '#a98764'); m.label('?', x + .5, y + .5, .06); }
    if (t.startsWith('button-')) {
      const color = { 'button-green': '#86b37c', 'button-blue': '#7f9fc9', 'button-brown': '#a98764', 'button-red': '#d9787a' }[t as 'button-red'];
      const disc = m.mesh(new THREE.CylinderGeometry(.28, .32, .08, 16), lambert(color), x + .5, y + .5, .04, owner);
      disc.castShadow = false;
    }
    if (t === 'trap') { inset(.1, 0, .04, '#6b5c4c'); for (const a of [.25, .5, .75]) m.box(x + a - .03, y + .12, x + a + .03, y + .88, .04, .1, '#3f362e', owner); }
    if (t === 'cloner') { inset(.04, 0, .3, '#9aa3ad'); m.box(x + .2, y + .2, x + .8, y + .8, .3, .34, '#c3cbd3', owner); }
    if (t === 'toggle-closed') for (const a of [.1, .4, .7]) m.box(x + a, y + .05, x + a + .2, y + .95, 0, .55, '#86b37c', owner);
    if (t === 'toggle-open') for (const a of [.1, .4, .7]) m.box(x + a, y + .05, x + a + .2, y + .95, 0, .05, '#86b37c', owner);
    if (t === 'popup-wall') m.box(x + .15, y + .15, x + .85, y + .85, 0, .06, '#93ae7d', owner);
  }

  private item(item: Item, x: number, y: number) {
    const m = this.mini, owner = `tile:${x},${y}`;
    if (item === 'seed') {
      const seed = new THREE.SphereGeometry(.15, 8, 6); seed.scale(.8, 1.15, .8);
      m.mesh(seed, lambert('#b07f4f'), x + .5, y + .5, .2, owner);
      const leaf = new THREE.SphereGeometry(.09, 6, 4); leaf.scale(1.6, .3, .8);
      m.mesh(leaf, lambert('#86b37c'), x + .6, y + .5, .38, owner);
    } else if (item.startsWith('key-')) {
      const color = keyColors[item.slice(4)], ring = m.mesh(new THREE.TorusGeometry(.12, .04, 6, 14), lambert(color), x + .38, y + .5, .12, owner);
      ring.rotation.x = Math.PI / 2;
      m.box(x + .48, y + .47, x + .78, y + .53, .09, .15, color, owner);
      m.box(x + .68, y + .53, x + .74, y + .62, .09, .15, color, owner);
    } else {
      const color = bootColors[item.slice(5)];
      if (item === 'boot-ring') {
        const ring = m.mesh(new THREE.TorusGeometry(.2, .08, 8, 16), lambert(color), x + .5, y + .5, .1, owner);
        ring.rotation.x = Math.PI / 2;
      } else for (const dx of [-.14, .14]) {
        m.box(x + .5 + dx - .09, y + .35, x + .5 + dx + .09, y + .7, 0, .12, color, owner);
        m.box(x + .5 + dx - .09, y + .35, x + .5 + dx + .09, y + .48, .12, .3, color, owner);
      }
    }
  }

  private entity(e: Entity, before: Point | undefined) {
    const m = this.mini, owner = `tile:${e.x},${e.y}`, meshes: THREE.Mesh[] = [];
    const add = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, emissive?: string) => {
      const mesh = m.mesh(geometry, lambert(color, emissive), e.x + x, e.y + y, z, owner); meshes.push(mesh); return mesh;
    };
    const [fx, fy] = e.dir === 'n' ? [0, -1] : e.dir === 'e' ? [1, 0] : e.dir === 's' ? [0, 1] : [-1, 0];
    const kind: Kind = e.kind;
    if (kind === 'player') {
      add(new THREE.CylinderGeometry(.2, .24, .42, 10), '#d98fa8', .5, .5, .3);
      add(new THREE.SphereGeometry(.17, 10, 8), '#f1d2b6', .5, .5, .66);
      add(new THREE.CylinderGeometry(.32, .32, .04, 14), '#e6c88a', .5, .5, .8);
      add(new THREE.CylinderGeometry(.14, .17, .14, 12), '#e6c88a', .5, .5, .88);
      add(new THREE.SphereGeometry(.035, 5, 4), '#4b3a2c', .5 + fx * .15 - fy * .06, .5 + fy * .15 + fx * .06, .7);
      add(new THREE.SphereGeometry(.035, 5, 4), '#4b3a2c', .5 + fx * .15 + fy * .06, .5 + fy * .15 - fx * .06, .7);
    } else if (kind === 'crate') {
      meshes.push(m.box(e.x + .1, e.y + .1, e.x + .9, e.y + .9, 0, .72, '#c49a6c', owner));
      meshes.push(m.box(e.x + .06, e.y + .45, e.x + .94, e.y + .55, .05, .67, '#a77f55', owner));
    } else {
      const color = monsterColors[kind];
      if (kind === 'beetle') { const shell = new THREE.SphereGeometry(.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); shell.scale(1, .8, 1.2); add(shell, color, .5, .5, .02); }
      else if (kind === 'firefly') add(new THREE.SphereGeometry(.22, 10, 8), color, .5, .5, .4, '#f2a13a');
      else if (kind === 'ball') add(new THREE.SphereGeometry(.28, 12, 9), color, .5, .5, .28);
      else if (kind === 'tank') { add(new THREE.BoxGeometry(.64, .3, .64), color, .5, .5, .17); add(new THREE.BoxGeometry(.12, .1, .36), '#5f6873', .5 + fx * .25, .5 + fy * .25, .38); }
      else if (kind === 'dragonfly') {
        const body = new THREE.SphereGeometry(.12, 8, 6); body.scale(1, 1, 2.6); add(body, color, .5, .5, .45);
        for (const side of [-1, 1]) { const wing = new THREE.SphereGeometry(.2, 6, 4); wing.scale(1.4, .12, .5); add(wing, '#e7f2f7', .5 + side * .2, .5, .5); }
      } else if (kind === 'snapper') { add(new THREE.ConeGeometry(.3, .42, 6), color, .5, .5, .21); add(new THREE.BoxGeometry(.3, .06, .06), '#fff8e9', .5 + fx * .2, .5 + fy * .2, .14); }
      else { const body = new THREE.SphereGeometry(.18, 8, 6); body.scale(1, .6, 2); add(body, color, .5, .5, .12); }
      if (kind !== 'tank' && kind !== 'snapper') {
        add(new THREE.SphereGeometry(.05, 5, 4), '#fff8e9', .5 + fx * .22 - fy * .08, .5 + fy * .22 + fx * .08, .34);
        add(new THREE.SphereGeometry(.05, 5, 4), '#fff8e9', .5 + fx * .22 + fy * .08, .5 + fy * .22 - fx * .08, .34);
      }
    }
    // Tween one-square steps; teleports and the first draw jump straight there.
    if (before && Math.abs(before.x - e.x) + Math.abs(before.y - e.y) === 1)
      this.pieces.push({ meshes: meshes.map(mesh => ({ mesh, base: mesh.position.clone() })), from: { x: before.x - e.x, y: before.y - e.y }, elapsed: 0 });
  }
}
