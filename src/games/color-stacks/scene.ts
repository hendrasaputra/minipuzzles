import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { sorted, type Game, type Move } from './engine';

export const palette = [
  { name: 'Coral', mark: 'C', paint: '#bc6e60' },
  { name: 'Blue', mark: 'B', paint: '#588da1' },
  { name: 'Green', mark: 'G', paint: '#75966b' },
  { name: 'Purple', mark: 'P', paint: '#8e7099' },
  { name: 'Yellow', mark: 'Y', paint: '#ad813c' },
];

export function stackName(index: number): string {
  return String.fromCharCode(65 + index);
}

const pitch = 1.17;
const blockHeight = .53;

export class StackScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private press?: { id: number; x: number; y: number; owner: string };
  private moving?: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; start?: number };

  constructor(host: HTMLElement, onStack: (index: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const canvas = this.mini.canvas;
    canvas.setAttribute('aria-label', '3D colored stacks. Tap a source stack, then a destination.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || event.button !== 0) return;
      const owner = this.mini.pick(event.clientX, event.clientY);
      if (owner === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, owner };
    });
    canvas.addEventListener('pointermove', event => {
      const press = this.press;
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
        this.cancelInput();
      }
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.cancelInput();
      if (press?.id !== event.pointerId || this.mini.rotating
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.owner) onStack(Number(press.owner));
    });
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private animate = (time: number) => {
    const moving = this.moving;
    if (!moving) return;
    moving.start ??= time;
    const progress = time === 0 ? 1 : Math.min(1, (time - moving.start) / .26);
    moving.mesh.position.lerpVectors(moving.from, moving.to, progress);
    moving.mesh.position.y += .44 * Math.sin(progress * Math.PI);
    if (progress === 1) {
      this.moving = undefined;
      this.motion.stop();
    }
  };

  draw(game: Game, selected: number, move?: Move) {
    this.cancelInput();
    this.motion.stop();
    this.moving = undefined;
    this.mini.clear();
    const columns = Math.min(4, game.stacks.length);
    const rows = Math.ceil(game.stacks.length / columns);
    const point = (index: number) => {
      const row = Math.floor(index / columns);
      const count = Math.min(columns, game.stacks.length - row * columns);
      return [(index % columns + (columns - count) / 2) * pitch + .57, row * pitch + .57] as const;
    };
    this.mini.box(-.08, -.08, columns * pitch + .04, rows * pitch + .12, -.29, -.08, '#b1a18c');
    this.mini.box(-.02, -.02, columns * pitch, rows * pitch + .07, -.08, 0, '#e5d7bf');
    game.stacks.forEach((stack, index) => {
      const [x, y] = point(index);
      const owner = String(index);
      this.mini.box(x - .49, y - .48, x + .49, y + .48, 0, .08,
        index === selected ? '#d9b567' : sorted(stack, game.level.capacity) ? '#a3b48e' : '#c5b5a0', owner);
      this.mini.box(x - .17, y + .40, x + .17, y + .61, .08, .13, '#6b5b52', owner);
      this.mini.label(stackName(index), x, y + .51, .136);
      stack.forEach((color, i) => {
        const low = .08 + blockHeight * i;
        const paint = palette[color].paint;
        if (move?.to === index && i === stack.length - 1) {
          const mesh = this.mini.mesh(new THREE.BoxGeometry(.79, blockHeight - .023, .79),
            new THREE.MeshLambertMaterial({ color: paint }), x, y, low + (blockHeight - .023) / 2, owner);
          mesh.castShadow = false;
          const [fromX, fromY] = point(move.from);
          const fromHeight = .08 + blockHeight * game.stacks[move.from].length + (blockHeight - .023) / 2;
          this.moving = { mesh, from: new THREE.Vector3(fromX, fromHeight, fromY), to: mesh.position.clone() };
        } else {
          this.mini.box(x - .395, y - .395, x + .395, y + .395, low, low + blockHeight - .023, paint, owner);
        }
      });
      if (stack.length) this.mini.label(palette[stack.at(-1)!].mark, x, y, .067 + blockHeight * stack.length);
    });
    this.mini.render();
    if (this.moving) this.motion.refresh();
  }
}
