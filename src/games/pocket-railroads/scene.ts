import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { complete, trace, type Game, type Node, type Point } from './engine';

export const stations = [
  { name: 'A', color: '#aa4b48' },
  { name: 'B', color: '#3d7288' },
  { name: 'C', color: '#53714e' },
  { name: 'D', color: '#86609a' },
];

function curve(points: Point[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const knots = points.map(({ x, y }) => new THREE.Vector3(x, 0, y));
  let start = knots[0];
  for (let i = 1; i < knots.length - 1; i++) {
    const corner = knots[i];
    const before = corner.clone().lerp(knots[i - 1], Math.min(.35, .16 / corner.distanceTo(knots[i - 1])));
    const after = corner.clone().lerp(knots[i + 1], Math.min(.35, .16 / corner.distanceTo(knots[i + 1])));
    path.add(new THREE.LineCurve3(start, before));
    path.add(new THREE.QuadraticBezierCurve3(before, corner, after));
    start = after;
  }
  path.add(new THREE.LineCurve3(start, knots[knots.length - 1]));
  return path;
}

export class RailScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private train: { mesh: THREE.Mesh; x: number; z: number }[] = [];
  private steam: THREE.Mesh[] = [];
  private readonly burst = new PixelBurst();
  private contactTime = 0;
  private contactPrevious?: number;
  private press?: { target: string; pointer: number; x: number; y: number };
  private ride?: {
    path: THREE.CurvePath<THREE.Vector3>;
    duration: number;
    elapsed: number;
    previous?: number;
    done: () => void;
    correct: boolean;
  };

  constructor(host: HTMLElement, activate: (owner: string) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D railway. Tap a numbered switch to change the route or tap the train to send it.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || this.ride || event.button !== 0) return;
      const target = this.mini.pick(event.clientX, event.clientY);
      if (!target) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { target, pointer: event.pointerId, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointermove', event => {
      const press = this.press;
      if (press?.pointer === event.pointerId && Math.hypot(press.x - event.clientX, press.y - event.clientY) > 8) this.cancelInput();
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.cancelInput();
      if (!press || press.pointer !== event.pointerId || this.mini.rotating || this.ride
        || Math.hypot(press.x - event.clientX, press.y - event.clientY) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.target) activate(press.target);
    });
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private segment(from: Point, to: Point, highlight = false) {
    const horizontal = from.y === to.y;
    const start = Math.min(horizontal ? from.x : from.y, horizontal ? to.x : to.y);
    const end = Math.max(horizontal ? from.x : from.y, horizontal ? to.x : to.y);
    const lane = horizontal ? from.y : from.x;
    const box = (along: number, across: number, length: number, width: number, low: number, high: number, color: string) => {
      if (horizontal) this.mini.box(along, across, along + length, across + width, low, high, color);
      else this.mini.box(across, along, across + width, along + length, low, high, color);
    };
    if (highlight) {
      box(start, lane - .045, end - start, .09, .051, .075, '#e5b55e');
      return;
    }
    for (let at = start + .1; at < end - .04; at += .24) box(at, lane - .22, .075, .44, .005, .047, '#8b6c50');
    for (const offset of [-.13, .13]) box(start, lane + offset - .018, end - start, .036, .04, .091, '#66747b');
  }

  draw(game: Game, selected: number) {
    this.cancelInput();
    this.motion.stop();
    this.ride = undefined;
    this.burst.clear();
    this.train = [];
    this.steam = [];
    this.mini.clear();
    let bottom = 0;
    const track = (node: Node) => {
      bottom = Math.max(bottom, node.y);
      if ('station' in node) return;
      for (const next of node.branches) {
        const corner = { x: node.x, y: next.y };
        this.segment(node, corner);
        this.segment(corner, next);
        track(next);
      }
    };
    track(game.level.root);
    this.mini.box(-.1, -.15, 6.7, bottom + .75, -.31, -.025, '#8e9b85');
    this.mini.box(-.04, -.09, 6.64, bottom + .69, -.025, 0, '#c6cfae');
    this.segment(game.level.yard, game.level.root);
    const route = trace(game);
    route.points.slice(1).forEach((point, index) => this.segment(route.points[index], point, true));

    const signs = (node: Node) => {
      const { x, y } = node;
      if ('station' in node) {
        const station = stations[node.station];
        this.mini.box(x - .3, y - .34, x + .53, y + .34, 0, .035, '#e0d8c5');
        this.mini.box(x + .4, y - .33, x + .6, y + .33, .035, .48, station.color);
        this.mini.box(x + .37, y - .37, x + .63, y + .37, .48, .56, station.color);
        this.mini.label(station.name, x + .5, y, .57);
      } else {
        const owner = String(node.junction);
        const chosen = game.switches[node.junction] ? 1 : -1;
        this.mini.box(x - .32, y - .31, x + .3, y + .31, .015, .114,
          selected === node.junction ? '#a86c38' : '#7b644e', owner);
        this.mini.box(x - .3, y + chosen * .23 - .035, x + .28, y + chosen * .23 + .035,
          .115, .135, '#ffe09b', owner);
        this.mini.label(String(node.junction + 1), x, y, .138);
        node.branches.forEach(signs);
      }
    };
    signs(game.level.root);
    const station = stations[game.level.trains[Math.min(game.delivered, game.level.trains.length - 1)]];
    const part = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
      const mesh = this.mini.mesh(geometry, new THREE.MeshLambertMaterial({ color }), game.level.yard.x, game.level.yard.y, y, 'send');
      mesh.castShadow = false;
      this.train.push({ mesh, x, z });
    };
    part(new THREE.BoxGeometry(.69, .16, .34), '#444a50', 0, .19, 0);
    part(new THREE.BoxGeometry(.28, .28, .32), station.color, -.15, .37, 0);
    part(new THREE.BoxGeometry(.32, .06, .37), '#f2e3c9', -.15, .53, 0);
    part(new THREE.BoxGeometry(.29, .18, .27), station.color, .15, .33, 0);
    part(new THREE.CylinderGeometry(.055, .048, .17, 10), '#444a50', .18, .48, 0);
    part(new THREE.BoxGeometry(.052, .07, .09), '#f5d791', .31, .33, 0);
    for (const x of [-.22, .21]) for (const z of [-.162, .162]) {
      part(new THREE.CylinderGeometry(.09, .09, .055, 10).rotateX(Math.PI / 2), '#42484f', x, .12, z);
    }
    for (let i = 0; i < 6; i++) {
      const puff = this.mini.mesh(new THREE.IcosahedronGeometry(.08, 0),
        new THREE.MeshLambertMaterial({ color: '#f9f4e7', transparent: true, depthWrite: false }),
        game.level.yard.x, game.level.yard.y, .59);
      puff.visible = false;
      puff.castShadow = false;
      this.steam.push(puff);
    }
    const resting = complete(game) ? route.points[route.points.length - 1] : game.level.yard;
    this.place(new THREE.Vector3(resting.x, 0, resting.y), new THREE.Vector3(1, 0, 0));
    this.mini.render();
  }

  private place(point: THREE.Vector3, direction: THREE.Vector3) {
    const angle = Math.atan2(-direction.z, direction.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const { mesh, x, z } of this.train) {
      mesh.position.x = point.x + x * cos + z * sin;
      mesh.position.z = point.z - x * sin + z * cos;
      mesh.rotation.y = angle;
    }
  }

  send(points: Point[], correct: boolean, done: () => void) {
    this.cancelInput();
    const path = curve(points);
    this.ride = { path, duration: Math.max(.45, path.getLength() / 3.4), elapsed: 0, done, correct };
    this.burst.start(points[0].x - .2, .09, points[0].y, 'dust', 1, 5);
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    const ride = this.ride;
    if (!ride) {
      if (this.contactPrevious !== undefined) {
        this.contactTime += Math.min(.1, Math.max(0, seconds - this.contactPrevious));
      }
      this.contactPrevious = seconds;
      if (seconds === 0 || !this.burst.update(this.contactTime)) {
        this.burst.clear();
        this.motion.stop();
      }
      return;
    }
    if (seconds === 0) ride.elapsed = ride.duration;
    else if (ride.previous !== undefined) ride.elapsed += Math.min(.1, Math.max(0, seconds - ride.previous));
    ride.previous = seconds;
    const progress = Math.min(1, ride.elapsed / ride.duration);
    const eased = progress * progress * (3 - 2 * progress);
    this.place(ride.path.getPoint(eased), ride.path.getTangent(eased));
    if (seconds === 0) this.burst.clear();
    else this.burst.update(ride.elapsed);
    this.steam.forEach((puff, index) => {
      const delay = .055 + index * .068;
      puff.visible = progress < 1 && ride.elapsed > delay;
      if (!puff.visible) return;
      const t = (ride.elapsed - delay) / ride.duration;
      const point = ride.path.getPoint(t * t * (3 - 2 * t));
      puff.position.set(point.x, .56 + delay, point.z + Math.sin(index * 2.1) * .05);
      puff.scale.setScalar(.63 + index * .13);
      (puff.material as THREE.MeshLambertMaterial).opacity = .72 - index * .09;
    });
    if (progress < 1) return;
    this.ride = undefined;
    this.motion.stop();
    ride.done();
    if (seconds !== 0 && ride.correct) {
      const end = ride.path.getPoint(1);
      this.burst.start(end.x, .18, end.z, 'spark', 2, 6);
      this.contactTime = 0;
      this.contactPrevious = seconds;
      this.motion.refresh();
    }
  };
}
