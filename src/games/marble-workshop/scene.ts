import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { trackPorts, type Cell, type Direction, type Game, type Track } from './engine';
import { CUP_HEIGHT, MARBLE_RADIUS, ROLL_HEIGHT, RollEffect, marbleParticles, steps, trackCurve } from './roll-effect';

type Press = { pointer: number; x: number; y: number; target: string; dragged: boolean };

const marbleTarget = 'roll:marble';

export class MarbleScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private game?: Game;
  private press?: Press;
  private marble?: THREE.Mesh;
  private particles: THREE.Mesh[] = [];
  private activeRoll?: { effect: RollEffect; done: () => void };

  constructor(host: HTMLElement, private readonly onSelect: (id: string) => void,
    private readonly onRotate: (id: string) => void, private readonly onRoll: () => void) {
    this.mini = new MiniScene(host, this.clearPress);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D marble workshop. Tap a track to turn it or tap the marble to roll. Drag with two fingers to rotate the board.');
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancelInput);
  }

  update(game: Game, selectedId: string | null): void {
    this.cancelInput();
    this.activeRoll = undefined;
    this.motion.stop();
    this.game = game;
    this.draw(game, selectedId);
  }

  cancelInput = (): void => this.mini.cancelInput();

  roll(points: Cell[], reached: boolean, onDone: () => void): void {
    if (this.activeRoll) return;
    if (!this.marble || !points.length) {
      onDone();
      return;
    }
    this.cancelInput();
    this.activeRoll = { effect: new RollEffect(this.marble, this.particles, points, reached), done: onDone };
    this.motion.refresh();
  }

  private animate = (seconds: number): void => {
    const roll = this.activeRoll;
    if (!roll?.effect.update(seconds)) return;
    this.activeRoll = undefined;
    this.motion.stop();
    roll.done();
  };

  private clearPress = (): void => { this.press = undefined; };

  private targetAt(x: number, y: number): string | undefined {
    const id = this.mini.pick(x, y);
    return id === marbleTarget || this.game?.tracks.some(track => track.id === id) ? id : undefined;
  }

  private down = (event: PointerEvent): void => {
    if (event.button !== 0 || this.mini.rotating || this.activeRoll || this.game?.status !== 'playing') return;
    if (this.press) {
      this.clearPress();
      return;
    }
    const target = this.targetAt(event.clientX, event.clientY);
    if (!target) return;
    event.preventDefault();
    this.mini.canvas.setPointerCapture(event.pointerId);
    this.press = { pointer: event.pointerId, x: event.clientX, y: event.clientY, target, dragged: false };
  };

  private move = (event: PointerEvent): void => {
    const press = this.press;
    if (press?.pointer !== event.pointerId) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.dragged = true;
  };

  private up = (event: PointerEvent): void => {
    const press = this.press;
    if (press?.pointer !== event.pointerId) return;
    this.clearPress();
    if (press.dragged || this.mini.rotating || this.activeRoll
      || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
    if (this.targetAt(event.clientX, event.clientY) !== press.target) return;
    if (press.target === marbleTarget) {
      this.onRoll();
      return;
    }
    this.onSelect(press.target);
    this.onRotate(press.target);
  };

  private rail(points: THREE.Vector3[], radius: number, color: string, owner?: string): void {
    const curve = points.length === 2
      ? new THREE.LineCurve3(points[0], points[1])
      : new THREE.CatmullRomCurve3(points);
    this.mini.mesh(new THREE.TubeGeometry(curve, Math.max(1, points.length * 2), radius, 7, false),
      new THREE.MeshLambertMaterial({ color }), 0, 0, 0, owner);
  }

  private rails(track: Track, selected: boolean): void {
    const [entry, exit] = trackPorts(track);
    const curve = trackCurve(track, entry, exit, .204);
    const segments = track.kind === 'straight' ? 1 : 10;
    for (const side of [-1, 1]) {
      const rail: THREE.Vector3[] = [];
      for (let step = 0; step <= segments; step++) {
        const t = step / segments;
        const tangent = curve.getTangent(t);
        const point = curve.getPoint(t);
        point.x += tangent.z * .164 * side;
        point.z -= tangent.x * .164 * side;
        rail.push(point);
      }
      this.rail(rail, .047, selected ? '#e0a862' : '#bd8650', track.id);
    }
    const groove = trackCurve(track, entry, exit, 0);
    const liner = new THREE.TubeGeometry(groove, segments * 2, .143, 8, false);
    liner.scale(1, .13, 1);
    this.mini.mesh(liner, new THREE.MeshLambertMaterial({ color: '#876044' }), 0, 0, .156, track.id);
  }

  private terminalRails(cell: Cell, tracks: Track[], launch: boolean): void {
    const neighbor = tracks.find(track => Math.abs(track.x - cell.x) + Math.abs(track.y - cell.y) === 1);
    if (!neighbor) return;
    const dx = neighbor.x - cell.x;
    const dy = neighbor.y - cell.y;
    const x = cell.x + .5;
    const z = cell.y + .5;
    for (const side of [-1, 1]) {
      const offsetX = dy * .164 * side;
      const offsetZ = -dx * .164 * side;
      const start = launch ? -.25 : .29;
      this.rail([
        new THREE.Vector3(x + dx * start + offsetX, .204, z + dy * start + offsetZ),
        new THREE.Vector3(x + dx * .5 + offsetX, .204, z + dy * .5 + offsetZ),
      ], .047, '#c3975c');
    }
  }

  private draw(game: Game, selectedId: string | null): void {
    const { width, height, source, goal } = game.level;
    this.mini.clear();
    this.mini.box(-.17, -.17, width + .17, height + .17, -.39, -.12, '#927456');
    this.mini.box(-.12, -.12, width + .12, height + .12, -.12, -.035, '#be9c73');

    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      this.mini.box(x + .025, y + .025, x + .975, y + .975, -.035, .025,
        (x + y) % 2 ? '#e6d1ae' : '#ead9bc');
    }

    for (const track of game.tracks) {
      const { x, y, id } = track;
      const selected = id === selectedId;
      this.mini.box(x + .043, y + .043, x + .957, y + .957, .025, .113,
        selected ? '#a77443' : '#ad8055', id);
      this.mini.box(x + .065, y + .065, x + .935, y + .935, .113, .158,
        selected ? '#e9bd7e' : '#dcb484', id);
      this.rails(track, selected);
    }

    this.mini.box(source.x + .08, source.y + .08, source.x + .92, source.y + .92,
      .025, .155, '#c49767', marbleTarget);
    this.terminalRails(source, game.tracks, true);

    const bowl = new THREE.LatheGeometry([
      new THREE.Vector2(0, .06), new THREE.Vector2(.23, .06),
      new THREE.Vector2(.315, .12), new THREE.Vector2(.325, .153),
      new THREE.Vector2(.267, .153), new THREE.Vector2(.205, .093),
      new THREE.Vector2(0, .093),
    ], 24);
    this.mini.mesh(bowl, new THREE.MeshLambertMaterial({ color: '#fff0d4', side: THREE.DoubleSide }),
      goal.x + .5, goal.y + .5, 0);
    this.terminalRails(goal, game.tracks, false);

    const resting = game.status === 'won' ? goal : source;
    const geometry = new THREE.SphereGeometry(MARBLE_RADIUS, 20, 14);
    const position = geometry.getAttribute('position');
    const coral = new THREE.Color('#cc634f');
    const stripe = new THREE.Color('#ffcfac');
    const colors: number[] = [];
    for (let index = 0; index < position.count; index++) {
      const band = position.getY(index) + position.getX(index) * .65 + position.getZ(index) * .35;
      const color = Math.abs(band - .027) < .041 ? stripe : coral;
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.marble = this.mini.mesh(geometry, new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 72, specular: '#fff3d8',
    }), resting.x + .5, resting.y + .5, game.status === 'won' ? CUP_HEIGHT : ROLL_HEIGHT, marbleTarget);
    this.marble.castShadow = false;
    this.particles = marbleParticles(this.mini, source);
    this.mini.render();
  }
}
