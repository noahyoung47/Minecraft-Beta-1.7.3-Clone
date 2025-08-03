/**
 * World Class
 * Manages chunks, blocks, lighting, and world systems
 */

import * as THREE from 'three';
import { Chunk } from './chunk.js';
import { Perlin } from '../utils/perlin.js';
import { 
  CHUNK_SIZE, 
  CHUNK_HEIGHT, 
  VIEW_DISTANCE 
} from '../core/config.js';
import { mod } from '../utils/helpers.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    
    // Noise generators
    this.noise = new Perlin(42);
    this.caveNoise = new Perlin(142);
    this.biomeNoise = new Perlin(242);

    // Lighting system
    this.torchLights = new Map();

    // Redstone systems
    this.pistonFacing = new Map();
    this.stickyExtended = new Map();

    // Mob systems
    this.mobs = [];
    this.hostileMobs = [];
    this.arrows = [];
  }

  /**
   * Get or create a chunk at the specified coordinates
   */
  getChunk(cx, cz) {
    const key = `${cx},${cz}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(this, cx, cz);
      this.chunks.set(key, chunk);
    }
    if (!chunk.generated) {
      chunk.generate();
    }
    return chunk;
  }

  /**
   * Get block type at global coordinates
   */
  getBlock(x, y, z) {
    if (y < 0) return 3; // Solid below world
    if (y >= CHUNK_HEIGHT) return 0; // Air above world
    
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = mod(x, CHUNK_SIZE);
    const lz = mod(z, CHUNK_SIZE);
    
    const chunk = this.getChunk(cx, cz);
    return chunk.getLocalBlock(lx, y, lz);
  }

  /**
   * Set block type at global coordinates
   */
  setBlock(x, y, z, type) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = mod(x, CHUNK_SIZE);
    const lz = mod(z, CHUNK_SIZE);

    const chunk = this.getChunk(cx, cz);
    const old = chunk.getLocalBlock(lx, y, lz);
    if (old === type) return;

    // Handle torch lighting
    if (old === 17 || old === 19) {
      this.removeTorchLight(x, y, z);
    }

    chunk.setLocalBlock(lx, y, lz, type);

    if (type === 17 || type === 19) {
      this.addTorchLight(x, y, z);
    }

    // Mark affected chunks for mesh rebuild
    chunk.needsMesh = true;
    this.markNeighborChunks(cx, cz, lx, lz);
  }

  /**
   * Mark neighboring chunks for mesh rebuild when block is on boundary
   */
  markNeighborChunks(cx, cz, lx, lz) {
    const neighbors = [];
    if (lx === 0) neighbors.push([cx - 1, cz]);
    if (lx === CHUNK_SIZE - 1) neighbors.push([cx + 1, cz]);
    if (lz === 0) neighbors.push([cx, cz - 1]);
    if (lz === CHUNK_SIZE - 1) neighbors.push([cx, cz + 1]);

    for (const [ncx, ncz] of neighbors) {
      const nb = this.chunks.get(`${ncx},${ncz}`);
      if (nb) nb.needsMesh = true;
    }
  }

  /**
   * Add torch lighting
   */
  addTorchLight(x, y, z) {
    const key = `${x},${y},${z}`;
    if (this.torchLights.has(key)) return;

    const light = new THREE.PointLight(0xffd27c, 0.8, 6);
    light.position.set(x + 0.5, y + 0.6, z + 0.5);
    this.scene.add(light);
    this.torchLights.set(key, light);
  }

  /**
   * Remove torch lighting
   */
  removeTorchLight(x, y, z) {
    const key = `${x},${y},${z}`;
    const light = this.torchLights.get(key);
    if (light) {
      this.scene.remove(light);
      this.torchLights.delete(key);
    }
  }

  /**
   * Set piston facing direction
   */
  setPistonFacing(x, y, z, face) {
    const key = `${x},${y},${z}`;
    this.pistonFacing.set(key, { x: face.x, y: face.y, z: face.z });
  }

  /**
   * Remove piston facing data
   */
  removePistonFacing(x, y, z) {
    const key = `${x},${y},${z}`;
    this.pistonFacing.delete(key);
  }

  /**
   * Update powered blocks (pistons and TNT)
   */
  updatePoweredBlocks(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    
    const dirs = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
    ];

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) continue;

        this.processPowerInChunk(chunk, cx, cz, dirs);
      }
    }
  }

  /**
   * Process redstone power in a specific chunk
   */
  processPowerInChunk(chunk, cx, cz, dirs) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const type = chunk.getLocalBlock(lx, ly, lz);
          if (type !== 19) continue; // Only redstone torches

          const x = cx * CHUNK_SIZE + lx;
          const y = ly;
          const z = cz * CHUNK_SIZE + lz;

          // Check neighbors for pistons and TNT
          for (const d of dirs) {
            const nx = x + d.x;
            const ny = y + d.y;
            const nz = z + d.z;
            const nbType = this.getBlock(nx, ny, nz);

            if (nbType === 13 || nbType === 23) {
              this.activatePiston(nx, ny, nz, nbType);
            } else if (nbType === 14) {
              this.explode(nx, ny, nz);
            }
          }
        }
      }
    }
  }

  /**
   * Activate a piston
   */
  activatePiston(x, y, z, pistonType) {
    const key = `${x},${y},${z}`;
    const facing = this.pistonFacing.get(key) || { x: 1, y: 0, z: 0 };

    const frontX = x + facing.x;
    const frontY = y + facing.y;
    const frontZ = z + facing.z;
    const frontType = this.getBlock(frontX, frontY, frontZ);

    // Check if there's a block to push
    if (frontType !== 0 && frontType !== 6 && frontType !== 7 && 
        frontType !== 17 && frontType !== 18 && frontType !== 19) {
      
      const destX = frontX + facing.x;
      const destY = frontY + facing.y;
      const destZ = frontZ + facing.z;

      if (destY >= 0 && destY < CHUNK_HEIGHT) {
        const destType = this.getBlock(destX, destY, destZ);
        
        if (destType === 0 || destType === 6 || destType === 7 || 
            destType === 17 || destType === 18 || destType === 19) {
          
          this.setBlock(destX, destY, destZ, frontType);
          this.setBlock(frontX, frontY, frontZ, 0);

          if (pistonType === 23) {
            this.stickyExtended.set(key, true);
          }
        }
      }
    }
  }

  /**
   * Update sticky piston retraction
   */
  updateStickyRetraction(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    
    const dirs = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
    ];

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) continue;

        this.processRetractionInChunk(chunk, cx, cz, dirs);
      }
    }
  }

  /**
   * Process sticky piston retraction in a chunk
   */
  processRetractionInChunk(chunk, cx, cz, dirs) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const type = chunk.getLocalBlock(lx, ly, lz);
          if (type !== 23) continue; // Only sticky pistons

          const x = cx * CHUNK_SIZE + lx;
          const y = ly;
          const z = cz * CHUNK_SIZE + lz;
          const key = `${x},${y},${z}`;

          if (!this.stickyExtended.get(key)) continue;

          // Check if still powered
          let powered = false;
          for (const d of dirs) {
            const nx = x + d.x;
            const ny = y + d.y;
            const nz = z + d.z;
            if (this.getBlock(nx, ny, nz) === 19) {
              powered = true;
              break;
            }
          }

          if (!powered) {
            this.retractStickyPiston(x, y, z, key);
          }
        }
      }
    }
  }

  /**
   * Retract a sticky piston
   */
  retractStickyPiston(x, y, z, key) {
    const facing = this.pistonFacing.get(key) || { x: 1, y: 0, z: 0 };
    
    const frontX = x + facing.x;
    const frontY = y + facing.y;
    const frontZ = z + facing.z;
    
    const destX = frontX + facing.x;
    const destY = frontY + facing.y;
    const destZ = frontZ + facing.z;

    const destType = this.getBlock(destX, destY, destZ);
    const frontType = this.getBlock(frontX, frontY, frontZ);

    const isFrontEmpty = (frontType === 0 || frontType === 6 || frontType === 7 || 
                         frontType === 17 || frontType === 18 || frontType === 19);

    if (destType !== 0 && destType !== 7 && isFrontEmpty) {
      this.setBlock(frontX, frontY, frontZ, destType);
      this.setBlock(destX, destY, destZ, 0);
      this.stickyExtended.set(key, false);
    }
  }

  /**
   * Explode TNT at coordinates
   */
  explode(cx, cy, cz) {
    const radius = 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > radius + 0.5) continue;

          const x = cx + dx;
          const y = cy + dy;
          const z = cz + dz;
          const block = this.getBlock(x, y, z);

          if (block !== 0 && block !== 7) {
            this.setBlock(x, y, z, 0);
          }
        }
      }
    }
  }

  /**
   * Update falling blocks (sand and gravel)
   */
  updateFallingBlocks(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) continue;

        this.processFallingInChunk(chunk, cx, cz);
      }
    }
  }

  /**
   * Process falling blocks in a chunk
   */
  processFallingInChunk(chunk, cx, cz) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let ly = 1; ly < CHUNK_HEIGHT; ly++) {
          const type = chunk.getLocalBlock(lx, ly, lz);
          
          if (type === 5 || type === 15) { // Sand or gravel
            const worldY = ly - 1;
            const worldX = cx * CHUNK_SIZE + lx;
            const worldZ = cz * CHUNK_SIZE + lz;
            const belowType = this.getBlock(worldX, worldY, worldZ);
            
            if (belowType === 0 || belowType === 7) {
              this.setBlock(worldX, worldY, worldZ, type);
              this.setBlock(worldX, worldY + 1, worldZ, 0);
            }
          }
        }
      }
    }
  }

  /**
   * Update chunks around player position
   */
  updateChunks(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const needed = new Set();

    // Load chunks within view distance
    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        needed.add(`${cx},${cz}`);
        const chunk = this.getChunk(cx, cz);
        chunk.buildMesh();
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks.entries()) {
      const [cxStr, czStr] = key.split(',');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);
      const dx = Math.abs(cx - pcx);
      const dz = Math.abs(cz - pcz);
      const maxDist = Math.max(dx, dz);

      if (!needed.has(key)) {
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
          chunk.mesh.geometry.dispose();
          chunk.mesh.material.dispose();
          chunk.mesh = null;
        }

        if (maxDist > VIEW_DISTANCE + 1) {
          this.chunks.delete(key);
        }
      }
    }
  }
}
