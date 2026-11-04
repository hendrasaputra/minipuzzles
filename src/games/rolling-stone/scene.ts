import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { directions, footprint, nextBlock, vectors, type Block, type Direction, type Game } from './engine';

function center(block: Block): THREE.Vector3 {
  return new THREE.Vector3(block.x + (block.stance === 'x' ? 1 : .5),
    block.stance === 'up' ? 1 : .5, block.y + (block.stance === 'y' ? 1 : .5));
}

function orientation(block: Block): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(
    block.stance === 'y' ? Math.PI / 2 : 0, 0, block.stance === 'x' ? Math.PI / 2 : 0));
}

export class StoneScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private game?: Game;
  private stone?: THREE.Mesh;
  private press?: { pointer: number; x: number; y: number };
  private rolling?: {
    start?: number;
    center: THREE.Vector3;
    rotation: THREE.Quaternion;
    pivot: THREE.Vector3;
    axis: THREE.Vector3;
  };

  constructor(host: HTMLElement, private readonly onMove: (direction: Direction) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D rolling stone board. Tap a landing tile in Play mode, or use the direction buttons. Stand the block on the gold goal.');
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  cancelInput = () => { this.press = undefined; };

  arrow(direction: Direction): string {
    return this.mini.direction(...vectors[direction]);
  }

  draw(game: Game) {
    this.motion.stop();
    this.rolling = undefined;
    this.game = game;
    this.mini.clear();
    const { tiles, goal, start } = game.level;
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        if (tiles[y][x] !== '#') continue;
        const target = x === goal.x && y === goal.y;
        const launch = x === start.x && y === start.y;
        this.mini.box(x + .02, y + .02, x + .98, y + .98, -.38, -.08, '#a69b89');
        this.mini.box(x + .025, y + .025, x + .975, y + .975, -.08, 0,
          target ? '#d5a849' : launch ? '#a3b498' : '#d8cbb1', `${x},${y}`);
        if (target) this.mini.label('★', x + .5, y + .5, .015);
      }
    }
    this.stone = this.mini.mesh(new THREE.BoxGeometry(.94, 1.94, .94),
      new THREE.MeshLambertMaterial({ color: '#69657f' }), 0, 0, 0);
    this.stone.castShadow = false;
    this.pose();
    this.mini.render();
  }

  roll(from: Block, direction: Direction) {
    const [dx, dy] = vectors[direction];
    const point = center(from);
    const half = (dx && from.stance === 'x') || (dy && from.stance === 'y') ? 1 : .5;
    this.rolling = {
      center: point,
      rotation: orientation(from),
      pivot: new THREE.Vector3(point.x + dx * half, 0, point.z + dy * half),
      axis: new THREE.Vector3(dy, 0, -dx),
    };
    this.motion.refresh();
  }

  private pose() {
    if (!this.stone || !this.game) return;
    this.stone.position.copy(center(this.game.block));
    this.stone.quaternion.copy(orientation(this.game.block));
  }

  private animate = (seconds: number) => {
    const roll = this.rolling;
    if (!roll || !this.stone) return;
    roll.start ??= seconds;
    const t = seconds === 0 ? 1 : Math.min(1, (seconds - roll.start) / .23);
    if (t >= 1) {
      this.pose();
      this.rolling = undefined;
      this.motion.stop();
      return;
    }
    const angle = new THREE.Quaternion().setFromAxisAngle(roll.axis, t * Math.PI / 2);
    this.stone.position.copy(roll.center).sub(roll.pivot).applyQuaternion(angle).add(roll.pivot);
    this.stone.quaternion.copy(angle).multiply(roll.rotation);
  };

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.mini.rotating) return;
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
  };

  private up = (event: PointerEvent) => {
    const press = this.press;
    const game = this.game;
    this.cancelInput();
    if (!game || press?.pointer !== event.pointerId || this.mini.rotating
      || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
    const tile = this.mini.pick(event.clientX, event.clientY);
    for (const direction of directions) {
      const next = nextBlock(game.level, game.block, direction);
      if (next && footprint(next).some(({ x, y }) => tile === `${x},${y}`)) {
        this.onMove(direction);
        return;
      }
    }
  };
}
