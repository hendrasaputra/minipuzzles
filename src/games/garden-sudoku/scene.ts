import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';
import { conflicts, type Game } from './engine';

const plantColors = ['#82a385', '#b86b86', '#b58a4b', '#688caa'];

export class GardenScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly leaves = new PixelBurst();
  private planting?: { mesh: THREE.Mesh; height: number; elapsed: number; previous?: number };
  private press?: { id: number; cell: string; x: number; y: number };

  constructor(host: HTMLElement, onSelect: (cell: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.effects.add(this.leaves.object);
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D Sudoku garden. Tap a square, then choose a plant. Choose Flat board for keyboard play.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || event.button !== 0) return;
      const cell = this.mini.pick(event.clientX, event.clientY);
      if (cell === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (this.mini.rotating || press?.id !== event.pointerId
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.cell) onSelect(Number(press.cell));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  clearFeedback() {
    if (this.planting) this.posePlant(1);
    this.planting = undefined;
    this.leaves.clear();
    this.motion.stop();
  }

  private posePlant(scale: number) {
    const plant = this.planting;
    if (!plant) return;
    plant.mesh.scale.y = scale;
    plant.mesh.position.y = .08 + plant.height * scale / 2;
  }

  private animate = (time: number) => {
    const plant = this.planting;
    if (!plant) return;
    if (time === 0) { this.clearFeedback(); return; }
    if (plant.previous !== undefined) plant.elapsed += Math.min(.075, Math.max(0, time - plant.previous));
    plant.previous = time;
    const progress = Math.min(1, plant.elapsed / .24);
    this.posePlant(1 - .42 * (1 - progress) ** 2 * Math.cos(progress * Math.PI * 2));
    if (!this.leaves.update(plant.elapsed)) this.clearFeedback();
  };

  draw(game: Game, selected: number, planted?: number) {
    this.clearFeedback();
    const clashes = conflicts(game.cells);
    this.mini.clear();
    this.mini.box(-.13, -.13, 4.34, 4.34, -.32, -.04, '#8f9b75');
    for (let cell = 0; cell < 16; cell++) {
      const col = cell % 4;
      const row = Math.floor(cell / 4);
      const x = col + (col >= 2 ? .21 : 0);
      const y = row + (row >= 2 ? .21 : 0);
      const value = game.cells[cell];
      const base = selected === cell ? '#e9b868' : '#e6dbc4';
      const owner = String(cell);
      this.mini.box(x + .03, y + .03, x + .97, y + .97, -.04, .08, base, owner);
      if (!value) continue;
      const color = clashes.has(cell) ? '#a64c4f' : plantColors[value - 1];
      const top = game.level.givens[cell] ? .3 : .22;
      if (planted === cell && !clashes.has(cell)) {
        const height = top - .08;
        const mesh = this.mini.mesh(new THREE.BoxGeometry(.74, height, .74),
          new THREE.MeshLambertMaterial({ color }), x + .5, y + .5, .08 + height / 2, owner);
        mesh.castShadow = false;
        this.planting = { mesh, height, elapsed: 0 };
        this.leaves.start(x + .5, .09, y + .5, 'leaf', cell, 4);
      } else {
        this.mini.box(x + .13, y + .13, x + .87, y + .87, .08, top, color, owner);
      }
      if (clashes.has(cell)) {
        const outline = '#8f4548';
        for (const offset of [.07, .89]) {
          this.mini.box(x + offset, y + .07, x + offset + .04, y + .93, .081, .09, outline);
          this.mini.box(x + .07, y + offset, x + .93, y + offset + .04, .081, .09, outline);
        }
      }
      this.mini.label(String(value), x + .5, y + .5, top + .01);
    }
    this.mini.render();
    if (this.planting) this.motion.refresh();
  }
}
