import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { loadProp } from '../../shared/polyfork-prop';
import dockUrl from './dock-platform-section.glb?url';
import { dockLandings } from './dock-landings';
import { complete, crosses, type Game } from './engine';
import { oceanSurface } from './ocean';

const dropletsPerIsland = 5;
const confettiFrames = 20;
const bridgeBuildTime = .22;

export function islandName(index: number): string {
  return String.fromCharCode(65 + index);
}

export class BridgeScene {
  private readonly mini: MiniScene;
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst();
  private elapsed = 0;
  private previous?: number;
  private burstStart = 0;
  private growth?: { mesh: THREE.Mesh; axis: 'x' | 'z'; start: number; end: number; edge: number };
  private readonly docks = new THREE.Group();
  private dockTemplate?: THREE.Group;
  private game?: Game;
  private ocean?: THREE.ShaderMaterial;
  private readonly markers: HTMLDivElement;
  private readonly confetti: HTMLDivElement;
  private celebrationStart?: number;
  private spray?: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly droplet = new THREE.Object3D();
  private markerPoints: readonly { x: number; y: number }[] = [];
  private press?: { id: number; island: string; x: number; y: number };

  constructor(private readonly host: HTMLElement, private readonly onIsland: (island: number) => void) {
    this.mini = new MiniScene(host, this.cancelInput);
    this.mini.effects.add(this.burst.object, this.docks);
    const timber = new THREE.Color('#ac8056');
    void loadProp(dockUrl, color => color.lerp(timber, .5)).then(template => {
      this.dockTemplate = template;
      this.drawDocks();
      this.mini.repaint();
    }).catch(() => { /* The bridge remains visible while its landing prop is unavailable. */ });
    this.markers = document.createElement('div');
    this.markers.className = 'island-markers';
    this.markers.dataset.boardInput = '';
    this.confetti = document.createElement('div');
    this.confetti.className = 'bridge-confetti';
    this.confetti.setAttribute('aria-hidden', 'true');
    this.confetti.hidden = true;
    host.append(this.markers, this.confetti);
    host.addEventListener('camerachange', this.positionMarkers);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label',
      '3D islands with bridge targets. Tap one island, then a neighbor. Drag with two fingers to rotate the board.');
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

  private animate = (seconds: number) => {
    if (this.ocean) this.ocean.uniforms.time.value = seconds;
    this.animateShore(seconds);
    if (this.previous !== undefined) this.elapsed += Math.max(0, Math.min(.05, seconds - this.previous));
    this.previous = seconds;
    if (this.growth) {
      const { mesh, axis, start, end } = this.growth;
      const progress = seconds === 0 ? 1 : Math.min(1, this.elapsed / bridgeBuildTime);
      const extent = 1 - (1 - progress) ** 3;
      mesh.scale[axis] = Math.max(.001, extent);
      mesh.position[axis] = start + (end - start) * extent / 2;
      mesh.position.y = .2 - Math.sin(progress * Math.PI) * .034;
      if (progress === 1) {
        if (seconds !== 0) {
          const { x, z } = mesh.position;
          this.burst.start(axis === 'x' ? end : x, .065, axis === 'z' ? end : z, 'water', Math.round(end * 12), 10);
          this.burstStart = this.elapsed;
        }
        this.growth = undefined;
        this.drawDocks();
      }
    }
    if (seconds === 0) this.burst.clear();
    else this.burst.update(this.elapsed - this.burstStart);
    if (this.celebrationStart !== undefined) {
      const age = this.elapsed - this.celebrationStart;
      this.confetti.hidden = seconds === 0 || age < 0 || age >= 2.6;
      if (seconds === 0 || age >= 2.6) this.celebrationStart = undefined;
      if (!this.confetti.hidden) {
        const frame = Math.floor(age / 2.6 * confettiFrames);
        this.confetti.style.backgroundPositionX = `${frame / (confettiFrames - 1) * 100}%`;
      }
    }
  };

  private animateShore(seconds: number) {
    const spray = this.spray;
    if (!spray) return;
    spray.visible = seconds !== 0;
    if (!spray.visible) return;

    this.markerPoints.forEach(({ x, y }, island) => {
      const cycle = seconds + island * .37;
      const angle = Math.floor(cycle / 1.35) * 2.4 + island;
      for (let i = 0; i < dropletsPerIsland; i++) {
        const age = cycle % 1.35 - i * .042;
        const direction = angle + (i - 2) * .22;
        const height = age * (1.65 + (i % 3) * .32) - 5.5 * age * age;
        const radius = .59 + age * .57;
        const size = age >= 0 && height > 0 ? .075 - age * .09 : 0;
        this.droplet.position.set(x + Math.cos(direction) * radius, .035 + height, y + Math.sin(direction) * radius);
        this.droplet.scale.set(size, size * .75, size);
        this.droplet.updateMatrix();
        spray.setMatrixAt(island * dropletsPerIsland + i, this.droplet.matrix);
      }
    });
    spray.instanceMatrix.needsUpdate = true;
  }

  celebrate() {
    this.celebrationStart = this.elapsed + (this.growth ? bridgeBuildTime : 0);
    this.motion.refresh();
  }

  reject(game: Game, edgeIndex: number) {
    const { islands, edges } = game.level;
    const edge = edges[edgeIndex];
    if (!edge) return;
    const crossing = edges.find((other, i) => game.bridges[i] && crosses(islands, edge, other));
    if (!crossing) return;
    const a = islands[edge.a], b = islands[edge.b], c = islands[crossing.a];
    const horizontal = a.y === b.y;
    this.burst.start(horizontal ? c.x : a.x, .25, horizontal ? a.y : c.y, 'spark', edgeIndex, 7);
    this.burstStart = this.elapsed;
    this.motion.refresh();
  }

  private positionMarkers = () => {
    const rect = this.host.getBoundingClientRect();
    for (const [index, { x, y }] of this.markerPoints.entries()) {
      const point = this.mini.project(x, y, .42);
      const marker = this.markers.children[index] as HTMLElement;
      marker.style.left = `${point.x - rect.left}px`;
      marker.style.top = `${point.y - rect.top}px`;
    }
  };

  private drawMarkers(game: Game, selected: number, connected: readonly number[]) {
    const restoreFocus = this.markers.contains(document.activeElement);
    this.markerPoints = game.level.islands;
    const won = complete(game);
    this.markers.replaceChildren(...game.level.islands.map(({ goal }, i) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'island-marker';
      marker.dataset.island = islandName(i);
      marker.dataset.match = String(connected[i] === goal);
      marker.setAttribute('aria-label', `Island ${islandName(i)}, ${connected[i]} of ${goal} bridges`);
      marker.setAttribute('aria-pressed', String(i === selected));
      marker.innerHTML = `<strong>${islandName(i)}</strong><span>${connected[i]}/${goal}</span>`;
      marker.disabled = won;
      marker.onclick = () => { if (!this.mini.rotating) this.onIsland(i); };
      return marker;
    }));
    if (restoreFocus && !won) (this.markers.children[selected] as HTMLButtonElement).focus({ preventScroll: true });
  }

  private drawDocks() {
    this.docks.clear();
    if (!this.game || !this.dockTemplate) return;
    for (const dock of dockLandings(this.game, this.dockTemplate, this.growth?.edge)) this.docks.add(dock);
  }

  draw(game: Game, selected: number, connected: readonly number[], extended?: number) {
    this.game = game;
    this.motion.stop();
    this.ocean = undefined;
    this.growth = undefined;
    this.burst.clear();
    this.celebrationStart = undefined;
    this.confetti.hidden = true;
    this.elapsed = 0;
    this.previous = undefined;
    this.mini.clear();
    const { islands, edges } = game.level;
    const dropletCount = islands.length * dropletsPerIsland;
    if (this.spray?.count !== dropletCount) {
      if (this.spray) {
        this.spray.removeFromParent();
        this.spray.geometry.dispose();
        this.spray.material.dispose();
        this.spray.dispose();
      }
      this.spray = new THREE.InstancedMesh(
        new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: '#d5faff' }), dropletCount,
      );
      this.spray.frustumCulled = false;
      this.spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mini.effects.add(this.spray);
    }
    const left = Math.min(...islands.map(island => island.x)) - .95;
    const right = Math.max(...islands.map(island => island.x)) + .95;
    const top = Math.min(...islands.map(island => island.y)) - .95;
    const bottom = Math.max(...islands.map(island => island.y)) + .95;
    this.mini.box(left - .08, top - .08, right + .08, bottom + .08, -.28, -.09, '#194f73');
    this.mini.box(left, top, right, bottom, -.09, -.018, '#256a95');
    const { geometry, material } = oceanSurface(right - left, bottom - top);
    this.ocean = material;
    const water = this.mini.mesh(geometry, material, (left + right) / 2, (top + bottom) / 2, .022);
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;
    water.receiveShadow = false;

    edges.forEach(({ a, b }, index) => {
      const count = game.bridges[index];
      if (!count) return;
      const from = islands[a], to = islands[b];
      const horizontal = from.y === to.y;
      const axis = horizontal ? 'x' : 'z';
      const near = (horizontal ? from.x : from.y) + .42;
      const far = (horizontal ? to.x : to.y) - .42;
      for (const lane of count === 2 ? [-.14, .14] : [0]) {
        if (index === extended && lane >= 0) {
          const length = far - near;
          const mesh = this.mini.mesh(
            new THREE.BoxGeometry(horizontal ? length : .18, .08, horizontal ? .18 : length),
            new THREE.MeshLambertMaterial({ color: '#ac8056' }),
            horizontal ? (near + far) / 2 : from.x + lane,
            horizontal ? from.y + lane : (near + far) / 2, .2,
          );
          const reverse = selected === b;
          this.growth = { mesh, axis, start: reverse ? far : near, end: reverse ? near : far, edge: index };
        } else if (horizontal) {
          this.mini.box(near, from.y + lane - .09, far, from.y + lane + .09, .16, .24, '#ac8056');
        } else {
          this.mini.box(from.x + lane - .09, near, from.x + lane + .09, far, .16, .24, '#ac8056');
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
    });
    this.drawDocks();
    this.drawMarkers(game, selected, connected);
    this.mini.render();
    this.motion.refresh();
  }
}
