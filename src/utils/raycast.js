/**
 * Voxel Raycasting using 3D DDA Algorithm
 * Used for block selection and placement
 */

/**
 * Cast a ray through the voxel world to find block intersections
 * Based on Amanatides & Woo 3D DDA algorithm
 * @param {World} world - World instance
 * @param {THREE.Vector3} origin - Ray origin
 * @param {THREE.Vector3} direction - Ray direction (normalized)
 * @param {number} maxDist - Maximum ray distance
 * @returns {Object|null} Hit result with x, y, z coordinates and face normal
 */
export function raycastVoxel(world, origin, direction, maxDist = 5) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = direction.x > 0 ? 1 : (direction.x < 0 ? -1 : 0);
  const stepY = direction.y > 0 ? 1 : (direction.y < 0 ? -1 : 0);
  const stepZ = direction.z > 0 ? 1 : (direction.z < 0 ? -1 : 0);

  // Calculate initial tMax and tDelta
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / direction.x);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / direction.y);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / direction.z);

  let tMaxX, tMaxY, tMaxZ;

  if (stepX !== 0) {
    const nextVoxelBoundary = x + (stepX > 0 ? 1 : 0);
    tMaxX = (nextVoxelBoundary - origin.x) / direction.x;
  } else {
    tMaxX = Infinity;
  }

  if (stepY !== 0) {
    const nextVoxelBoundary = y + (stepY > 0 ? 1 : 0);
    tMaxY = (nextVoxelBoundary - origin.y) / direction.y;
  } else {
    tMaxY = Infinity;
  }

  if (stepZ !== 0) {
    const nextVoxelBoundary = z + (stepZ > 0 ? 1 : 0);
    tMaxZ = (nextVoxelBoundary - origin.z) / direction.z;
  } else {
    tMaxZ = Infinity;
  }

  let dist = 0;
  let lastStep = null;

  while (dist <= maxDist) {
    const block = world.getBlock(x, y, z);
    if (block !== 0) {
      // Return the block coordinates and the face normal of the side we entered
      return { x, y, z, face: lastStep };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        lastStep = { x: -stepX, y: 0, z: 0 };
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        lastStep = { x: 0, y: 0, z: -stepZ };
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        lastStep = { x: 0, y: -stepY, z: 0 };
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        lastStep = { x: 0, y: 0, z: -stepZ };
      }
    }
  }

  return null;
}
