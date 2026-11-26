export function sitePoint(x,z,yaw,u,v) {
  const cos=Math.cos(yaw),sin=Math.sin(yaw);
  return {x:x+u*cos+v*sin,z:z-u*sin+v*cos};
}

export function footprintBounds({x,z,w,d,yaw=0}) {
  const cos=Math.abs(Math.cos(yaw)),sin=Math.abs(Math.sin(yaw));
  const halfX=(w*cos+d*sin)/2,halfZ=(w*sin+d*cos)/2;
  return {minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ};
}

export function inFootprint(x,z,footprint,margin=0) {
  const {x:cx,z:cz,w,d,yaw=0}=footprint;
  const local=sitePoint(0,0,-yaw,x-cx,z-cz);
  return Math.abs(local.x)<w/2+margin&&Math.abs(local.z)<d/2+margin;
}
