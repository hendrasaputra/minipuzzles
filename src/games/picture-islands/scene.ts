import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';
import { clues, type Game } from './engine';

const dropDuration = .16;
const dropHeight = .13;

export class IslandScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly finish = new PixelBurst();
  private lift?: { mesh: THREE.Mesh; y: number; elapsed: number; previous?: number; contact?: { cell: number; won: boolean } };
  private press?: { id: number; cell: string; x: number; y: number };

  constructor(host: HTMLElement, onCell: (cell: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.effects.add(this.finish.object);
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D picture puzzle. Tap tiles in Play mode. Choose Flat board for a keyboard grid.');
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.mini.rotating) return;
      const cell = this.mini.pick(event.clientX, event.clientY);
      if (!cell) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointermove', event => {
      const press = this.press;
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) this.press = undefined;
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (this.mini.rotating || press?.id !== event.pointerId
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.cell) onCell(Number(press.cell));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  clearFeedback() {
    if (this.lift) this.lift.mesh.position.y = this.lift.y;
    this.lift = undefined;
    this.finish.clear();
    this.motion.stop();
  }

  private animate = (time: number) => {
    const lift = this.lift;
    if (!lift) return;
    if (time === 0) { this.clearFeedback(); return; }
    if (lift.previous !== undefined) lift.elapsed += Math.min(.075, Math.max(0, time - lift.previous));
    lift.previous = time;
    const progress = Math.min(1, lift.elapsed / dropDuration);
    lift.mesh.position.y = lift.y + dropHeight * (1 - progress ** 2);
    if (progress < 1) return;
    if (lift.contact) {
      const { cell, won } = lift.contact;
      this.finish.start(lift.mesh.position.x, .25, lift.mesh.position.z, won ? 'spark' : 'dust', cell, won ? 5 : 3);
      lift.contact = undefined;
    }
    if (!this.finish.update(lift.elapsed - dropDuration)) this.clearFeedback();
  };

  draw(game: Game, guide: readonly number[], filled?: number, won = false) {
    this.clearFeedback();
    const { size } = game.puzzle;
    const { rows, columns } = clues(game.puzzle);
    this.mini.clear();
    this.mini.box(-.12, -.12, size + .12, size + .12, -.34, -.11, '#ad91a1');
    for (const [cell, mark] of game.marks.entries()) {
      const x = cell % size;
      const y = Math.floor(cell / size);
      if (filled === cell && mark === 1) {
        const height = .35;
        const center = -.11 + height / 2;
        const mesh = this.mini.mesh(new THREE.BoxGeometry(.91, height, .91),
          new THREE.MeshLambertMaterial({ color: '#a775ab' }), x + .5, y + .5, center + dropHeight, String(cell));
        mesh.castShadow = false;
        this.lift = { mesh, y: center, elapsed: 0, contact: { cell, won } };
      } else {
        this.mini.box(x + .045, y + .045, x + .955, y + .955, -.11, mark === 1 ? .24 : .045,
          mark === 1 ? '#a775ab' : guide.includes(cell) ? '#e9bc6e' : '#f2e5d7', String(cell));
      }
      if (mark === -1) {
        this.mini.box(x + .17, y + .17, x + .83, y + .83, .045, .06, '#b8a5ab', String(cell));
        this.mini.label('×', x + .5, y + .5, .07);
      }
    }
    rows.forEach((line, y) => (line.length ? line : [0]).forEach((number, i, list) => {
      const x = -.56 - (list.length - 1 - i) * .56;
      this.mini.box(x - .25, y + .17, x + .25, y + .83, -.12, .055, '#78627e');
      this.mini.label(String(number), x, y + .5, .07);
    }));
    columns.forEach((line, x) => (line.length ? line : [0]).forEach((number, i, list) => {
      const y = -.56 - (list.length - 1 - i) * .56;
      this.mini.box(x + .17, y - .25, x + .83, y + .25, -.12, .055, '#78627e');
      this.mini.label(String(number), x + .5, y, .07);
    }));
    this.mini.render();
    if (this.lift) this.motion.refresh();
  }
}
