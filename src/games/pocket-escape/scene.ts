import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import type { Room } from './engine';

export const places = ['Desk', 'Shelf', 'Cabinet', 'Window'];
const positions = [[1.1, 1.1], [3.7, 1.1], [1.1, 2.85], [3.7, 2.85]];
const colors = ['#bc9474', '#99a891', '#ab94ad', '#94aeb8'];

export class EscapeScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private press?: { owner: string; x: number; y: number; pointer: number };
  private door?: THREE.Mesh;
  private handle?: THREE.Mesh;
  private opening?: number;

  constructor(host: HTMLElement, inspect: (index: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D room. Tap numbered furniture to read a clue.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || event.button !== 0) return;
      const owner = this.mini.pick(event.clientX, event.clientY);
      if (!owner?.startsWith('clue-')) return;
      this.press = { owner, x: event.clientX, y: event.clientY, pointer: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      const press = this.press;
      if (press?.pointer === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
        this.press = undefined;
      }
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (this.mini.rotating || press?.pointer !== event.pointerId
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.owner) inspect(Number(press.owner.slice(5)));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  draw(room: Room, inspected: number[], won: boolean) {
    this.motion.stop();
    this.opening = undefined;
    this.mini.clear();
    this.mini.box(-.1, -.1, 5.1, 4.1, -.28, -.06, '#9e7b62');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) {
      this.mini.box(x + .015, y + .015, x + .985, y + .985, -.06, 0,
        (x + y) % 2 ? '#e3c5a3' : '#eed8bb');
    }
    this.mini.box(0, 0, 2.06, .16, 0, 1.12, '#b9a78e');
    this.mini.box(3.02, 0, 5, .16, 0, 1.12, '#b9a78e');
    this.mini.box(2.06, 0, 3.02, .16, 1.36, 1.53, '#9c8267');
    this.mini.box(2.05, -.13, 3.03, .18, 0, .03, '#e8cd91');
    this.mini.box(2.08, .12, 3, .25, .04, 1.36, '#555a58');
    const door = new THREE.BoxGeometry(.89, 1.27, .095).translate(.445, 0, 0);
    this.door = this.mini.mesh(door, new THREE.MeshLambertMaterial({ color: '#ad7751' }), 2.09, .31, .69);
    this.handle = this.mini.mesh(new THREE.SphereGeometry(.068, 8, 6),
      new THREE.MeshLambertMaterial({ color: '#e2bc66' }), 2.83, .38, .71);
    this.positionDoor(won ? -1.7 : 0);
    room.clues.forEach((clue, index) => {
      const [x, y] = positions[index];
      const owner = `clue-${index}`;
      const color = colors[index];
      this.mini.box(x - .45, y - .32, x + .45, y + .32, 0, .38, color, owner);
      this.mini.box(x - .48, y - .35, x + .48, y + .35, .38, .47, color, owner);
      this.mini.box(x - .25, y + .37, x + .25, y + .76, 0, .08,
        inspected.includes(index) ? '#6c8264' : '#795d4a', owner);
      this.mini.label(String(index + 1), x, y + .56, .085);
      if (clue.kind === 'count' || clue.kind === 'order') {
        clue.symbols.forEach((symbol, i) => {
          const token = symbol === 'circle' ? new THREE.CylinderGeometry(.055, .055, .04, 12)
            : new THREE.OctahedronGeometry(.06);
          const color = { circle: '#b97761', star: '#caa64f', diamond: '#608f96' }[symbol];
          this.mini.mesh(token, new THREE.MeshLambertMaterial({ color }),
            x + (i % 4 - 1.5) * .17, y + Math.floor(i / 4) * .17 - .08, .52, owner);
        });
      } else {
        this.mini.box(x - .27, y - .19, x + .27, y + .19, .47, .49, '#f4e7c9', owner);
        this.mini.box(x - .17, y - .09, x + .17, y - .065, .49, .5, '#a98c64', owner);
        this.mini.box(x - .17, y + .015, x + .13, y + .04, .49, .5, '#a98c64', owner);
      }
    });
    this.mini.render();
  }

  private positionDoor(angle: number) {
    if (!this.door || !this.handle) return;
    this.door.rotation.y = angle;
    const x = .74;
    const z = .07;
    this.handle.position.x = 2.09 + x * Math.cos(angle) + z * Math.sin(angle);
    this.handle.position.z = .31 - x * Math.sin(angle) + z * Math.cos(angle);
  }

  open() {
    this.opening = performance.now() / 1000;
    this.motion.refresh();
  }

  private animate = (seconds: number) => {
    if (this.opening === undefined || !this.door) return;
    const progress = seconds === 0 ? 1 : Math.min(1, Math.max(0, (seconds - this.opening) / .55));
    this.positionDoor(-1.7 * (1 - (1 - progress) ** 3));
    if (progress === 1) this.motion.stop();
  };
}
