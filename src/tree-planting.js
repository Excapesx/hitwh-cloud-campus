import { axisTreeSites, buildings, campusAxis, displayLayout, height, inside, lakes, outline } from './campus-data.js';
import { footprintBounds } from './footprint.js';
import { distanceToRoad } from './model.js';

const streetForms = {
  '南门中轴路': 'plane',
  '桃苑南路': 'plane',
  '西门道路': 'plane',
  '体育场西路': 'plane',
  '桃苑北路': 'plane',
  '主楼环路': 'avenue',
  '远遥路': 'plane',
  '槐云路': 'avenue',
  '学苑路': 'avenue',
  '学堂路': 'avenue',
  '湖西路': 'plane',
  '湖东路': 'plane',
  '科苑环路': 'courtyard',
  '西南支路': 'plane',
  '学子路': 'avenue',
  '学子林北路': 'avenue',
  '东侧道路': 'avenue',
  '中区道路': 'avenue',
  '生活区道路': 'courtyard',
  '环山路': 'pine',
  '福山路': 'pine',
  '滨海接线': 'pine'
};
const streetSizes = {plane: 6.8, avenue: 6.6, courtyard: 5.3, pine: 5.8};

function segments({curve, width}) {
  const points = curve.getPoints(Math.max(8, Math.ceil(curve.getLength() / 2.5)));
  return points.slice(1).map((b, i) => ({a: points[i], b, width}));
}

function closeToLine(x, z, line, offset) {
  const margin = line.width / 2 + offset;
  const {a, b} = line;
  return x > Math.min(a.x, b.x) - margin && x < Math.max(a.x, b.x) + margin &&
    z > Math.min(a.z, b.z) - margin && z < Math.max(a.z, b.z) + margin &&
    distanceToRoad(x, z, line) < margin;
}

function inArea(x, z, area, margin = 0) {
  return x > area.minX - margin && x < area.maxX + margin &&
    z > area.minZ - margin && z < area.maxZ + margin;
}

function filledByPlaza({distance, lateral}) {
  const side = Math.abs(lateral);
  const mainForecourt = distance > -10 && distance < campusAxis.colonnade + 5 && side < 38;
  const displayForecourt = distance > displayLayout.distance - 12 && distance < displayLayout.distance + 14 && side < 21;
  return mainForecourt || displayForecourt;
}

export function plantCampusTrees(T, models, {roads, walkways, colliders, landmarks}) {
  const foliageSites = [];
  const mapRoads = roads.flatMap(segments);
  const walkwayLines = walkways.flatMap(segments);
  const lakeAreas = lakes;
  const courts = buildings.filter(b => ['stadium', 'court'].includes(b.shape) || b.id === 'racing');
  const plantingAreas = [...lakeAreas, ...courts.map(footprintBounds)];
  const buildingAreas = landmarks.filter(entry => entry.spec?.kind !== 'sport' && entry.spec?.kind !== 'gate')
    .flatMap(entry => entry.faces.map(footprintBounds));
  // Use the built model's solid envelopes, including photo-model wings and columns.
  const solids = [...colliders];
  for (const entry of landmarks) {
    if (entry.spec?.kind === 'sport') continue;
    for (const face of entry.faces) {
      const minY = height(face.x, face.z) - .1;
      const maxY = Math.max(minY + 1, face.top ?? entry.top);
      solids.push({...footprintBounds(face), minY, maxY});
    }
  }
  const minX = Math.min(...outline.map(p => p.x));
  const maxX = Math.max(...outline.map(p => p.x));
  const minZ = Math.min(...outline.map(p => p.z));
  const maxZ = Math.max(...outline.map(p => p.z));
  let seed = 917113;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const matrix = new T.Matrix4();
  const fitMatrix = new T.Matrix4();
  const crownScale = new T.Vector3();
  const extents = new T.Box3();
  const margin = .40;

  function candidate(form, x, z, size, heading, street = null, side = 0) {
    if (!inside(x, z) || filledByPlaza(campusAxis.project(x, z))) return null;
    if (plantingAreas.some(area => inArea(x, z, area, .9))) return null;
    if (mapRoads.some(line => closeToLine(x, z, line, 1.82)) ||
        walkwayLines.some(line => closeToLine(x, z, line, .65))) return null;
    if (foliageSites.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < 3.8 ** 2)) return null;

    const model = models[form];
    const y = height(x, z) - .11;
    const angle = heading + model.yaw;
    matrix.makeRotationY(angle).scale(crownScale.setScalar(size));
    extents.copy(model.bounds).applyMatrix4(matrix);
    let fitX = 1, fitZ = 1;
    for (const solid of solids) {
      if (y + extents.max.y < solid.minY - margin || y + extents.min.y > solid.maxY + margin) continue;
      const left = solid.minX - margin, right = solid.maxX + margin;
      const back = solid.minZ - margin, front = solid.maxZ + margin;
      if (x + extents.max.x * fitX <= left || x + extents.min.x * fitX >= right ||
          z + extents.max.z * fitZ <= back || z + extents.min.z * fitZ >= front) continue;

      // Squeeze only the axis that gives the crown the most room to keep its shape.
      const clearX = x < left ? (left - x) / extents.max.x : x > right ? (x - right) / -extents.min.x : 0;
      const clearZ = z < back ? (back - z) / extents.max.z : z > front ? (z - front) / -extents.min.z : 0;
      if (Math.max(clearX, clearZ) < .68) return null;
      if (clearX >= .68 && (clearZ < .68 || clearX / fitX >= clearZ / fitZ)) fitX = clearX;
      else fitZ = clearZ;
    }
    matrix.premultiply(fitMatrix.makeScale(fitX, 1, fitZ)).setPosition(x, y, z);
    return {form, street, side, x, y, z, size, fitX, fitZ, matrix: matrix.clone()};
  }

  // The South Gate avenue and both rows of the main axis use the same broad-crown form.
  const axisStreet = '南门中轴路';
  function plantAxisPair(distance, lateral, size) {
    for (const offset of [lateral, lateral + .7, lateral + 1.4]) {
      const pair = [-1, 1].map(side => {
        const point = campusAxis.at(distance, side * offset);
        return candidate(streetForms[axisStreet], point.x, point.z, size, campusAxis.yaw + .15, axisStreet, side);
      });
      if (pair.every(Boolean)) {
        foliageSites.push(...pair);
        return;
      }
    }
  }
  for (const {distance, lateral} of axisTreeSites) {
    if (lateral > 0) plantAxisPair(distance, lateral, lateral < 10 ? 6.2 : 6);
  }
  plantAxisPair(campusAxis.length - 12, 7.2, 6.8);

  // A single arc-length station defines both trees at that point on the road.
  for (const {name, width, curve} of roads) {
    const form = streetForms[name];
    if (!form || name === axisStreet) continue;
    const length = curve.getLength();
    const count = Math.max(1, Math.floor(length / 9.4));
    for (let index = 0; index < count; index++) {
      const u = (index + .5) / count;
      const point = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u);
      const heading = Math.atan2(tangent.x, tangent.z) + (random() - .5) * .20;
      const size = streetSizes[form] * (.976 + random() * .048);
      let row = [null, null];
      for (const verge of [2.55, 3.15, 3.75]) {
        const pair = [-1, 1].map(side => {
          const offset = side * (width / 2 + verge);
          const x = point.x - tangent.z * offset;
          const z = point.z + tangent.x * offset;
          return candidate(form, x, z, size, heading, name, side);
        });
        if (pair.every(Boolean)) {
          row = pair;
          break;
        }
        row[0] ??= pair[0];
        row[1] ??= pair[1];
      }
      foliageSites.push(...row.filter(Boolean));
    }
  }

  // Keep other silhouettes off the verge. Use rounded trees at the lakes and
  // buildings, and pine groups on the upper slope behind the teaching area.
  for (const distance of [73, 84, 94]) for (const side of [-1, 1]) {
    const {x, z} = campusAxis.at(distance, side * 36);
    if (mapRoads.some(line => closeToLine(x, z, line, 6.5))) continue;
    const site = candidate('courtyard', x, z, 5.8, campusAxis.yaw + .6);
    if (site) foliageSites.push(site);
  }

  const target = foliageSites.length + 420;
  for (let attempt = 0; attempt < 25000 && foliageSites.length < target; attempt++) {
    const x = minX + (maxX - minX) * random();
    const z = minZ + (maxZ - minZ) * random();
    if (!inside(x, z) || mapRoads.some(line => closeToLine(x, z, line, 8))) continue;
    const axis = campusAxis.project(x, z);
    if (axis.distance >= campusAxis.colonnade + 5 && axis.distance < campusAxis.length + 1 &&
        Math.abs(axis.lateral) < 24) continue;
    const hill = z < -72 && height(x, z) > 24;
    const enclosed = buildingAreas.some(area => inArea(x, z, area, 15)) ||
      lakeAreas.some(area => inArea(x, z, area, 20));
    const form = hill && !enclosed ? 'pine' : 'courtyard';
    const size = (form === 'pine' ? 4.5 : 3.9) + random() * 2.5;
    const site = candidate(form, x, z, size, random() * 2 * Math.PI);
    if (site) foliageSites.push(site);
  }

  return {
    sites: foliageSites,
    audit() {
      const byRoad = {};
      const byForm = {};
      let roadIntrusions = 0, walkwayIntrusions = 0, wallIntersections = 0, plazaIntrusions = 0, shapedTrees = 0;
      for (const site of foliageSites) {
        const {street, form, side, x, z, fitX, fitZ} = site;
        byForm[form] = (byForm[form] ?? 0) + 1;
        if (street) {
          const counts = byRoad[street] ??= {forms: [], left: 0, right: 0};
          if (!counts.forms.includes(form)) counts.forms.push(form);
          counts[side < 0 ? 'left' : 'right']++;
        }
        if (mapRoads.some(line => closeToLine(x, z, line, .5))) roadIntrusions++;
        if (walkwayLines.some(line => closeToLine(x, z, line, .2))) walkwayIntrusions++;
        if (filledByPlaza(campusAxis.project(x, z))) plazaIntrusions++;
        extents.copy(models[form].bounds).applyMatrix4(site.matrix);
        if (solids.some(b => extents.min.x < b.maxX && extents.max.x > b.minX &&
          extents.min.z < b.maxZ && extents.max.z > b.minZ &&
          extents.min.y < b.maxY && extents.max.y > b.minY)) wallIntersections++;
        if (fitX < 1 || fitZ < 1) shapedTrees++;
      }
      return {trees: foliageSites.length, byForm, byRoad, roadIntrusions, walkwayIntrusions, wallIntersections, plazaIntrusions, shapedTrees};
    }
  };
}
