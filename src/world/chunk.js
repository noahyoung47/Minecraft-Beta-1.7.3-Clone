/**
 * Chunk Class
 * Represents a section of the world with terrain generation and mesh building
 */

import * as THREE from 'three';
import { 
  CHUNK_SIZE, 
  CHUNK_HEIGHT, 
  WATER_LEVEL, 
  BLOCK_TYPES 
} from '../core/config.js';
import { 
  pseudoRandom, 
  hexToRgbLinear 
} from '../utils/helpers.js';

export class Chunk {
  constructor(world, cx, cz) {
    this.world = world;
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.mesh = null;
    this.needsMesh = true;
    this.generated = false;
  }

  /**
   * Convert local coordinates to block array index
   */
  index(x, y, z) {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }

  /**
   * Get block type at local coordinates
   */
  getLocalBlock(lx, ly, lz) {
    if (ly < 0 || ly >= CHUNK_HEIGHT) return 0;
    return this.blocks[this.index(lx, ly, lz)];
  }

  /**
   * Set block type at local coordinates
   */
  setLocalBlock(lx, ly, lz, type) {
    if (ly < 0 || ly >= CHUNK_HEIGHT) return;
    this.blocks[this.index(lx, ly, lz)] = type;
    this.needsMesh = true;
  }

  /**
   * Generate terrain for this chunk
   */
  generate() {
    if (this.generated) return;
    this.generated = true;

    const { cx, cz } = this;

    // Generate terrain for each column
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        this.generateColumn(cx, cz, lx, lz);
      }
    }

    // Add caves and ore deposits
    this.generateCavesAndOres();
  }

  /**
   * Generate a single column of terrain
   */
  generateColumn(cx, cz, lx, lz) {
    const gx = cx * CHUNK_SIZE + lx;
    const gz = cz * CHUNK_SIZE + lz;

    // Combine multiple noise layers for varied terrain
    const n1 = this.world.noise.noise(gx * 0.03, gz * 0.03);
    const n2 = this.world.noise.noise(gx * 0.1 + 100, gz * 0.1 + 100);
    const height = Math.floor(6 + n1 * 20 + n2 * 8);

    // Determine biome
    const biomeVal = this.world.biomeNoise.noise(gx * 0.01, gz * 0.01);
    const isDesert = biomeVal > 0.6;
    const isCold = biomeVal < -0.6;
    const isPlains = !isDesert && !isCold && biomeVal < -0.2;
    const isForest = !isDesert && !isCold && !isPlains;

    const nearSea = height <= WATER_LEVEL + 1;

    // Fill column with blocks
    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      let type = 0;
      if (ly <= height) {
        if (ly === height) {
          // Surface block
          if (isDesert) {
            type = 5; // Sand
          } else if (isCold) {
            type = 22; // Snow
          } else if (nearSea) {
            type = 5; // Sand (beach)
          } else {
            type = 1; // Grass
          }
        } else if (ly >= height - 3) {
          type = isDesert ? 5 : 2; // Sand or dirt
        } else {
          type = 3; // Stone
        }
      } else if (ly <= WATER_LEVEL) {
        type = 7; // Water
      }
      this.setLocalBlock(lx, ly, lz, type);
    }

    // Generate trees, cacti, and sugar cane
    this.generateFeatures(gx, gz, lx, lz, height, isDesert, isCold, nearSea, isForest);
  }

  /**
   * Generate natural features like trees, cacti, and sugar cane
   */
  generateFeatures(gx, gz, lx, lz, height, isDesert, isCold, nearSea, isForest) {
    // Trees
    if (!isDesert && !isCold && !nearSea && height > 4 && 
        lx > 2 && lx < CHUNK_SIZE - 3 && lz > 2 && lz < CHUNK_SIZE - 3) {
      const r = pseudoRandom(gx, gz, this.world.noise.seed + 12345);
      const threshold = isForest ? 0.96 : 0.985;
      if (r > threshold) {
        this.generateTree(lx, lz, height);
      }
    }

    // Cacti and sugar cane
    const rand1 = pseudoRandom(gx, gz, this.world.noise.seed + 54321);
    const rand2 = pseudoRandom(gx, gz, this.world.noise.seed + 98765);

    // Cactus in desert
    if (isDesert && !nearSea && height > WATER_LEVEL && 
        lx > 1 && lx < CHUNK_SIZE - 2 && lz > 1 && lz < CHUNK_SIZE - 2) {
      if (rand1 > 0.997) {
        const cactusHeight = 2 + Math.floor(pseudoRandom(gx, gz, this.world.noise.seed + 11111) * 2);
        for (let ch = 1; ch <= cactusHeight; ch++) {
          const y = height + ch;
          if (y >= CHUNK_HEIGHT) break;
          this.setLocalBlock(lx, y, lz, 20);
        }
      }
    }

    // Sugar cane near water
    if (nearSea && height >= WATER_LEVEL && rand2 > 0.998) {
      const caneHeight = 2 + Math.floor(pseudoRandom(gx, gz, this.world.noise.seed + 22222) * 2);
      for (let ch = 1; ch <= caneHeight; ch++) {
        const y = height + ch;
        if (y >= CHUNK_HEIGHT) break;
        this.setLocalBlock(lx, y, lz, 21);
      }
    }
  }

  /**
   * Generate a tree at the specified location
   */
  generateTree(lx, lz, height) {
    // Build trunk
    for (let ty = 1; ty <= 3; ty++) {
      const y = height + ty;
      if (y >= CHUNK_HEIGHT) break;
      this.setLocalBlock(lx, y, lz, 4);
    }

    // Add leaves
    for (let dy = 2; dy <= 3; dy++) {
      const y = height + 1 + dy;
      if (y >= CHUNK_HEIGHT) continue;
      
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (dy === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          
          const lx2 = lx + dx;
          const lz2 = lz + dz;
          if (lx2 < 0 || lx2 >= CHUNK_SIZE || lz2 < 0 || lz2 >= CHUNK_SIZE) continue;
          
          const currentBlock = this.getLocalBlock(lx2, y, lz2);
          if (currentBlock === 0 || currentBlock === 7) {
            this.setLocalBlock(lx2, y, lz2, 6);
          }
        }
      }
    }
  }

  /**
   * Generate caves and ore deposits
   */
  generateCavesAndOres() {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let ly = 1; ly < CHUNK_HEIGHT - 1; ly++) {
          const type = this.getLocalBlock(lx, ly, lz);
          
          if (type === 2 || type === 3) { // Dirt or stone
            const globalX = this.cx * CHUNK_SIZE + lx;
            const globalZ = this.cz * CHUNK_SIZE + lz;

            // Cave generation
            const caveVal = this.world.caveNoise.noise(
              globalX * 0.07 + ly * 0.03, 
              globalZ * 0.07 - ly * 0.03
            );
            if (caveVal > 0.8) {
              this.setLocalBlock(lx, ly, lz, 0);
              continue;
            }

            // Ore generation
            const pr = pseudoRandom(globalX, ly * 131 + globalZ, this.world.noise.seed + 99999);
            
            if (ly < 16 && pr > 0.9985) {
              this.setLocalBlock(lx, ly, lz, 11); // Diamond ore
            } else if (ly < 24 && pr > 0.997) {
              this.setLocalBlock(lx, ly, lz, 12); // Redstone ore
            } else if (ly < 32 && pr > 0.996) {
              this.setLocalBlock(lx, ly, lz, 10); // Gold ore
            } else if (ly < 48 && pr > 0.992) {
              this.setLocalBlock(lx, ly, lz, 9); // Iron ore
            } else if (ly < 58 && pr > 0.96) {
              this.setLocalBlock(lx, ly, lz, 8); // Coal ore
            } else if (pr < 0.02) {
              this.setLocalBlock(lx, ly, lz, 15); // Gravel
            }
          }
        }
      }
    }
  }

  /**
   * Build mesh for rendering this chunk
   */
  buildMesh() {
    if (!this.needsMesh) return;
    this.needsMesh = false;

    // Remove existing mesh
    if (this.mesh) {
      this.world.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }

    const positions = [];
    const colors = [];
    const indices = [];
    let vertexCount = 0;

    // Direction vectors and face brightness
    const dirs = [
      { d: [1, 0, 0], brightness: 0.8 },  // +X east
      { d: [-1, 0, 0], brightness: 0.8 }, // -X west
      { d: [0, 1, 0], brightness: 1.0 },  // +Y up
      { d: [0, -1, 0], brightness: 0.5 }, // -Y down
      { d: [0, 0, 1], brightness: 0.9 },  // +Z south
      { d: [0, 0, -1], brightness: 0.9 }, // -Z north
    ];

    // Face vertices for each direction
    const faceVertices = [
      [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], // +X
      [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], // -X
      [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], // +Y
      [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], // -Y
      [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], // +Z
      [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], // -Z
    ];

    // Generate mesh for all visible faces
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const type = this.getLocalBlock(lx, ly, lz);
          if (type === 0) continue;

          const baseColor = hexToRgbLinear(BLOCK_TYPES[type].color);

          // Check each face
          for (let fi = 0; fi < 6; fi++) {
            const dir = dirs[fi].d;
            const brightness = dirs[fi].brightness;

            // Check neighbor
            const nx = lx + dir[0];
            const ny = ly + dir[1];
            const nz = lz + dir[2];

            let neighborType;
            if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
              neighborType = this.getLocalBlock(nx, ny, nz);
            } else {
              // Check neighboring chunk
              const gx = this.cx * CHUNK_SIZE + lx + dir[0];
              const gy = ly + dir[1];
              const gz = this.cz * CHUNK_SIZE + lz + dir[2];
              neighborType = this.world.getBlock(gx, gy, gz);
            }

            if (neighborType !== 0) continue; // Face is hidden

            // Add face vertices
            const verts = faceVertices[fi];
            for (let vi = 0; vi < 4; vi++) {
              const v = verts[vi];
              const px = this.cx * CHUNK_SIZE + lx + v[0];
              const py = ly + v[1];
              const pz = this.cz * CHUNK_SIZE + lz + v[2];

              positions.push(px, py, pz);
              colors.push(
                baseColor[0] * brightness,
                baseColor[1] * brightness,
                baseColor[2] * brightness
              );
            }

            // Add triangles
            indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
            indices.push(vertexCount + 2, vertexCount + 3, vertexCount);
            vertexCount += 4;
          }
        }
      }
    }

    if (positions.length === 0) return;

    // Create mesh
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({ 
      vertexColors: true, 
      flatShading: true 
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.world.scene.add(this.mesh);
  }
}
