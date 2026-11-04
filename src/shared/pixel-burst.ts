import * as THREE from 'three';
import { seededRandom } from './random-puzzle';
import mine from './fx/mine.png?url';
import splash from './fx/splash.png?url';
import landing from './fx/landing.png?url';

export type BurstKind = 'dust' | 'water' | 'spark' | 'leaf' | 'ice';
type Atlas = 'mine' | 'splash' | 'landing';
const palette: Record<BurstKind, string> = {
  dust: '#ae8c66', water: '#84d8df', spark: '#f0bd62', leaf: '#8fa96d', ice: '#b8def0',
};
const atlases = {
  mine: { url: mine, ratio: 240 / 260, pivot: 206 / 240, width: 1.26 },
  splash: { url: splash, ratio: 100 / 176, pivot: .78, width: 1.05 },
  landing: { url: landing, ratio: 80 / 176, pivot: .75, width: 1.15 },
};

export const burstDuration = .6;
const gravity = 11;

/** A particle lands once, bounces with less energy, and then rests. */
export function bounceHeight(speed: number, seconds: number): number {
  const t = Math.max(0, seconds);
  const landing = 2 * speed / gravity;
  if (t <= landing) return speed * t - gravity * t * t / 2;
  const bounce = t - landing;
  return Math.max(0, speed * .28 * bounce - gravity * bounce * bounce / 2);
}

/** One bounded pool, advanced by the owning scene's MaterialMotion clock. */
export class PixelBurst {
  readonly object = new THREE.Group();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  private particles = Array.from({ length: 12 }, () => ({
    mesh: new THREE.Mesh(this.geometry, this.material), x: 0, y: 0, z: 0, size: 0,
  }));
  private sprite?: THREE.Sprite;
  private texture?: THREE.Texture;

  constructor(atlas?: Atlas) {
    this.object.visible = false;
    for (const { mesh } of this.particles) {
      mesh.raycast = () => {};
      this.object.add(mesh);
    }
    if (atlas && typeof Image !== 'undefined') {
      const { url, ratio, pivot, width } = atlases[atlas];
      this.texture = new THREE.TextureLoader().load(url);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;
      this.texture.generateMipmaps = false;
      this.texture.repeat.set(1 / 8, 1);
      const material = new THREE.SpriteMaterial({ map: this.texture, depthWrite: false, transparent: true });
      this.sprite = new THREE.Sprite(material);
      this.sprite.center.set(.5, 1 - pivot);
      this.sprite.scale.set(width, width * ratio, 1);
      this.sprite.raycast = () => {};
      this.object.add(this.sprite);
    }
  }

  start(x: number, y: number, z: number, kind: BurstKind, seed = 1, count = 9) {
    const random = seededRandom(String(seed));
    this.object.position.set(x, y, z);
    this.object.visible = true;
    this.material.color.set(palette[kind]);
    this.particles.forEach((particle, i) => {
      const angle = random() * Math.PI * 2;
      const speed = .45 + random() * .9;
      particle.x = Math.cos(angle) * speed;
      particle.z = Math.sin(angle) * speed;
      particle.y = .65 + random() * 1.4;
      particle.size = .025 + random() * .045;
      particle.mesh.visible = i < count;
    });
    this.update(0);
  }

  update(seconds: number): boolean {
    if (!this.object.visible) return false;
    if (seconds >= burstDuration) { this.clear(); return false; }
    const t = Math.max(0, seconds);
    const glide = (1 - Math.exp(-3 * t)) / 3;
    const opacity = Math.min(1, (burstDuration - t) / .22);
    this.material.opacity = opacity;
    for (const { mesh, x, y, z, size } of this.particles) {
      if (!mesh.visible) continue;
      mesh.position.set(x * glide, bounceHeight(y, t) + size / 2, z * glide);
      mesh.scale.setScalar(size);
      mesh.rotation.set(t * 4, t * 3, t * 5);
    }
    if (this.sprite && this.texture) {
      this.texture.offset.x = Math.min(7, Math.floor(t / burstDuration * 8)) / 8;
      this.sprite.material.opacity = .72 * opacity;
    }
    return true;
  }

  clear() { this.object.visible = false; }

  dispose() {
    this.object.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.sprite?.material.dispose();
    this.texture?.dispose();
  }
}
