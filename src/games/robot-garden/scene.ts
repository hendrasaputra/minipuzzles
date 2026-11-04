import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import type { Direction, Level, Position } from './engine';

const vectors: Record<Direction, [number, number]> = {
  n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0],
};

export class RobotScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private robot: { mesh: THREE.Mesh; x: number; y: number }[] = [];
  private seeds: THREE.Mesh[] = [];
  private size = 4;
  private trip?: {
    path: Position[];
    elapsed: number;
    previous?: number;
    step: number;
    onStep: (position: Position, step: number) => void;
    done: () => void;
  };

  constructor(host: HTMLElement) {
    this.mini = new MiniScene(host, () => {});
    this.mini.canvas.setAttribute('aria-label', 'Robot garden board. Gold diamonds are seeds and the blue D tile is the dock. Use the arrow buttons to plan a route.');
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
  }

  arrow(direction: Direction) {
    return this.mini.direction(...vectors[direction]);
  }

  private point(cell: number) {
    return { x: cell % this.size + .5, y: Math.floor(cell / this.size) + .5 };
  }

  draw(level: Level, position: Position) {
    this.motion.stop();
    this.trip = undefined;
    this.mini.clear();
    this.robot = [];
    this.size = level.size;
    this.mini.box(-.12, -.12, level.size + .12, level.size + .12, -.3, -.04, '#769071');
    for (let cell = 0; cell < level.size ** 2; cell++) {
      const { x, y } = this.point(cell);
      const dock = cell === level.dock;
      this.mini.box(x - .47, y - .47, x + .47, y + .47, -.04, .018,
        dock ? '#47788b' : (cell + Math.floor(cell / level.size)) % 2 ? '#ccd7b1' : '#d9e0bc');
      if (dock) this.mini.label('D', x, y, .025);
      if (level.rocks.includes(cell)) {
        this.mini.box(x - .35, y - .28, x + .35, y + .28, .018, .33, '#938e83');
        this.mini.box(x - .24, y - .21, x + .24, y + .21, .33, .41, '#ada89a');
      }
    }
    for (const [label, x, y] of [
      ['N', level.size / 2, -.27], ['E', level.size + .27, level.size / 2],
      ['S', level.size / 2, level.size + .27], ['W', -.27, level.size / 2],
    ] as const) {
      this.mini.box(x - .22, y - .22, x + .22, y + .22, -.12, .012, '#617453');
      this.mini.label(label, x, y, .018);
    }
    this.seeds = level.seeds.map(cell => {
      const { x, y } = this.point(cell);
      return this.mini.mesh(new THREE.OctahedronGeometry(.19), new THREE.MeshLambertMaterial({ color: '#d99a3b' }), x, y, .22);
    });
    const { x, y } = this.point(position.cell);
    const part = (w: number, d: number, h: number, dx: number, dy: number, z: number, color: string) => {
      const mesh = this.mini.mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }), x + dx, y + dy, z);
      mesh.castShadow = false;
      this.robot.push({ mesh, x: dx, y: dy });
    };
    part(.56, .4, .29, 0, 0, .25, '#667787');
    for (const dx of [-.24, .24]) part(.18, .39, .15, dx, 0, .095, '#424e57');
    part(.42, .34, .25, 0, 0, .49, '#e9c577');
    for (const dx of [-.11, .11]) part(.065, .025, .08, dx, .173, .51, '#3b4956');
    part(.045, .045, .14, 0, 0, .67, '#667787');
    part(.11, .11, .075, 0, 0, .75, '#ce7966');
    this.place(position);
    this.mini.render();
  }

  private place(position: Position, next = position, progress = 0) {
    const from = this.point(position.cell);
    const to = this.point(next.cell);
    for (const { mesh, x, y } of this.robot) {
      mesh.position.x = from.x + (to.x - from.x) * progress + x;
      mesh.position.z = from.y + (to.y - from.y) * progress + y;
    }
    this.seeds.forEach((seed, i) => { seed.visible = (position.picked & (1 << i)) === 0; });
  }

  play(path: Position[], onStep: (position: Position, step: number) => void, done: () => void) {
    this.trip = { path, elapsed: 0, step: -1, onStep, done };
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    const trip = this.trip;
    if (!trip) return;
    const last = trip.path.length - 1;
    if (seconds === 0) trip.elapsed = last * .28;
    else if (trip.previous !== undefined) trip.elapsed += Math.min(.1, Math.max(0, seconds - trip.previous));
    trip.previous = seconds;
    const progress = seconds === 0 ? last : Math.min(last, trip.elapsed / .28);
    const index = Math.floor(progress);
    const position = trip.path[index];
    this.place(position, trip.path[Math.min(last, index + 1)], progress - index);
    if (trip.step !== index) {
      trip.step = index;
      trip.onStep(position, index);
    }
    if (index === last) {
      this.trip = undefined;
      this.motion.stop();
      trip.done();
    }
  };
}
