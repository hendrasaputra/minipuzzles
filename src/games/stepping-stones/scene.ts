import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import { offsets, type Direction, type Game } from './engine';

export class StoneScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private press?: { id: number; x: number; y: number; tile: string; last: string; dragging: boolean };
  private pulse?: { mesh: THREE.Mesh; start?: number };

  constructor(host: HTMLElement, private readonly onStone: (cell: number, dragging: boolean) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
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
    const pulse = this.pulse;
    if (!pulse) return;
    pulse.start ??= seconds;
    const progress = seconds === 0 ? 1 : Math.min(1, (seconds - pulse.start) / .25);
    pulse.mesh.scale.setScalar(.7 + progress * .3);
    if (progress === 1) {
      this.pulse = undefined;
      this.motion.stop();
    }
  };

  draw(game: Game, animate = false) {
    this.motion.stop();
    this.pulse = undefined;
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
      this.mini.box(x + .11, y + .11, x + .89, y + .89, .14, .2, color, String(cell));
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
    if (animate) {
      const mesh = this.mini.mesh(new THREE.TorusGeometry(.27, .024, 5, 20),
        new THREE.MeshBasicMaterial({ color: '#f9e9b8' }), head % size + .5, Math.floor(head / size) + .5, .225);
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = false;
      this.pulse = { mesh };
    }
    this.mini.render();
    if (this.pulse) this.motion.refresh();
  }
}
