import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { affectedCells, type Game } from './engine';

const columns = 'ABCDE';
export const tileName = (size: number, cell: number) => `${columns[cell % size]}${Math.floor(cell / size) + 1}`;

function flowerGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const angle = i * Math.PI / 20;
    const radius = .25 + Math.cos(5 * angle) * .075;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

export class FlipScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst();
  private flowers: { parts: THREE.Mesh[]; growing: boolean; delay: number }[] = [];
  private elapsed = 0;
  private previous?: number;
  private press?: { id: number; tile: string; x: number; y: number };

  constructor(host: HTMLElement, private readonly onTile: (tile: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', 'Your garden. Columns A through E and numbered rows match the goal map. Tap a tile to flip its cross. Choose Rotate to look around.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || event.button !== 0) return;
      const tile = this.mini.pick(event.clientX, event.clientY);
      if (tile === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, tile, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointermove', event => {
      const press = this.press;
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) this.cancelInput();
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.cancelInput();
      if (this.mini.rotating || press?.id !== event.pointerId
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.tile) this.onTile(Number(press.tile));
    });
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private animate = (seconds: number) => {
    if (this.previous !== undefined) this.elapsed += Math.max(0, Math.min(.05, seconds - this.previous));
    this.previous = seconds;
    let changing = false;
    for (const { parts, growing, delay } of this.flowers) {
      const t = seconds === 0 ? 1 : Math.max(0, Math.min(1, (this.elapsed - delay) / .20));
      const scale = growing
        ? 1 - .34 * (1 - t) ** 2 * Math.cos(t * Math.PI * 2)
        : (1 - t) ** 2;
      for (const part of parts) {
        part.scale.setScalar(Math.max(.001, scale));
        part.visible = growing || t < 1;
      }
      changing ||= t < 1;
    }
    if (seconds === 0) this.burst.clear();
    if (!this.burst.update(this.elapsed) && !changing) this.motion.stop();
  };

  draw(game: Game, selected: number, pressed?: number) {
    this.motion.stop();
    this.elapsed = 0;
    this.previous = undefined;
    this.burst.clear();
    this.flowers = [];
    this.mini.clear();
    const { size } = game.level;
    const changed = pressed === undefined ? [] : affectedCells(size, pressed);
    this.mini.box(-.24, -.24, size + .1, size + .1, -.26, -.02, '#907360');
    for (let index = 0; index < size; index++) {
      this.mini.box(index + .2, -.44, index + .8, .02, -.09, .065, '#78624f');
      this.mini.label(columns[index], index + .5, -.22, .075);
      this.mini.box(-.44, index + .2, .02, index + .8, -.09, .065, '#78624f');
      this.mini.label(String(index + 1), -.22, index + .5, .075);
    }
    for (let cell = 0; cell < size ** 2; cell++) {
      const x = cell % size, y = Math.floor(cell / size);
      const owner = String(cell);
      const bloom = Boolean(game.current & (1 << cell));
      if (cell === selected) this.mini.box(x + .025, y + .025, x + .975, y + .975, -.02, .12, '#bd8b42', owner);
      this.mini.box(x + .07, y + .07, x + .93, y + .93, .015, .145, bloom ? '#edccd5' : '#dce2c7', owner);
      const flipping = changed.includes(cell);
      if (!bloom && !flipping) continue;
      const flowerOwner = bloom ? owner : undefined;
      const flower = this.mini.mesh(flowerGeometry(), new THREE.MeshLambertMaterial({ color: '#a04466' }), x + .5, y + .5, .157, flowerOwner);
      const center = this.mini.mesh(new THREE.CylinderGeometry(.087, .087, .034, 16), new THREE.MeshLambertMaterial({ color: '#f5d693' }),
        x + .5, y + .5, .174, flowerOwner);
      if (flipping) {
        flower.castShadow = center.castShadow = false;
        this.flowers.push({ parts: [flower, center], growing: bloom, delay: cell === pressed ? 0 : .035 });
      }
    }
    const bud = changed.find(cell => game.current & (1 << cell));
    const contact = bud ?? pressed;
    if (contact !== undefined) {
      this.burst.start(contact % size + .5, .18, Math.floor(contact / size) + .5, bud === undefined ? 'dust' : 'leaf', contact, 5);
    }
    this.mini.render();
    if (this.flowers.length) this.motion.refresh();
  }
}
