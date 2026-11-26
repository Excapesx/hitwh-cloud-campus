import { buildTreeModels } from './tree-models.js';
import { plantCampusTrees } from './tree-planting.js';

const cellSize = 96;

export function createCampusTrees(T, scene, layout, compact) {
  const nearLimit = compact ? 12 : 32;
  const nearDistance = compact ? 46 : 64;
  const cells = new Map();
  const windTime = {value: 0};
  const {models, updateTextures} = buildTreeModels(windTime);
  const {sites, audit} = plantCampusTrees(T, models, layout);
  const nearBatches = new Map();

  function makeBatch(parts, capacity, castShadow) {
    return parts.map(({geometry, material, receiveShadow, depth}, index) => {
      const mesh = new T.InstancedMesh(geometry, material, capacity);
      mesh.count = 0;
      mesh.castShadow = castShadow && (!compact || index === 0);
      mesh.receiveShadow = Boolean(receiveShadow);
      if (depth) mesh.customDepthMaterial = depth;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      scene.add(mesh);
      return mesh;
    });
  }

  function fillBatch(batch, trees) {
    for (const mesh of batch) {
      mesh.count = trees.length;
      mesh.visible = mesh.count > 0;
      if (!mesh.visible) continue;
      trees.forEach((site, index) => mesh.setMatrixAt(index, site.matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  for (const site of sites) {
    const {form, x, z} = site;
    const key = `${form}:${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`;
    if (!cells.has(key)) cells.set(key, {form, sites: []});
    site.cell = cells.get(key);
    site.cell.sites.push(site);
  }

  for (const cell of cells.values()) {
    cell.batch = makeBatch(models[cell.form].far, cell.sites.length, false);
    fillBatch(cell.batch, cell.sites);
    if (!nearBatches.has(cell.form)) nearBatches.set(cell.form, makeBatch(models[cell.form].near, nearLimit, true));
  }

  const lastPosition = new T.Vector3(Infinity, Infinity, Infinity);
  let nearSites = new Set();
  return {
    update(position, time) {
      windTime.value = time;
      const texturesChanged = updateTextures();
      if (lastPosition.distanceToSquared(position) < 4) return texturesChanged;
      lastPosition.copy(position);
      const candidates = [];
      for (const site of sites) {
        const distance = Math.hypot(site.x - position.x, site.y + site.size * .55 - position.y, site.z - position.z);
        const priority = distance - (nearSites.has(site) ? 5 : 0);
        if (priority < nearDistance) candidates.push({site, priority});
      }
      candidates.sort((a, b) => a.priority - b.priority);
      const next = new Set(candidates.slice(0, nearLimit).map(({site}) => site));
      const changed = new Set();
      for (const site of nearSites) if (!next.has(site)) changed.add(site.cell);
      for (const site of next) if (!nearSites.has(site)) changed.add(site.cell);
      if (changed.size === 0) return texturesChanged;
      nearSites = next;
      for (const cell of changed) fillBatch(cell.batch, cell.sites.filter(site => !nearSites.has(site)));
      const visibleNear = [...nearSites];
      for (const [form, batch] of nearBatches) fillBatch(batch, visibleNear.filter(site => site.form === form));
      return true;
    },
    audit,
    get nearCount() { return nearSites.size; }
  };
}
