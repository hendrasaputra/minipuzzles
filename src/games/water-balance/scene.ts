import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import { PixelBurst } from '../../shared/pixel-burst';
import { dropTravel, firstContact, pourEnd, pourStart, settleEnd, transferProgress, waterSlope } from './pour-motion';
import { jugs, names, type Amounts, type Level, type Pour } from './engine';

const literHeight = .185;
const floor = .12;
const spacing = 1.75;
const radius = .49;
const waterRadius = radius - .04;

export class BalanceScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private water: THREE.Mesh[] = [];
  private surfaceVertices: number[][] = [];
  private shells: { mesh: THREE.Mesh; height: number }[][] = [];
  private readonly splash = new PixelBurst('splash');
  private readonly stream = new THREE.QuadraticBezierCurve3();
  private pourNumber = 0;
  private drops: THREE.Mesh[] = [];
  private press?: { id: number; x: number; y: number; jug: string };
  private animation?: {
    level: Level;
    move: Pour;
    before: Amounts;
    after: Amounts;
    elapsed: number;
    previous?: number;
    contacted: boolean;
    done?: () => void;
  };

  constructor(host: HTMLElement, onJug: (jug: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    this.mini.effects.add(this.splash.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const canvas = this.mini.canvas;
    canvas.setAttribute('aria-label', 'Three water jugs. Tap a source, then another jug to pour. Gold rings mark the goals.');
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.mini.rotating || this.animation?.done) return;
      const jug = this.mini.pick(event.clientX, event.clientY);
      if (jug === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, jug };
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (press?.id !== event.pointerId || this.mini.rotating || this.animation?.done
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.jug) onJug(Number(press.jug));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  draw(level: Level, current: Amounts, source: number, destination: number) {
    this.motion.stop();
    this.animation = undefined;
    this.splash.clear();
    this.mini.clear();
    this.shells = [];
    this.water = [];
    this.surfaceVertices = [];
    this.drops = [];
    this.mini.box(-.83, -.9, spacing * 2 + .83, .9, -.28, -.06, '#a89377');
    this.mini.box(-.8, -.86, spacing * 2 + .8, .86, -.06, 0, '#dbc7aa');
    for (const i of jugs) {
      const x = spacing * i;
      const height = level.capacities[i] * literHeight;
      const color = i === source ? '#446a78' : i === destination ? '#7b977b' : '#b3b0a2';
      const base = this.mini.mesh(new THREE.CylinderGeometry(.59, .62, floor, 24),
        new THREE.MeshLambertMaterial({ color }), x, 0, floor / 2, String(i));
      const glass = this.mini.mesh(new THREE.CylinderGeometry(radius, radius, height, 32, 1, true),
        new THREE.MeshLambertMaterial({ color: '#99c6cf', transparent: true, opacity: .21,
          side: THREE.DoubleSide, depthWrite: false }), x, 0, floor + height / 2, String(i));
      glass.castShadow = false;
      glass.receiveShadow = false;
      this.shells[i] = [base, glass].map(mesh => ({ mesh, height: mesh.position.y }));
      this.water[i] = this.mini.mesh(new THREE.CylinderGeometry(waterRadius, waterRadius, 1, 32),
        new THREE.MeshPhongMaterial({ color: '#5da9c6', shininess: 35, specular: '#c3f1f0' }),
        x, 0, floor, String(i));
      this.water[i].castShadow = false;
      this.water[i].receiveShadow = false;
      const positions = this.water[i].geometry.getAttribute('position');
      this.surfaceVertices[i] = [];
      for (let vertex = 0; vertex < positions.count; vertex++) {
        if (positions.getY(vertex) > 0) this.surfaceVertices[i].push(vertex);
      }
      this.fill(i, current[i]);

      const ring = (levelHeight: number, ringColor: string, width: number) => {
        const geometry = new THREE.TorusGeometry(radius + .01, width, 8, 40);
        geometry.rotateX(Math.PI / 2);
        const rim = this.mini.mesh(geometry, new THREE.MeshLambertMaterial({ color: ringColor }),
          x, 0, floor + levelHeight, String(i));
        rim.castShadow = false;
        this.shells[i].push({ mesh: rim, height: rim.position.y });
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

  private fill(jug: number, liters: number, slope = 0, lean = 0) {
    const water = this.water[jug];
    const height = liters * literHeight;
    water.visible = height > 0;
    const center = floor + height / 2;
    water.position.set(jug * spacing + Math.sin(lean) * center, Math.cos(lean) * center, 0);
    water.rotation.z = -lean;
    water.scale.y = Math.max(.001, height);
    // Shear the surface while keeping the floor and the mean water level fixed.
    const positions = water.geometry.getAttribute('position');
    for (const vertex of this.surfaceVertices[jug]) {
      positions.setY(vertex, .5 + positions.getX(vertex) * slope / water.scale.y);
    }
    positions.needsUpdate = true;
  }

  private tilt(jug: number, lean: number) {
    for (const { mesh, height } of this.shells[jug]) {
      mesh.position.set(jug * spacing + Math.sin(lean) * height, Math.cos(lean) * height, 0);
      mesh.rotation.z = -lean;
    }
  }

  play(level: Level, move: Pour, before: Amounts, after: Amounts, done: () => void) {
    this.splash.clear();
    if (this.animation) {
      this.tilt(this.animation.move.from, 0);
      for (const i of jugs) this.fill(i, before[i]);
    }
    this.animation = { level, move, before, after, elapsed: 0, contacted: false, done };
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    const animation = this.animation;
    if (!animation) return;
    if (seconds === 0) animation.elapsed = settleEnd;
    else if (animation.previous !== undefined) {
      animation.elapsed += Math.min(.09, Math.max(0, seconds - animation.previous));
    }
    animation.previous = seconds;

    const { elapsed, level, move: { from, to }, before, after } = animation;
    const progress = transferProgress(elapsed);
    const sourceAmount = before[from] + (after[from] - before[from]) * progress;
    const destinationAmount = before[to] + (after[to] - before[to]) * progress;
    const sourceHeight = floor + level.capacities[from] * literHeight;
    const direction = Math.sign(to - from);
    const returnStart = pourEnd - dropTravel;
    const lean = direction * .14 * Math.max(0, Math.min(1, elapsed / pourStart, (pourEnd - elapsed) / (pourEnd - returnStart)));
    this.tilt(from, lean);
    const sourceSlopeLimit = Math.min(sourceAmount, level.capacities[from] - sourceAmount) * literHeight / waterRadius;
    const sourceSlope = Math.max(-sourceSlopeLimit, Math.min(sourceSlopeLimit, Math.tan(lean)));
    this.fill(from, sourceAmount, sourceSlope, lean);
    this.fill(to, destinationAmount, waterSlope(elapsed, destinationAmount * literHeight,
      level.capacities[to] * literHeight, waterRadius));

    this.stream.v0.set(from * spacing + Math.sin(lean) * sourceHeight + direction * radius * Math.cos(lean),
      Math.cos(lean) * sourceHeight - direction * radius * Math.sin(lean), 0);
    this.stream.v2.set(to * spacing, floor + destinationAmount * literHeight + .012, 0);
    this.stream.v1.copy(this.stream.v0).lerp(this.stream.v2, .5);
    this.stream.v1.y = Math.max(this.stream.v0.y, floor + level.capacities[to] * literHeight) + .55;
    const interval = dropTravel / this.drops.length;
    this.drops.forEach((drop, i) => {
      const latest = elapsed - (pourStart + i * interval);
      const age = latest % dropTravel;
      const emitted = elapsed - age;
      drop.visible = seconds !== 0 && latest >= 0 && emitted <= returnStart && elapsed < pourEnd;
      if (drop.visible) {
        this.stream.getPoint(age / dropTravel, drop.position);
        drop.position.z += Math.sin(i * 2.4) * .06;
      }
    });

    if (seconds !== 0 && elapsed >= firstContact && !animation.contacted) {
      animation.contacted = true;
      this.splash.start(to * spacing, floor + before[to] * literHeight, 0, 'water', ++this.pourNumber, 10);
    }
    if (animation.contacted && elapsed < settleEnd) {
      this.splash.object.position.y = floor + destinationAmount * literHeight;
      this.splash.update(elapsed - firstContact);
    }

    if (elapsed >= settleEnd) {
      this.splash.clear();
      this.animation = undefined;
      this.motion.stop();
    }
    if (progress === 1 && animation.done) {
      const done = animation.done;
      animation.done = undefined;
      done();
    }
  };
}
