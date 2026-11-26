const tileSize = 512;
const bladeColors = [
  '#496733', '#57763a', '#627e3f', '#708a45', '#80964c',
  '#93a05a', '#a39b61', '#878252',
];

function makeRandom() {
  let seed = 19491;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function tileNoise(random, cells) {
  const values = Float32Array.from({length: cells * cells}, random);
  const sample = (x, y) => values[(y % cells) * cells + x % cells];
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = x * cells / tileSize, v = y * cells / tileSize;
    const i = Math.floor(u), j = Math.floor(v);
    const sx = smooth(u - i), sy = smooth(v - j);
    return mix(mix(sample(i, j), sample(i + 1, j), sx),
      mix(sample(i, j + 1), sample(i + 1, j + 1), sx), sy);
  };
}

function makeGrassTile(T, anisotropy) {
  const random = makeRandom();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  const base = ctx.createImageData(tileSize, tileSize);
  const clumps = tileNoise(random, 17);
  const soil = tileNoise(random, 47);
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const index = (y * tileSize + x) * 4;
      const cover = clumps(x, y);
      const grit = (soil(x, y) + random() * .35 - .6) * 20;
      base.data[index] = 97 - cover * 30 + grit;
      base.data[index + 1] = 91 + cover * 26 + grit;
      base.data[index + 2] = 53 - cover * 13 + grit * .7;
      base.data[index + 3] = 255;
    }
  }
  ctx.putImageData(base, 0, 0);

  // Grass grows in small tufts. Leave some of the soil and thatch visible.
  for (let tuft = 0; tuft < 3900; tuft++) {
    const x = random() * tileSize, y = random() * tileSize;
    const cover = clumps(x, y);
    const blades = Math.floor(4 + cover * 11 + random() * 3);
    const heading = random() * Math.PI * 2;
    for (let blade = 0; blade < blades; blade++) {
      const angle = heading + (random() - .5) * 3.8;
      const bx = x + (random() - .5) * 12;
      const by = y + (random() - .5) * 12;
      const length = (3.4 + random() * 11) * (.68 + .5 * cover);
      const width = .45 + random() * .85;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const bend = (random() - .5) * length * .65;
      const tipX = bx + dx * length - dy * bend;
      const tipY = by + dy * length + dx * bend;
      const color = random();
      const green = Math.floor(random() * 6);
      ctx.fillStyle = bladeColors[color < .1 ? 6 + (green % 2) : green];
      const wrapX = bx < 18 ? tileSize : bx > tileSize - 18 ? -tileSize : 0;
      const wrapY = by < 18 ? tileSize : by > tileSize - 18 ? -tileSize : 0;
      for (const tx of wrapX ? [0, wrapX] : [0]) {
        for (const ty of wrapY ? [0, wrapY] : [0]) {
          ctx.beginPath();
          ctx.moveTo(bx + tx + dy * width, by + ty - dx * width);
          ctx.quadraticCurveTo(bx + tx + dx * length * .63, by + ty + dy * length * .63, tipX + tx, tipY + ty);
          ctx.quadraticCurveTo(bx + tx + dx * length * .43 - dy * width, by + ty + dy * length * .43 + dx * width,
            bx + tx - dy * width, by + ty + dx * width);
          ctx.fill();
        }
      }
    }
  }

  const texture = new T.CanvasTexture(canvas);
  texture.name = 'Procedural grass and thatch';
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

const grassGLSL = `
varying vec3 vGrassPosition;
uniform sampler2D uGrassTile;
uniform float uPitchTurf;

float grassHash(vec2 p) {
  vec3 q = fract(p.xyx * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float grassNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(grassHash(cell), grassHash(cell + vec2(1, 0)), f.x),
    mix(grassHash(cell + vec2(0, 1)), grassHash(cell + vec2(1)), f.x), f.y);
}

vec3 grassNormal(vec3 normal, vec3 viewPoint, float relief) {
  vec3 dx = dFdx(viewPoint), dy = dFdy(viewPoint);
  vec3 along = cross(dy, normal), across = cross(normal, dx);
  float gradientScale = dot(dx, along);
  vec3 gradient = sign(gradientScale) * (dFdx(relief) * along + dFdy(relief) * across);
  return normalize(max(abs(gradientScale), 1e-10) * normal - gradient);
}
`;

export function createGrassMaterials(T, renderer, compact) {
  const tile = makeGrassTile(T, Math.min(compact ? 2 : 8, renderer.capabilities.getMaxAnisotropy()));

  function material({vertexColors = false, pitch = false} = {}) {
    const surface = new T.MeshStandardMaterial({vertexColors, roughness: .96});
    surface.onBeforeCompile = shader => {
      shader.uniforms.uGrassTile = {value: tile};
      shader.uniforms.uPitchTurf = {value: Number(pitch)};
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrassPosition;')
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vGrassPosition = (modelMatrix * vec4(transformed, 1.)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + grassGLSL)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec2 turf = vGrassPosition.xz;
          vec2 rotated = vec2(turf.x + turf.y * .37, turf.y - turf.x * .37);
          float low = grassNoise(rotated * .046);
          float middle = grassNoise(rotated * .23 + low * 1.8);
          float cover = smoothstep(.18, .87, low * .65 + middle * .35);
          vec3 blades = mix(texture2D(uGrassTile, turf * .37).rgb,
            texture2D(uGrassTile, rotated * .53 + vec2(.31, .62)).rgb, smoothstep(.26, .74, middle));
          vec3 turfColor = blades * mix(vec3(.83, .88, .67), vec3(1.22, 1.36, .98), cover);
          float thatch = smoothstep(.15, .72, low * .76 + middle * .24);
          turfColor = mix(turfColor, vec3(.29, .22, .106), (1. - thatch) * .23 * (1. - uPitchTurf));
          float mowing = .97 + .09 * smoothstep(-.16, .16, sin(turf.y * .78));
          turfColor = mix(turfColor, (blades * vec3(.84, 1.31, .64) + vec3(.015, .027, .005)) * mowing, uPitchTurf);
          diffuseColor.rgb *= turfColor;
          float grassRelief = dot(blades, vec3(.23, .67, .10)) * .056
            * (1. - smoothstep(6., 24., vViewPosition.z));`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          normal = grassNormal(normal, -vViewPosition, grassRelief);`);
    };
    surface.customProgramCacheKey = () => 'campus-grass-v1';
    return surface;
  }

  return {terrain: material({vertexColors: true}), grass: material(), pitch: material({pitch: true})};
}
