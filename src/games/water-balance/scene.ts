import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import { jugs, names, type Amounts, type Level, type Pour } from './engine';

const literHeight = .185;
const floor = .12;
const spacing = 1.75;
const radius = .49;

export class BalanceScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private water: THREE.Mesh[] = [];
  private drops: THREE.Mesh[] = [];
  private press?: { id: number; x: number; y: number; jug: string };
  private animation?: {
    move: Pour; before: Amounts; after: Amounts; elapsed: number; previous?: number;
    arc: THREE.QuadraticBezierCurve3; done: () => void;
  };

  constructor(host: HTMLElement, onJug: (jug: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const canvas = this.mini.canvas;
    canvas.setAttribute('aria-label', 'Three water jugs. Tap a source, then another jug to pour. Gold rings mark the goals.');
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.mini.rotating || this.animation) return;
      const jug = this.mini.pick(event.clientX, event.clientY);
      if (jug === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, jug };
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (press?.id !== event.pointerId || this.mini.rotating || this.animation
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.jug) onJug(Number(press.jug));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  draw(level: Level, current: Amounts, source: number, destination: number) {
    this.motion.stop();
    this.animation = undefined;
    this.mini.clear();
    this.water = [];
    this.drops = [];
    this.mini.box(-.83, -.9, spacing * 2 + .83, .9, -.28, -.06, '#a89377');
    this.mini.box(-.8, -.86, spacing * 2 + .8, .86, -.06, 0, '#dbc7aa');
    for (const i of jugs) {
      const x = spacing * i;
      const height = level.capacities[i] * literHeight;
      const color = i === source ? '#446a78' : i === destination ? '#7b977b' : '#b3b0a2';
      this.mini.mesh(new THREE.CylinderGeometry(.59, .62, floor, 24),
        new THREE.MeshLambertMaterial({ color }), x, 0, floor / 2, String(i));
      const glass = this.mini.mesh(new THREE.CylinderGeometry(radius, radius, height, 32, 1, true),
        new THREE.MeshLambertMaterial({ color: '#99c6cf', transparent: true, opacity: .21,
          side: THREE.DoubleSide, depthWrite: false }), x, 0, floor + height / 2, String(i));
      glass.castShadow = false;
      glass.receiveShadow = false;
      this.water[i] = this.mini.mesh(new THREE.CylinderGeometry(radius - .04, radius - .04, 1, 32),
        new THREE.MeshPhongMaterial({ color: '#5da9c6', shininess: 35, specular: '#c3f1f0' }),
        x, 0, floor, String(i));
      this.water[i].castShadow = false;
      this.water[i].receiveShadow = false;
      this.fill(i, current[i]);

      const ring = (levelHeight: number, ringColor: string, width: number) => {
        const geometry = new THREE.TorusGeometry(radius + .01, width, 8, 40);
        geometry.rotateX(Math.PI / 2);
        const rim = this.mini.mesh(geometry, new THREE.MeshLambertMaterial({ color: ringColor }),
          x, 0, floor + levelHeight, String(i));
        rim.castShadow = false;
      };
      ring(height, color, .025);
      ring(level.goal[i] * literHeight, '#b38332', .023);
      this.mini.label(names[i], x, .7, .015);
    }
    const top = Math.max(...level.capacities) * literHeight + .7;
    for (let i = 0; i < 12; i++) {
      const drop = this.mini.mesh(new THREE.SphereGeometry(.034, 8, 6),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? '#c1ecf0' : '#66b6cd' }),
        spacing, 0, top);
      drop.castShadow = false;
      drop.visible = false;
      this.drops.push(drop);
    }
    this.mini.render();
  }

  private fill(jug: number, liters: number) {
    const water = this.water[jug];
    const height = liters * literHeight;
    water.visible = height > 0;
    water.position.y = floor + height / 2;
    water.scale.y = Math.max(.001, height);
  }

  play(level: Level, move: Pour, before: Amounts, after: Amounts, done: () => void) {
    const start = new THREE.Vector3(move.from * spacing, floor + level.capacities[move.from] * literHeight, 0);
    const end = new THREE.Vector3(move.to * spacing, floor + level.capacities[move.to] * literHeight, 0);
    const middle = start.clone().lerp(end, .5);
    middle.y = Math.max(start.y, end.y) + .65;
    this.animation = {
      move, before, after, elapsed: 0,
      arc: new THREE.QuadraticBezierCurve3(start, middle, end), done,
    };
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    const animation = this.animation;
    if (!animation) return;
    if (seconds === 0) animation.elapsed = 1;
    else if (animation.previous !== undefined) {
      animation.elapsed += Math.min(.09, Math.max(0, seconds - animation.previous));
    }
    animation.previous = seconds;
    const progress = Math.min(1, animation.elapsed / .65);
    for (const i of [animation.move.from, animation.move.to]) {
      this.fill(i, animation.before[i] + (animation.after[i] - animation.before[i]) * progress);
    }
    this.drops.forEach((drop, i) => {
      const phase = (progress * 2.8 - i / this.drops.length) % 1;
      drop.visible = progress < 1 && phase >= 0;
      if (drop.visible) {
        animation.arc.getPoint(phase, drop.position);
        drop.position.z += Math.sin(i * 2.4) * .06;
      }
    });
    if (progress === 1) {
      this.animation = undefined;
      this.motion.stop();
      animation.done();
    }
  };
}
