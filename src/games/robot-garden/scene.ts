import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import { PixelBurst } from '../../shared/pixel-burst';
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
  private readonly burst = new PixelBurst();
  private facing = 0;
  private recovery?: { position: Position; direction?: Direction; elapsed: number; previous: number };
  private trip?: {
    path: Position[];
    elapsed: number;
    previous?: number;
    step: number;
    onStep: (position: Position, step: number) => void;
    done: () => void;
    blocked?: Direction;
    won: boolean;
    effectAt: number;
    turnFrom: number;
    turnTo: number;
  };

  constructor(host: HTMLElement) {
    this.mini = new MiniScene(host, () => {});
    this.mini.effects.add(this.burst.object);
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
    this.recovery = undefined;
    this.burst.clear();
    this.facing = 0;
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

  private place(position: Position, next = position, progress = 0, recoil = 0, blocked?: Direction) {
    const from = this.point(position.cell);
    const to = this.point(next.cell);
    const [dx, dy] = blocked ? vectors[blocked] : [0, 0];
    const c = Math.cos(this.facing);
    const s = Math.sin(this.facing);
    for (const { mesh, x, y } of this.robot) {
      mesh.position.x = from.x + (to.x - from.x) * progress + x * c + y * s + dx * recoil;
      mesh.position.z = from.y + (to.y - from.y) * progress - x * s + y * c + dy * recoil;
      mesh.rotation.y = this.facing;
    }
    this.seeds.forEach((seed, i) => { seed.visible = (position.picked & (1 << i)) === 0; });
  }

  play(path: Position[], onStep: (position: Position, step: number) => void, done: () => void,
    won: boolean, blocked?: Direction) {
    this.burst.clear();
    this.recovery = undefined;
    this.trip = { path, elapsed: 0, step: -1, onStep, done, won, blocked,
      effectAt: 0, turnFrom: this.facing, turnTo: this.facing };
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    const trip = this.trip;
    if (!trip) {
      const recovery = this.recovery;
      if (!recovery) return;
      recovery.elapsed += Math.min(.1, Math.max(0, seconds - recovery.previous));
      recovery.previous = seconds;
      const t = seconds === 0 ? 1 : Math.min(1, recovery.elapsed / .22);
      this.place(recovery.position, recovery.position, 0, t === 1 ? 0 : Math.sin(t * Math.PI) * .12, recovery.direction);
      if (seconds === 0 || !this.burst.update(recovery.elapsed)) {
        this.burst.clear();
        this.recovery = undefined;
        this.motion.stop();
      }
      return;
    }
    const last = trip.path.length - 1;
    if (seconds === 0) trip.elapsed = last * .28;
    else if (trip.previous !== undefined) trip.elapsed += Math.min(.1, Math.max(0, seconds - trip.previous));
    trip.previous = seconds;
    const progress = seconds === 0 ? last : Math.min(last, trip.elapsed / .28);
    const index = Math.floor(progress);
    const position = trip.path[index];
    const next = trip.path[Math.min(last, index + 1)];
    if (trip.step !== index) {
      const previous = trip.path[Math.max(0, index - 1)];
      if (seconds !== 0 && previous.picked !== position.picked) {
        const { x, y } = this.point(position.cell);
        this.burst.start(x, .08, y, 'leaf', position.cell, 6);
        trip.effectAt = trip.elapsed;
      }
      if (index < last) {
        const from = this.point(position.cell);
        const to = this.point(next.cell);
        const desired = Math.atan2(to.x - from.x, to.y - from.y);
        const difference = desired - this.facing;
        trip.turnFrom = this.facing;
        trip.turnTo = this.facing + Math.atan2(Math.sin(difference), Math.cos(difference));
      }
      trip.step = index;
      trip.onStep(position, index);
    }
    if (index < last) {
      const fraction = progress - index;
      this.facing = THREE.MathUtils.lerp(trip.turnFrom, trip.turnTo, Math.min(1, fraction / .2));
      const t = Math.max(0, (fraction - .2) / .8);
      this.place(position, next, t * t * (3 - 2 * t));
      this.burst.update(trip.elapsed - trip.effectAt);
      return;
    }

    this.facing = trip.turnTo;
    if (seconds !== 0 && trip.blocked) {
      const [dx, dy] = vectors[trip.blocked];
      this.facing = Math.atan2(dx, dy);
    }
    this.place(position);
    this.trip = undefined;
    if (seconds !== 0 && (trip.won || trip.blocked)) {
      const { x, y } = this.point(position.cell);
      const [dx, dy] = trip.blocked ? vectors[trip.blocked] : [0, 0];
      this.burst.start(x + dx * .38, .08, y + dy * .38, trip.won ? 'spark' : 'dust', position.cell, 6);
      this.recovery = { position, direction: trip.blocked, elapsed: 0, previous: seconds };
    } else if (seconds !== 0 && this.burst.update(trip.elapsed - trip.effectAt)) {
      this.recovery = { position, elapsed: trip.elapsed - trip.effectAt, previous: seconds };
    } else {
      this.burst.clear();
      this.motion.stop();
    }
    trip.done();
  };
}
