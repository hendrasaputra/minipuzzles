import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { directions, footprint, nextBlock, vectors, type Block, type Direction, type Game } from './engine';

function center(block: Block): THREE.Vector3 {
  return new THREE.Vector3(block.x + (block.stance === 'x' ? 1 : .5),
    block.stance === 'up' ? 1 : .5, block.y + (block.stance === 'y' ? 1 : .5));
}

function orientation(block: Block): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(
    block.stance === 'y' ? Math.PI / 2 : 0, 0, block.stance === 'x' ? Math.PI / 2 : 0));
}

const rollDuration = .19;
const settleDuration = .12;

export class StoneScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst('landing');
  private game?: Game;
  private stone?: THREE.Mesh;
  private press?: { pointer: number; x: number; y: number };
  private rolling?: {
    elapsed: number;
    previous?: number;
    landed: boolean;
    center: THREE.Vector3;
    rotation: THREE.Quaternion;
    pivot: THREE.Vector3;
    axis: THREE.Vector3;
  };

  constructor(host: HTMLElement, private readonly onMove: (direction: Direction) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object);
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
    this.burst.clear();
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
    this.burst.clear();
    this.stone?.scale.setScalar(1);
    const [dx, dy] = vectors[direction];
    const point = center(from);
    const half = (dx && from.stance === 'x') || (dy && from.stance === 'y') ? 1 : .5;
    this.rolling = {
      elapsed: 0,
      landed: false,
      center: point,
      rotation: orientation(from),
      pivot: new THREE.Vector3(point.x + dx * half, 0, point.z + dy * half),
      axis: new THREE.Vector3(dy, 0, -dx),
    };
    this.motion.refresh();
  }

  private pose() {
    if (!this.stone || !this.game) return;
    this.stone.scale.setScalar(1);
    this.stone.position.copy(center(this.game.block));
    this.stone.quaternion.copy(orientation(this.game.block));
  }

  private animate = (seconds: number) => {
    const roll = this.rolling;
    const block = this.game?.block;
    if (!roll || !this.stone || !block) return;
    if (seconds === 0) {
      this.pose();
      this.burst.clear();
      this.rolling = undefined;
      this.motion.stop();
      return;
    }
    if (roll.previous !== undefined) {
      roll.elapsed += Math.min(.09, Math.max(0, seconds - roll.previous));
    }
    roll.previous = seconds;
    if (roll.elapsed < rollDuration) {
      const t = roll.elapsed / rollDuration;
      const eased = t * t * (3 - 2 * t);
      const angle = new THREE.Quaternion().setFromAxisAngle(roll.axis, eased * Math.PI / 2);
      this.stone.position.copy(roll.center).sub(roll.pivot).applyQuaternion(angle).add(roll.pivot);
      this.stone.quaternion.copy(angle).multiply(roll.rotation);
      return;
    }

    this.pose();
    const upright = block.stance === 'up';
    if (!roll.landed) {
      const { x, z } = this.stone.position;
      const dx = -roll.axis.z;
      const dy = roll.axis.x;
      const longEdge = (dx !== 0 && block.stance === 'x') || (dy !== 0 && block.stance === 'y');
      const reach = longEdge ? .9 : .4;
      this.burst.start(x + dx * reach, .04, z + dy * reach,
        upright ? 'spark' : 'dust', this.game?.history.length, upright ? 6 : 12);
      roll.landed = true;
    }
    const age = roll.elapsed - rollDuration;
    const t = Math.min(1, age / settleDuration);
    this.stone.position.y += (upright ? .028 : .016) * Math.sin(Math.PI * t) ** 2;
    const active = this.burst.update(age);
    if (!active && t === 1) {
      this.pose();
      this.rolling = undefined;
      this.motion.stop();
    }
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
