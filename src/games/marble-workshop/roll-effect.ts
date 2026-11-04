import * as THREE from 'three';
import type { Cell, Direction } from './engine';
import type { MiniScene } from '../../shared/mini-scene';
import { bounceHeight } from '../../shared/pixel-burst';

export const MARBLE_RADIUS = .13;
export const ROLL_HEIGHT = .29;
export const CUP_HEIGHT = .225;

export const steps: Record<Direction, Cell> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

function world(cell: Cell, height: number): THREE.Vector3 {
  return new THREE.Vector3(cell.x + .5, height, cell.y + .5);
}

function edge(center: THREE.Vector3, direction: Cell): THREE.Vector3 {
  return new THREE.Vector3(center.x + direction.x * .5, center.y, center.z + direction.y * .5);
}

function groove(center: THREE.Vector3, entry: Cell, exit: Cell): THREE.Curve<THREE.Vector3> {
  const start = edge(center, entry);
  const end = edge(center, exit);
  return entry.x + exit.x === 0 && entry.y + exit.y === 0
    ? new THREE.LineCurve3(start, end)
    : new THREE.QuadraticBezierCurve3(start, center, end);
}

export function trackCurve(cell: Cell, entry: Direction, exit: Direction, height: number) {
  return groove(world(cell, height), steps[entry], steps[exit]);
}

function towards(from: Cell, to: Cell): Cell {
  return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
}

export function rollCurve(points: Cell[], reached: boolean): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const start = world(points[0], ROLL_HEIGHT);
  const end = world(points[points.length - 1], ROLL_HEIGHT);
  if (points.length <= 2) {
    path.add(new THREE.LineCurve3(start, end));
    return path;
  }

  let last = edge(start, towards(points[0], points[1]));
  path.add(new THREE.LineCurve3(start, last));
  for (let index = 1; index < points.length - 1; index++) {
    const cell = points[index];
    const curve = groove(world(cell, ROLL_HEIGHT), towards(cell, points[index - 1]), towards(cell, points[index + 1]));
    path.add(curve);
    last = curve.getPoint(1);
  }
  if (reached) {
    // The marble clears the lip before settling into the cup.
    const lip = last.clone().lerp(end, .64);
    end.y = CUP_HEIGHT;
    path.add(new THREE.LineCurve3(last, lip));
    path.add(new THREE.LineCurve3(lip, end));
  } else if (last.distanceToSquared(end) > 1e-8) {
    path.add(new THREE.LineCurve3(last, end));
  }
  return path;
}

const PARTICLES = 12;

export class RollEffect {
  private readonly path: THREE.CurvePath<THREE.Vector3>;
  private readonly length: number;
  private readonly duration: number;
  private readonly end: THREE.Vector3;
  private readonly sample = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly spin = new THREE.Quaternion();
  private elapsed = 0;
  private previousTime: number | undefined;

  constructor(
    private readonly marble: THREE.Mesh,
    private readonly dust: readonly THREE.Mesh[],
    points: Cell[],
    private readonly reached: boolean,
  ) {
    this.path = rollCurve(points, reached);
    this.length = this.path.getLength();
    this.duration = Math.max(.31, this.length / 4.4);
    this.end = this.path.getPoint(1);
    this.marble.position.copy(this.path.getPoint(0));
    this.marble.quaternion.identity();
    this.dust.forEach(mesh => { mesh.visible = false; });
  }

  update(seconds: number): boolean {
    if (seconds === 0) {
      this.marble.position.copy(this.end);
      this.dust.forEach(mesh => { mesh.visible = false; });
      return true;
    }

    const settle = this.reached ? .34 : .18;
    const travel = this.duration;
    const progressAt = (elapsed: number) => {
      const t = Math.min(1, elapsed / travel);
      if (t === 1) return 1;
      // Brake over the final part of the track while keeping travel continuous.
      const braking = Math.max(0, t - .88);
      return (t - braking * braking / .24) / .94;
    };
    const before = progressAt(this.elapsed);
    if (this.previousTime !== undefined) {
      this.elapsed += Math.min(.07, Math.max(0, seconds - this.previousTime));
    }
    this.previousTime = seconds;
    const progress = progressAt(this.elapsed);
    this.path.getPoint(progress, this.sample);
    this.axis.set(this.sample.z - this.marble.position.z, 0, this.marble.position.x - this.sample.x);
    if (this.axis.lengthSq() > 1e-9) {
      this.spin.setFromAxisAngle(this.axis.normalize(), (progress - before) * this.length / MARBLE_RADIUS);
      this.marble.quaternion.premultiply(this.spin);
    }
    this.marble.position.copy(this.sample);

    const finish = this.elapsed - travel;
    if (this.reached && finish >= 0) {
      this.marble.position.y += bounceHeight(.78, finish);
    }
    this.dust.forEach((mesh, index) => {
      if (finish >= 0) {
        mesh.visible = finish < settle && (this.reached || index < 4);
        if (!mesh.visible) return;
        const angle = index * Math.PI * 2 / this.dust.length;
        const radius = .13 + (1 - Math.exp(-4 * finish)) * .3;
        mesh.position.set(this.end.x + Math.cos(angle) * radius,
          .18 + bounceHeight(1.1 + index % 3 * .22, finish),
          this.end.z + Math.sin(angle) * radius);
        mesh.scale.setScalar(1 - finish / settle);
        return;
      }

      const delay = .08 + index * .017;
      const behind = progressAt(this.elapsed - delay);
      mesh.visible = index < 8 && this.elapsed > delay;
      if (!mesh.visible) return;
      this.path.getPoint(behind, mesh.position);
      mesh.position.x += Math.sin(index * 2.2) * .10;
      mesh.position.z += Math.cos(index * 2.2) * .10;
      mesh.position.y = .17 + delay * .28;
      mesh.scale.setScalar(.48 + index % 3 * .16);
    });
    return finish >= settle;
  }
}

export function marbleParticles(mini: MiniScene, start: Cell): THREE.Mesh[] {
  return Array.from({ length: PARTICLES }, (_, index) => {
    const mesh = mini.mesh(new THREE.OctahedronGeometry(index % 3 === 0 ? .047 : .032),
      new THREE.MeshBasicMaterial({ color: index % 2 ? '#eeb35f' : '#fff0bf' }),
      start.x + .5, start.y + .5, .18);
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  });
}
