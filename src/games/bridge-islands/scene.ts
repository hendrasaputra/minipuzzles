import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import type { Game } from './engine';

export function islandName(index: number): string {
  return String.fromCharCode(65 + index);
}

export class BridgeScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private ripples: { mesh: THREE.Mesh; x: number }[] = [];
  private press?: { id: number; island: string; x: number; y: number };

  constructor(host: HTMLElement, private readonly onIsland: (island: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.motion = new MaterialMotion(seconds => {
      this.ripples.forEach(({ mesh, x }, i) => {
        mesh.position.x = x + Math.sin(seconds * 1.4 + i) * .17;
      });
    }, () => this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label',
      '3D islands with bridge targets. Tap one island, then a neighbor. Use Rotate to look around.');
    this.mini.canvas.addEventListener('pointerdown', this.down);
    this.mini.canvas.addEventListener('pointerup', this.up);
    this.mini.canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  private down = (event: PointerEvent) => {
    if (this.mini.rotating || event.button !== 0) return;
    const island = this.mini.pick(event.clientX, event.clientY);
    if (island === undefined) return;
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { id: event.pointerId, island, x: event.clientX, y: event.clientY };
  };

  private up = (event: PointerEvent) => {
    const press = this.press;
    this.cancelInput();
    if (this.mini.rotating || press?.id !== event.pointerId
      || Math.hypot(press.x - event.clientX, press.y - event.clientY) > 8) return;
    if (this.mini.pick(event.clientX, event.clientY) === press.island) this.onIsland(Number(press.island));
  };

  draw(game: Game, selected: number, connected: readonly number[]) {
    this.motion.stop();
    this.ripples = [];
    this.mini.clear();
    const { islands, edges } = game.level;
    const left = Math.min(...islands.map(island => island.x)) - .95;
    const right = Math.max(...islands.map(island => island.x)) + .95;
    const top = Math.min(...islands.map(island => island.y)) - .95;
    const bottom = Math.max(...islands.map(island => island.y)) + .95;
    this.mini.box(left - .08, top - .08, right + .08, bottom + .08, -.28, -.09, '#7f9ba2');
    this.mini.box(left, top, right, bottom, -.09, .025, '#a6ced0');

    for (let i = 0; i < 5; i++) {
      const x = left + (right - left) * (.18 + i % 3 * .29);
      const y = top + (bottom - top) * (.19 + i * .15);
      const mesh = this.mini.mesh(new THREE.BoxGeometry(.28, .008, .025),
        new THREE.MeshBasicMaterial({ color: '#cee7e1' }), x, y, .033);
      mesh.castShadow = false;
      this.ripples.push({ mesh, x });
    }

    edges.forEach(({ a, b }, index) => {
      const count = game.bridges[index];
      if (!count) return;
      const from = islands[a], to = islands[b];
      for (const lane of count === 2 ? [-.14, .14] : [0]) {
        if (from.y === to.y) {
          this.mini.box(from.x + .42, from.y + lane - .09, to.x - .42, from.y + lane + .09, .16, .24, '#ac8056');
        } else {
          this.mini.box(from.x + lane - .09, from.y + .42, from.x + lane + .09, to.y - .42, .16, .24, '#ac8056');
        }
      }
    });

    islands.forEach(({ x, y, goal }, i) => {
      const owner = String(i);
      const color = i === selected ? '#d1a35b' : '#aab88d';
      this.mini.mesh(new THREE.CylinderGeometry(.53, .62, .22, 12),
        new THREE.MeshLambertMaterial({ color: '#c0ae89' }), x, y, .13, owner);
      this.mini.mesh(new THREE.CylinderGeometry(.49, .54, .12, 12),
        new THREE.MeshLambertMaterial({ color }), x, y, .29, owner);
      const current = connected[i];
      const sign = current === goal ? '#526b50' : current > goal ? '#985846' : '#536b72';
      this.mini.box(x - .28, y - .28, x + .28, y + .28, .35, .395, sign, owner);
      this.mini.label(String(goal), x, y, .4);
      this.mini.box(x - .19, y + .36, x + .19, y + .69, .10, .15, '#697f78', owner);
      this.mini.label(islandName(i), x, y + .53, .155);
    });
    this.mini.render();
    this.motion.refresh();
  }
}
