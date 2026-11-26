import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Tree, TreePreset } from '@dgreenheck/ez-tree';

// The four approved preview forms. Heights are normalized for use at different planting scales.
const profiles = {
  plane: {
    preset: 'Oak Large', spread: 1.16, yaw: .57, shoots: 12,
    bark: 0xd9d5ca, foliage: 0x415f2f, paint: 1 / 9,
    adjust(options) {
      options.branch.start[1] = .43;
      options.branch.angle[1] = 59;
      options.branch.length[1] *= 1.10;
    }
  },
  avenue: {
    preset: 'Ash Large', spread: .84, yaw: .22, shoots: 10,
    bark: 0xe0d7c2, foliage: 0x4d6634, paint: 1 / 10,
    adjust(options) {
      options.branch.start[1] = .43;
      options.branch.angle[1] = 44;
      options.leaves.size *= 1.03;
    }
  },
  courtyard: {
    preset: 'Oak Medium', spread: .97, yaw: .43, shoots: 11,
    bark: 0xbeb3a1, foliage: 0x3f6537,
    adjust(options) {
      options.branch.start[1] = .25;
      options.branch.angle[1] = 53;
      options.branch.angle[2] = 67;
      options.branch.length[0] *= .85;
      options.branch.length[1] *= 1.47;
      options.branch.children[0] = 9;
      options.branch.sections[2] = 6;
      options.leaves.count = 13;
      options.leaves.size *= 1.44;
    }
  },
  pine: {
    preset: 'Pine Medium', spread: 1.10, yaw: .35, shoots: 10,
    bark: 0xb8a38b, foliage: 0x3e5e49,
    adjust(options) {
      options.branch.angle[1] = 105;
      options.branch.children[0] = 51;
      options.branch.length[1] *= 1.15;
      options.leaves.count = 24;
      options.leaves.size *= 1.54;
    }
  }
};

const up = new T.Vector3(0, 1, 0);
const leafTones = [.86, .94, 1.01, 1.08];
const toneFor = index => leafTones[Math.imul(index, 2654435761) >>> 30];

function indexBranch(target, offset, branch, step, sides) {
  const {sectionCount, segmentCount} = branch;
  const stride = segmentCount + 1;
  for (let row = 0; row < sectionCount; row += step) {
    const next = Math.min(row + step, sectionCount);
    for (let side = 0; side < sides; side++) {
      const first = Math.floor(side * segmentCount / sides);
      const last = Math.floor((side + 1) * segmentCount / sides);
      const a = offset + row * stride;
      const b = offset + next * stride;
      target.push(a + first, b + first, a + last, a + last, b + first, b + last);
    }
  }
}

class CampusTree extends Tree {
  constructor(profile) {
    super();
    this.profile = profile;
    this.shootSites = [];
    this.distantIndices = [];
    const options = structuredClone(TreePreset[profile.preset]);
    options.bark.tint = profile.bark;
    if (options.type === 'deciduous') options.bark.textureScale = {x: 1, y: 10};
    profile.adjust(options);
    this.loadFromJson(options);
  }

  generateBranchIndices(offset, branch) {
    const {sectionCount, segmentCount, level} = branch;
    const step = [1, 2, 3, 4][level];
    indexBranch(this.branches.indices, offset, branch, step, segmentCount);
    // Keep the same limbs at a distance with fewer rings and faces per ring.
    const rings = level === 0 ? 5 : level === 1 ? 2 : 1;
    indexBranch(this.distantIndices, offset, branch, Math.ceil(sectionCount / rings), Math.min(segmentCount, level === 0 ? 6 : 3));

    if (level !== (this.options.type === 'evergreen' ? 1 : 2) || sectionCount < 2 * step) return;
    const center = row => {
      const sum = new T.Vector3();
      const vertex = new T.Vector3();
      for (let side = 0; side < segmentCount; side++) {
        const index = offset + row * (segmentCount + 1) + side;
        sum.add(vertex.fromArray(this.branches.verts, index * 3));
      }
      return sum.divideScalar(segmentCount);
    };
    const row = step * Math.floor(sectionCount * .5 / step);
    const origin = center(row);
    const forward = center(Math.min(row + step, sectionCount)).sub(origin).normalize();
    const length = branch.length * (this.options.type === 'evergreen' ? .30 : .225);
    this.shootSites.push({origin, forward, length, radius: branch.radius});
  }

  createBranchesGeometry() {
    super.createBranchesGeometry();
    const original = this.branchesMesh.geometry;
    const nearParts = [compactGeometry(original, original.index.array)];
    const farParts = [compactGeometry(original, this.distantIndices)];
    const {options, shootSites, profile} = this;
    const count = Math.min(profile.shoots, shootSites.length);
    const leafSize = options.leaves.size;
    options.leaves.size *= .96;
    for (let i = 0; i < count; i++) {
      const {origin, forward, length, radius} = shootSites[Math.floor((i + .5) * shootSites.length / count)];
      const lateral = new T.Vector3(-forward.z, 0, forward.x).normalize();
      if (i % 2) lateral.negate();
      const outward = lateral.clone().addScaledVector(up, .57).normalize();
      const branch = shootCurve(origin, forward, outward, length);
      const forkAt = .43;
      const fork = shootCurve(branch.getPointAt(forkAt), branch.getTangentAt(forkAt),
        lateral.negate().addScaledVector(up, .69).normalize(), length * .65);
      const branchRadius = Math.min(.25, radius * .37);
      const forkRadius = Math.min(.12, radius * .18);
      nearParts.push(taperedShoot(branch, branchRadius, 3, 5), taperedShoot(fork, forkRadius, 3, 5));
      farParts.push(taperedShoot(branch, branchRadius, 1, 3), taperedShoot(fork, forkRadius, 1, 3));
      this.growLeafClusters(branch, 11, i);
      this.growLeafClusters(fork, 9, i + count);
    }
    options.leaves.size = leafSize;
    this.branchesMesh.geometry = mergeGeometries(nearParts);
    this.distantWood = mergeGeometries(farParts);
    original.dispose();
    for (const part of [...nearParts, ...farParts]) part.dispose();
  }

  growLeafClusters(curve, count, seed) {
    for (let i = 0; i < count; i++) {
      const u = .21 + .76 * (i + .5) / count;
      const direction = curve.getTangentAt(u).addScaledVector(up, .24).normalize();
      const orientation = new T.Quaternion().setFromUnitVectors(up, direction);
      const spin = new T.Quaternion().setFromAxisAngle(up, 2.399963 * (i + seed));
      this.generateLeaf(curve.getPointAt(u), new T.Euler().setFromQuaternion(orientation.multiply(spin)));
    }
  }
}

function compactGeometry(geometry, sourceIndices) {
  const remap = new Map();
  const indices = Array.from(sourceIndices, index => {
    if (!remap.has(index)) remap.set(index, remap.size);
    return remap.get(index);
  });
  const compact = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const {array, itemSize, normalized} = attribute;
    const values = new array.constructor(remap.size * itemSize);
    for (const [oldIndex, newIndex] of remap) {
      values.set(array.subarray(oldIndex * itemSize, (oldIndex + 1) * itemSize), newIndex * itemSize);
    }
    compact.setAttribute(name, new T.BufferAttribute(values, itemSize, normalized));
  }
  compact.setIndex(indices);
  return compact;
}

function shootCurve(origin, forward, side, length) {
  const bend = origin.clone().addScaledVector(forward, length * .47).addScaledVector(side, length * .23);
  const tip = origin.clone().addScaledVector(forward, length * .68).addScaledVector(side, length * .68);
  return new T.QuadraticBezierCurve3(origin, bend, tip);
}

function taperedShoot(curve, radius, steps, sides) {
  const geometry = new T.TubeGeometry(curve, steps, 1, sides);
  const positions = geometry.attributes.position;
  const point = new T.Vector3();
  for (let ring = 0; ring <= steps; ring++) {
    const progress = ring / steps;
    const center = curve.getPointAt(progress);
    const thickness = radius * (1 - .97 * progress);
    for (let side = 0; side <= sides; side++) {
      const index = ring * (sides + 1) + side;
      point.fromBufferAttribute(positions, index).sub(center).multiplyScalar(thickness).add(center);
      positions.setXYZ(index, point.x, point.y, point.z);
    }
  }
  return geometry;
}

function setLeafColors(geometry, indices) {
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let vertex = 0; vertex < colors.length / 3; vertex += 8) {
    const cluster = vertex / 8;
    colors.fill(toneFor(indices ? indices[cluster] : cluster), vertex * 3, (vertex + 8) * 3);
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
}

function distantFoliage(geometry) {
  // Combine nearby crossed cards into a spray per occupied cell of the same crown.
  const cell = .10;
  const positions = geometry.attributes.position;
  const groups = new Map();
  const a = new T.Vector3(), b = new T.Vector3();
  for (let i = 0; i < positions.count; i += 8) {
    a.fromBufferAttribute(positions, i);
    b.fromBufferAttribute(positions, i + 2);
    const width = a.distanceTo(b);
    a.add(b).multiplyScalar(.5);
    const key = [a.x, a.y, a.z].map(v => Math.floor(v / cell)).join(',');
    const group = groups.get(key) ?? {center: new T.Vector3(), count: 0, i, width};
    group.center.add(a);
    group.count++;
    if (width > group.width) Object.assign(group, {i, width});
    groups.set(key, group);
  }

  const vertices = [], uvs = [], triangles = [], centers = [];
  for (const {i, width, center, count} of groups.values()) {
    a.fromBufferAttribute(positions, i);
    a.add(b.fromBufferAttribute(positions, i + 2)).multiplyScalar(.5);
    center.divideScalar(count);
    center.lerp(a, .48);
    const spread = Math.min(1.8, 1 + .22 * Math.sqrt(count - 1), Math.max(1, cell * 2.5 / width));
    const offset = vertices.length / 3;
    for (let j = 0; j < 8; j++) {
      b.fromBufferAttribute(positions, i + j).sub(a).multiplyScalar(spread).add(center);
      vertices.push(b.x, b.y, b.z);
    }
    uvs.push(0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1);
    triangles.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3,
      offset + 4, offset + 5, offset + 6, offset + 4, offset + 6, offset + 7);
    centers.push(i / 8);
  }
  const distant = new T.BufferGeometry();
  distant.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  distant.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  distant.setIndex(triangles);
  distant.computeVertexNormals();
  setLeafColors(distant, centers);
  return distant;
}

function paintTrunk(material, paint) {
  const top = (1.16 * paint).toFixed(4);
  const band = (1.06 * paint).toFixed(4);
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float vTrunkY;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTrunkY = position.y;');
    shader.fragmentShader = 'varying float vTrunkY;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      if (vTrunkY < ${top}) {
        vec3 paint = vTrunkY > ${band} ? vec3(.49,.18,.045) : vec3(.72,.72,.65);
        diffuseColor.rgb = paint * (.82 + .26 * diffuseColor.rgb);
      }
    `);
  };
  material.customProgramCacheKey = () => 'trunk-paint-' + top;
}

function leafMask(image) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 256 / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new T.CanvasTexture(canvas);
}

export function buildTreeModels(windTime) {
  const masks = new Map();
  const pending = [];
  const models = Object.fromEntries(Object.entries(profiles).map(([id, profile]) => {
    const instance = new CampusTree(profile);
    const {branchesMesh, leavesMesh, distantWood} = instance;
    const wood = branchesMesh.material;
    wood.specular.setHex(0x272621);
    if (profile.paint) paintTrunk(wood, profile.paint);

    const leafSource = leavesMesh.material.map;
    const alphaTest = leavesMesh.material.alphaTest;
    const distantLeaves = new T.MeshLambertMaterial({
      color: profile.foliage, vertexColors: true, side: T.DoubleSide, shadowSide: T.DoubleSide, alphaTest
    });
    const nearbyLeaves = distantLeaves.clone();
    // A distant texel blends several leaves with the gaps around them.
    // Keep that filtered coverage so the crown survives in the aerial view.
    distantLeaves.alphaTest = alphaTest * .29;
    for (const material of [nearbyLeaves, distantLeaves]) material.visible = false;
    nearbyLeaves.onBeforeCompile = shader => {
      shader.uniforms.uTreeTime = windTime;
      shader.vertexShader = 'uniform float uTreeTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float swing = uTreeTime * 1.25 + position.y * 4.5;
        transformed.xz += uv.y * .004 * vec2(sin(swing), cos(swing * .71));
      `);
    };
    nearbyLeaves.customProgramCacheKey = () => 'campus-leaf-motion';
    const depth = new T.MeshDepthMaterial({alphaTest, side: T.DoubleSide});
    pending.push({leafSource, materials: [distantLeaves, nearbyLeaves, depth]});
    leavesMesh.material.dispose();

    const dimensions = new T.Box3().setFromObject(instance);
    const factor = 1 / (dimensions.max.y - dimensions.min.y);
    const branchGeometry = branchesMesh.geometry;
    const leafGeometry = leavesMesh.geometry;
    for (const geometry of [branchGeometry, leafGeometry, distantWood]) {
      geometry.scale(factor * profile.spread, factor, factor * profile.spread);
      geometry.translate(0, -dimensions.min.y * factor, 0);
      geometry.computeBoundingBox();
    }
    setLeafColors(leafGeometry);
    const farCanopy = distantFoliage(leafGeometry);
    farCanopy.computeBoundingBox();
    const bounds = branchGeometry.boundingBox.clone().union(distantWood.boundingBox)
      .union(leafGeometry.boundingBox).union(farCanopy.boundingBox);
    const near = [
      {geometry: branchGeometry, material: wood, receiveShadow: true},
      {geometry: leafGeometry, material: nearbyLeaves, depth}
    ];
    const far = [
      {geometry: distantWood, material: wood, receiveShadow: true},
      {geometry: farCanopy, material: distantLeaves}
    ];
    return [id, {near, far, bounds, yaw: profile.yaw}];
  }));

  return {
    models,
    updateTextures() {
      let changed = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        const {leafSource, materials} = pending[i];
        if (!leafSource.image?.width) continue;
        if (!masks.has(leafSource)) masks.set(leafSource, leafMask(leafSource.image));
        for (const material of materials) {
          material.map = masks.get(leafSource);
          material.visible = true;
          material.needsUpdate = true;
        }
        pending.splice(i, 1);
        changed = true;
      }
      return changed;
    }
  };
}
