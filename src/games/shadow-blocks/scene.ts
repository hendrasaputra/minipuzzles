import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { MiniScene } from '../../shared/mini-scene';
import type { Game } from './engine';

const blockHeight = .48;
export const columns = 'ABCD';

export class ShadowScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private press?: { id: number; x: number; y: number; cell: string };
  private drop?: { mesh: THREE.Mesh; height: number; start?: number };

  constructor(host: HTMLElement, private readonly onTap: (cell: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const canvas = this.mini.canvas;
    canvas.setAttribute('aria-label', '3D stacks. Tap a square to add a block. Choose Rotate to look around.');
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private down = (event: PointerEvent) => {
    if (this.mini.rotating || event.button !== 0) return;
    const cell = this.mini.pick(event.clientX, event.clientY);
    if (cell === undefined) return;
    event.preventDefault();
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, cell };
  };

  private move = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
      this.cancelInput();
    }
  };

  private up = (event: PointerEvent) => {
    const press = this.press;
    if (press?.id !== event.pointerId) return;
    this.cancelInput();
    if (!this.mini.rotating && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8
      && this.mini.pick(event.clientX, event.clientY) === press.cell) this.onTap(Number(press.cell));
  };

  private animate = (time: number) => {
    const drop = this.drop;
    if (!drop) return;
    drop.start ??= time;
    const progress = time === 0 ? 1 : Math.min(1, (time - drop.start) / .18);
    drop.mesh.position.y = drop.height + .22 * (1 - progress) ** 2;
    if (progress === 1) {
      this.drop = undefined;
      this.motion.stop();
    }
  };

  update(game: Game, selected: number, added?: number, guideCell?: number) {
    this.cancelInput();
    this.motion.stop();
    this.drop = undefined;
    this.mini.clear();
    const { size } = game.level;
    this.mini.box(-.15, -.15, size + .15, size + .15, -.29, -.035, '#a697b1');
    for (let i = 0; i < size; i++) {
      this.mini.box(i + .15, size + .03, i + .85, size + .5, -.08, .02, '#8c7a9c');
      this.mini.box(-.5, i + .15, -.03, i + .85, -.08, .02, '#8c7a9c');
      this.mini.label(columns[i], i + .5, size + .265, .024);
      this.mini.label(String(i + 1), -.265, i + .5, .024);
    }
    game.stacks.forEach((height, index) => {
      const x = index % size;
      const y = Math.floor(index / size);
      const owner = String(index);
      this.mini.box(x + .025, y + .025, x + .975, y + .975, -.035, .035,
        index === guideCell ? '#e6b55f' : index === selected ? '#bca9d3' : '#e4dce8', owner);
      for (let i = 0; i < height; i++) {
        const bottom = .035 + i * blockHeight;
        const color = index === guideCell && i === height - 1 ? '#e6b55f' : i % 2 ? '#e8deef' : '#c4afd8';
        if (index === added && i === height - 1) {
          const center = bottom + (blockHeight - .025) / 2;
          const mesh = this.mini.mesh(new THREE.BoxGeometry(.76, blockHeight - .025, .76),
            new THREE.MeshLambertMaterial({ color }), x + .5, y + .5, center, owner);
          this.drop = { mesh, height: center };
        } else {
          this.mini.box(x + .12, y + .12, x + .88, y + .88, bottom, bottom + blockHeight - .025, color, owner);
        }
      }
    });
    this.mini.render();
    if (this.drop) this.motion.refresh();
  }
}
