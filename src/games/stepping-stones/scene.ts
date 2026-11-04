import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';
import { offsets, type Direction, type Game } from './engine';

export class StoneScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private press?: { id: number; x: number; y: number; tile: string; last: string; dragging: boolean };
  private readonly burst = new PixelBurst();
  private pulse?: { mesh: THREE.Mesh };
  private ripple?: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial };
  private retract?: { mesh: THREE.Mesh; x: number; z: number; dx: number; dz: number };
  private elapsed = 0;
  private previous?: number;

  constructor(host: HTMLElement, private readonly onStone: (cell: number, dragging: boolean) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', 'Stepping stones. Follow the stones from Start to Finish. Tap a stone or drag across the path.');
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  arrow(direction: Direction) {
    return this.mini.direction(...offsets[direction]);
  }

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.mini.rotating) return;
    const tile = this.mini.pick(event.clientX, event.clientY);
    if (tile === undefined) return;
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, tile, last: tile, dragging: false };
  };

  private move = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id !== event.pointerId) return;
    if (!press.dragging && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
      press.dragging = true;
      this.onStone(Number(press.tile), true);
    }
    if (!press.dragging) return;
    const tile = this.mini.pick(event.clientX, event.clientY);
    if (tile === undefined || tile === press.last) return;
    press.last = tile;
    this.onStone(Number(tile), true);
  };

  private up = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id !== event.pointerId) return;
    this.cancelInput();
    const tile = this.mini.pick(event.clientX, event.clientY);
    if (tile === undefined) return;
    if (press.dragging ? tile !== press.last : tile === press.tile) {
      this.onStone(Number(tile), press.dragging);
    }
  };

  private animate = (seconds: number) => {
    if (seconds === 0) this.elapsed = .6;
    else if (this.previous !== undefined) this.elapsed += Math.min(.075, Math.max(0, seconds - this.previous));
    this.previous = seconds;
    const t = Math.min(1, this.elapsed / .18);
    if (this.pulse) this.pulse.mesh.position.y = .17 - .038 * Math.sin(t * Math.PI * 2) * (1 - t);
    const ripple = this.ripple;
    if (ripple) {
      const age = Math.min(1, this.elapsed / .36);
      ripple.mesh.scale.setScalar(.6 + (1 - (1 - age) ** 2) * 1.5);
      ripple.material.opacity = .7 * (1 - age);
      ripple.mesh.visible = age < 1;
    }
    if (this.retract) {
      const { mesh, x, z, dx, dz } = this.retract;
      mesh.scale.set(dx ? 1 - t : 1, 1, dz ? 1 - t : 1);
      mesh.position.set(x + dx * (1 - t) / 2, .1075, z + dz * (1 - t) / 2);
      mesh.visible = t < 1;
    }
    if (!this.burst.update(this.elapsed) && t === 1) this.motion.stop();
  };

  draw(game: Game, animate = false, removed?: number) {
    this.motion.stop();
    this.burst.clear();
    this.pulse = undefined;
    this.ripple = undefined;
    this.retract = undefined;
    this.elapsed = 0;
    this.previous = undefined;
    this.mini.clear();
    const { size, route } = game.level;
    const head = game.path.at(-1)!;
    const start = route[0];
    const finish = route.at(-1)!;
    this.mini.box(-.19, -.19, size + .19, size + .19, -.28, -.05, '#8ba9a4');
    this.mini.box(-.12, -.12, size + .12, size + .12, -.05, 0, '#b2d3cf');
    for (const cell of route) {
      const x = cell % size;
      const y = Math.floor(cell / size);
      const visited = game.path.includes(cell);
      this.mini.box(x + .08, y + .08, x + .92, y + .92, 0, .14, '#9aa99a', String(cell));
      const color = cell === head ? '#c69851' : visited ? '#819c73' : cell === finish ? '#789ba7' : '#eee4cb';
      if (animate && cell === head) {
        const mesh = this.mini.mesh(new THREE.BoxGeometry(.78, .06, .78),
          new THREE.MeshLambertMaterial({ color }), x + .5, y + .5, .17, String(cell));
        this.pulse = { mesh };
      } else this.mini.box(x + .11, y + .11, x + .89, y + .89, .14, .2, color, String(cell));
      if (cell === start || cell === finish) this.mini.label(cell === start ? 'S' : 'F', x + .5, y + .5, .214);
    }
    for (let i = 1; i < game.path.length; i++) {
      const a = game.path[i - 1];
      const b = game.path[i];
      const x = a % size + .5;
      const y = Math.floor(a / size) + .5;
      const dx = b % size + .5;
      const dy = Math.floor(b / size) + .5;
      this.mini.box(Math.min(x, dx) - .055, Math.min(y, dy) - .055,
        Math.max(x, dx) + .055, Math.max(y, dy) + .055, .09, .125, '#b17f4d');
    }
    const x = head % size + .5;
    const z = Math.floor(head / size) + .5;
    if (animate) {
      this.burst.start(x + .42, .025, z, 'water', head, 5);
      const material = new THREE.MeshBasicMaterial({ color: '#d9f4df', transparent: true, depthWrite: false });
      const mesh = this.mini.mesh(new THREE.RingGeometry(.31, .34, 16), material, x, z, .011);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = mesh.receiveShadow = false;
      this.ripple = { mesh, material };
    }
    if (removed !== undefined) {
      const dx = removed % size + .5 - x;
      const dz = Math.floor(removed / size) + .5 - z;
      const mesh = this.mini.mesh(new THREE.BoxGeometry(Math.abs(dx) || .11, .035, Math.abs(dz) || .11),
        new THREE.MeshLambertMaterial({ color: '#b17f4d' }), x + dx / 2, z + dz / 2, .1075);
      this.retract = { mesh, x, z, dx, dz };
    }
    this.mini.render();
    if (this.pulse || this.retract) this.motion.refresh();
  }
}
