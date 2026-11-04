import * as THREE from 'three';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';
import { currentGap, type Game, type Point, type View } from './engine';

const bridgeDuration = .22;

export class PathScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly direction = new THREE.Vector3();
  private readonly burst = new PixelBurst();
  private growing?: { mesh: THREE.Mesh; end: Point; elapsed: number; previous?: number; sparked: boolean };
  private game?: Game;

  constructor(private readonly host: HTMLElement, onView: () => void) {
    this.mini = new MiniScene(host, () => {});
    this.mini.canvas.setAttribute('aria-label', '3D platforms. Turn and tilt to overlap the gold ring and blue dot.');
    this.mini.effects.add(this.burst.object);
    this.mini.setMode('rotate');
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    host.addEventListener('camerachange', onView);
  }

  view(): View {
    const direction = this.mini.camera.getWorldDirection(this.direction).negate();
    return { yaw: Math.atan2(direction.x, direction.z), tilt: Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) };
  }

  nudge(key: string) {
    // Use the same camera steps as the shared keyboard controls.
    this.host.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  }

  dots(): { x: number; y: number }[] {
    const gap = this.game && currentGap(this.game);
    if (!gap) return [];
    const bounds = this.host.getBoundingClientRect();
    return gap.map(point => {
      const projected = this.mini.project(point.x, point.y, point.z + .19);
      return { x: projected.x - bounds.left, y: projected.y - bounds.top };
    });
  }

  draw(game: Game, animateBridge = false) {
    this.game = game;
    this.motion.stop();
    this.growing = undefined;
    this.burst.clear();
    this.mini.clear();
    const { points } = game.level;
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    this.mini.box(-.66, minY - .66, points[points.length - 1].x + .66, maxY + .66, -.23, 0, '#b3a8be');
    for (const [index, point] of points.entries()) {
      const { x, y, z } = point;
      this.mini.box(x - .23, y - .23, x + .23, y + .23, 0, z, '#bbb0c2');
      this.mini.box(x - .39, y - .39, x + .39, y + .39, z, z + .12,
        index <= game.history.length ? '#f1cc83' : '#e6deec');
    }
    for (let i = 0; i < game.history.length; i++) {
      const mesh = this.bridge(points[i], points[i + 1]);
      if (animateBridge && i === game.history.length - 1) {
        this.growing = { mesh, end: points[i + 1], elapsed: 0, sparked: false };
      }
    }
    this.mini.render();
    if (this.growing) this.motion.refresh();
  }

  private bridge(from: Point, to: Point) {
    const delta = new THREE.Vector3(to.x - from.x, to.z - from.z, to.y - from.y);
    const mesh = this.mini.mesh(new THREE.BoxGeometry(delta.length(), .11, .27),
      new THREE.MeshLambertMaterial({ color: '#c49254' }), (from.x + to.x) / 2,
      (from.y + to.y) / 2, (from.z + to.z) / 2 + .11);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), delta.normalize());
    return mesh;
  }

  private animate = (seconds: number) => {
    const growing = this.growing;
    if (!growing) return;
    if (seconds === 0) growing.elapsed = 1;
    else if (growing.previous !== undefined) {
      growing.elapsed += Math.min(.075, Math.max(0, seconds - growing.previous));
    }
    growing.previous = seconds;
    const t = Math.min(1, growing.elapsed / bridgeDuration);
    growing.mesh.scale.x = .08 + .92 * (1 - (1 - t) ** 3);
    if (seconds !== 0 && !growing.sparked && t === 1) {
      const { x, y, z } = growing.end;
      this.burst.start(x, z + .16, y, 'spark', this.game?.history.length, 5);
      growing.sparked = true;
    }
    if (!this.burst.update(growing.elapsed - bridgeDuration) && t === 1) {
      this.growing = undefined;
      this.motion.stop();
    }
  };
}
