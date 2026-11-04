import * as THREE from 'three';

export function oceanSurface(width: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 24, 24);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      deep: { value: new THREE.Color('#21688f') },
      shallow: { value: new THREE.Color('#45a2bf') },
      foam: { value: new THREE.Color('#a1d9e5') },
    },
    vertexShader: `
      uniform float time;
      varying vec2 surface;
      void main() {
        surface = position.xy;
        vec3 point = position;
        point.z += .026 * sin(surface.x * 2.9 + surface.y * 1.7 - time * 2.2)
                 + .012 * sin(surface.y * 4.0 - surface.x * 1.5 + time * 1.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 foam;
      varying vec2 surface;
      void main() {
        vec2 cell = floor(surface * 10.0) / 10.0;
        float swell = sin(cell.x * 2.9 + cell.y * 1.7 - time * 2.2);
        float cross = sin(cell.y * 4.0 - cell.x * 1.5 + time * 1.5);
        float light = floor((.5 + .34 * swell + .14 * cross) * 6.0) / 6.0;
        vec3 color = mix(deep, shallow, light);
        float crest = smoothstep(.94, .99, swell) * smoothstep(.38, .86, cross);
        gl_FragColor = vec4(mix(color, foam, crest * .64), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  return { geometry, material };
}
