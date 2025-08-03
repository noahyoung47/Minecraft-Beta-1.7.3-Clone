/*
 * Minecraft Web Prototype
 *
 * This file implements a simplified Minecraft‑like game using Three.js.
 * The goal is to demonstrate an infinite voxel world with basic terrain
 * generation, dynamic chunk loading, block placement/destruction and
 * first person controls with pointer lock. The world is generated on
 * the fly using a simple Perlin noise implementation (see Perlin class
 * below). Chunks are built as single meshes with vertex colors for
 * performance. Player movement includes gravity, jumping and basic
 * collision detection against solid blocks.
 */

// Wait until the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const debugDiv = document.getElementById('debug');

  // Debug overlay visibility state. Toggled by pressing F3. When true the
  // player's coordinates and orientation are displayed on screen.
  let debugVisible = false;

  // ---- Configuration constants ----
  const CHUNK_SIZE = 16;
  // Increase the world height to better approximate the tall landscapes of the beta
  // era. Beta 1.7.3 worlds were 128 blocks tall. To keep performance reasonable
  // in a browser we use 64; this still allows for hills and cliffs while
  // doubling the vertical space compared to the original prototype.
  const CHUNK_HEIGHT = 64;
  const VIEW_DISTANCE = 2; // number of chunks away from player to load
  // Block definitions. Each entry describes the in‑game name and its base color.
  // Additional types such as Leaves and Water are added to recreate some of
  // Minecraft beta’s variety. Colors are approximated to the classic palette.
  const BLOCK_TYPES = {
    0: { name: 'Air', color: 0x000000 },
    1: { name: 'Grass', color: 0x4CAF50 },    // top grass surface
    2: { name: 'Dirt', color: 0x8B5A2B },     // subsurface dirt
    3: { name: 'Stone', color: 0x888888 },    // stone
    4: { name: 'Wood', color: 0x71543E },     // wood log
    5: { name: 'Sand', color: 0xE2C499 },     // sand near water
    6: { name: 'Leaves', color: 0x3A8C41 },   // tree leaves
    7: { name: 'Water', color: 0x2D59AA },    // water (still)
    // Additional blocks to better reflect Beta 1.7.3. These include ore
    // varieties, decorative blocks like pistons, TNT and gravel. Colors are
    // approximations inspired by the classic textures. Ore blocks are only
    // generated naturally; pistons and TNT can be placed via the hotbar.
    8: { name: 'Coal Ore', color: 0x4a4a4a },  // dark spotted stone
    9: { name: 'Iron Ore', color: 0xd8a559 },  // brownish veins
    10: { name: 'Gold Ore', color: 0xf5d76e }, // golden veins
    11: { name: 'Diamond Ore', color: 0x48d1cc }, // cyan veins
    12: { name: 'Redstone Ore', color: 0xc70039 }, // red ore
    13: { name: 'Piston', color: 0xb5a565 },   // simple piston block
    14: { name: 'TNT', color: 0xcc0000 },      // explosive block
    15: { name: 'Gravel', color: 0x83786f },   // gravel
    16: { name: 'Fence', color: 0x8b4513 },    // fence posts
    17: { name: 'Torch', color: 0xffa500 },    // torch (emits light)
    18: { name: 'Ladder', color: 0xa67c52 },   // ladder (climbable)
    19: { name: 'Redstone Torch', color: 0xdd3300 }, // redstone torch (powers pistons/TNT)
    20: { name: 'Cactus', color: 0x2ca02c },    // desert cactus
    21: { name: 'Sugar Cane', color: 0x6dc066 }, // sugar cane near water
    22: { name: 'Snow', color: 0xffffff },      // snow surface in cold biomes
    23: { name: 'Sticky Piston', color: 0x9c8544 }, // sticky piston (pulls blocks)
  };
  // Exposed blocks in the player's hotbar. We leave out water to avoid
  // accidental flooding; players can place wood, dirt, stone, sand and leaves.
  // Hotbar slots define the block types the player can place. We expanded the
  // hotbar to ten slots (keys 1-9 and 0) to accommodate additional block
  // types such as pistons, TNT, fences, torches and ladders. Leaves (6) are
  // omitted since they are generated naturally and seldom placed by hand.
  const HOTBAR_SLOTS = [
    1,  // Grass
    2,  // Dirt
    3,  // Stone
    4,  // Wood
    23, // Sticky Piston
    13, // Piston
    14, // TNT
    17, // Torch
    18, // Ladder
    19, // Redstone Torch
  ];
  const SENSITIVITY = 0.0025;
  const GRAVITY = 20;
  const WALK_SPEED = 4;
  const JUMP_SPEED = 8;
  const PLAYER_HEIGHT = 1.8;
  const PLAYER_RADIUS = 0.3;
  const EYE_HEIGHT = 1.62;

  // Water level for lakes and seas. Anything below this y will be filled with
  // water if exposed. Adjusting this value raises or lowers oceans. In beta
  // 1.7.3 the sea level was at 63; here we choose 12 because our total height
  // is only 64.
  const WATER_LEVEL = 12;

  // Day/night cycle speed: full cycle takes approximately 10 minutes of real
  // time. Adjust this constant to speed up or slow down the cycle. The value
  // represents seconds per game day. 600 seconds (10 minutes) yields a
  // comfortable pace.
  const DAY_LENGTH = 600;

  // Weather configuration. The beta introduced weather like rain and later snow.
  // We support two particle systems: rain and snow. Both activate
  // intermittently and dim the environment slightly. The weather toggles
  // randomly every few minutes based on the player’s biome. Deserts never
  // experience precipitation【338925297753919†L107-L112】. Cold biomes are more likely to
  // snow【338925297753919†L160-L171】. Only one weather type can be active at a time.
  let isRaining = false;
  let rainGroup = null;
  let rainGeometry = null;
  let rainPositions = null;
  const RAIN_DROP_COUNT = 600;
  const RAIN_SPEED = 20;
  // Snow particle system variables
  let isSnowing = false;
  let snowGroup = null;
  let snowGeometry = null;
  let snowPositions = null;
  const SNOW_FLAKE_COUNT = 400;
  const SNOW_SPEED = 5;
  // Weather timing. A single timer controls when the weather toggles.
  let weatherTimer = 0;
  let nextWeatherToggle = 120; // seconds until the first weather change

  // Create the rain particle system. Drops are points that fall from
  // random heights within a defined radius around the player. The system
  // follows the player horizontally by updating its position each frame.
  function createRain() {
    rainGeometry = new THREE.BufferGeometry();
    rainPositions = new Float32Array(RAIN_DROP_COUNT * 3);
    const radius = 20;
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.random() * 20 + 10; // height above player
      rainPositions[i * 3 + 0] = x;
      rainPositions[i * 3 + 1] = y;
      rainPositions[i * 3 + 2] = z;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const material = new THREE.PointsMaterial({ color: 0x66aaff, size: 0.1, transparent: true, opacity: 0.7 });
    rainGroup = new THREE.Points(rainGeometry, material);
    scene.add(rainGroup);
  }

  // Remove the rain particle system from the scene and dispose resources.
  function removeRain() {
    if (rainGroup) {
      scene.remove(rainGroup);
      rainGeometry.dispose();
      rainGroup = null;
      rainGeometry = null;
      rainPositions = null;
    }
  }

  // Update the rain particle system. Drops fall downwards relative to the
  // player's world position. When they reach the ground (y <= 0), they
  // respawn at a random height above the player.
  function updateRain(dt) {
    if (!rainGroup || !rainPositions) return;
    const radius = 20;
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      let y = rainPositions[i * 3 + 1];
      y -= RAIN_SPEED * dt;
      if (y < 0) {
        y = Math.random() * 20 + 10;
        // Randomize x and z when resetting to distribute drops
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        rainPositions[i * 3 + 0] = r * Math.cos(theta);
        rainPositions[i * 3 + 2] = r * Math.sin(theta);
      }
      rainPositions[i * 3 + 1] = y;
    }
    rainGeometry.attributes.position.needsUpdate = true;
    // Anchor the rain system to follow the player horizontally
    rainGroup.position.set(player.pos.x, 0, player.pos.z);
  }

  // Create a simple snow particle system. Snowflakes drift down slowly within
  // a radius around the player. Snow is more likely in cold biomes
  //【338925297753919†L160-L171】. Snowflakes reset to the top when they reach the ground.
  function createSnow() {
    snowGeometry = new THREE.BufferGeometry();
    snowPositions = new Float32Array(SNOW_FLAKE_COUNT * 3);
    const radius = 20;
    for (let i = 0; i < SNOW_FLAKE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.random() * 20 + 10;
      snowPositions[i * 3 + 0] = x;
      snowPositions[i * 3 + 1] = y;
      snowPositions[i * 3 + 2] = z;
    }
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 });
    snowGroup = new THREE.Points(snowGeometry, material);
    scene.add(snowGroup);
  }

  // Remove the snow particle system and dispose resources.
  function removeSnow() {
    if (snowGroup) {
      scene.remove(snowGroup);
      snowGeometry.dispose();
      snowGroup = null;
      snowGeometry = null;
      snowPositions = null;
    }
  }

  // Update snowflakes each frame. They fall slowly and drift slightly
  // horizontally. When a flake reaches the ground level (y <= 0), it is
  // repositioned back above the player with a random x/z. This function also
  // anchors the snow group to follow the player's x/z position so the
  // snowfall appears around them.
  function updateSnow(dt) {
    if (!snowGroup || !snowPositions) return;
    const radius = 20;
    for (let i = 0; i < SNOW_FLAKE_COUNT; i++) {
      let y = snowPositions[i * 3 + 1];
      y -= SNOW_SPEED * dt;
      if (y < 0) {
        y = Math.random() * 20 + 10;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        snowPositions[i * 3 + 0] = r * Math.cos(theta);
        snowPositions[i * 3 + 2] = r * Math.sin(theta);
      }
      snowPositions[i * 3 + 1] = y;
    }
    snowGeometry.attributes.position.needsUpdate = true;
    snowGroup.position.set(player.pos.x, 0, player.pos.z);
  }

  // ---- Utility functions ----

  // Return a deterministic pseudo‑random value based on integer coordinates and a seed.
  function pseudoRandom(x, y, seed) {
    // Simple hash: mix coordinates and seed then compute sine
    const s = Math.sin((x * 3747613 + y * 668265263 + seed * 700001) & 0xffffffff);
    return s - Math.floor(s);
  }

  // Modulo that handles negative numbers properly
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  // Clamp value between min and max
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Convert hex color to linear RGB array (0–1 range)
  function hexToRgbLinear(hex) {
    const r = ((hex >> 16) & 255) / 255;
    const g = ((hex >> 8) & 255) / 255;
    const b = (hex & 255) / 255;
    return [r, g, b];
  }

  // ---- Perlin noise class ----
  // Implementation based on the algorithm described by Joe Iddon and others【625013844278460†L7-L49】.
  class Perlin {
    constructor(seed = 0) {
      this.seed = seed;
    }
    // Generate a random gradient vector for a given integer coordinate.
    randomGradient(ix, iy) {
      // Pseudo random based on coordinate and seed
      const random = pseudoRandom(ix, iy, this.seed);
      const angle = random * Math.PI * 2;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    }
    // Compute dot product between gradient vector at grid point and distance vector
    dotGridGradient(ix, iy, x, y) {
      const grad = this.randomGradient(ix, iy);
      const dx = x - ix;
      const dy = y - iy;
      return dx * grad.x + dy * grad.y;
    }
    // Quintic smoothstep function for interpolation
    smootherstep(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    // 2D Perlin noise at coordinates (x, y), returns value in [0,1]
    noise(x, y) {
      const x0 = Math.floor(x);
      const x1 = x0 + 1;
      const y0 = Math.floor(y);
      const y1 = y0 + 1;
      // Interpolation weights
      const sx = this.smootherstep(x - x0);
      const sy = this.smootherstep(y - y0);
      // Interpolate between grid corner dot products
      const n0 = this.dotGridGradient(x0, y0, x, y);
      const n1 = this.dotGridGradient(x1, y0, x, y);
      const ix0 = n0 + sx * (n1 - n0);
      const n2 = this.dotGridGradient(x0, y1, x, y);
      const n3 = this.dotGridGradient(x1, y1, x, y);
      const ix1 = n2 + sx * (n3 - n2);
      const value = ix0 + sy * (ix1 - ix0);
      // Map from [-1,1] to [0,1]
      return (value + 1) / 2;
    }
  }

  // ---- World and chunk management ----
  class Chunk {
    constructor(world, cx, cz) {
      this.world = world;
      this.cx = cx;
      this.cz = cz;
      this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.mesh = null;
      this.needsMesh = true;
      this.generated = false;
    }
    index(x, y, z) {
      return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
    }
    getLocalBlock(lx, ly, lz) {
      if (ly < 0 || ly >= CHUNK_HEIGHT) return 0;
      return this.blocks[this.index(lx, ly, lz)];
    }
    setLocalBlock(lx, ly, lz, type) {
      if (ly < 0 || ly >= CHUNK_HEIGHT) return;
      this.blocks[this.index(lx, ly, lz)] = type;
      this.needsMesh = true;
    }
    generate() {
      // Only generate once
      if (this.generated) return;
      this.generated = true;
      const { cx, cz } = this;
      // Loop through each column within the chunk and generate terrain
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          // Global x and z positions
          const gx = cx * CHUNK_SIZE + lx;
          const gz = cz * CHUNK_SIZE + lz;
          // Combine multiple noise layers to create varied terrain. A large scale
          // noise provides broad hills while a smaller scale noise adds detail.
          const n1 = this.world.noise.noise(gx * 0.03, gz * 0.03);
          const n2 = this.world.noise.noise(gx * 0.1 + 100, gz * 0.1 + 100);
          // Height ranges roughly between 6 and 32
          const height = Math.floor(6 + n1 * 20 + n2 * 8);
          // Determine biome for this column. Use a low frequency noise to
          // represent different regions. Values in the lower third are
          // considered forest, middle third plains and upper third desert.
          const biomeVal = this.world.biomeNoise.noise(gx * 0.01, gz * 0.01);
          // Define biomes based on low frequency noise. Values above 0.6 are deserts,
          // below -0.6 are cold tundras (snow biomes), values between define
          // plains and forests. Tundras have snowy tops and no trees.
          const isDesert = biomeVal > 0.6;
          const isCold = biomeVal < -0.6;
          const isPlains = !isDesert && !isCold && biomeVal < -0.2;
          const isForest = !isDesert && !isCold && !isPlains;
          // Determine if this column is near sea level for beach generation. In
          // deserts the beach concept is overridden and all top blocks are sand.
          const nearSea = height <= WATER_LEVEL + 1;
          // Fill column
          for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
            let type = 0;
            if (ly <= height) {
              // Determine type based on depth relative to height
              if (ly === height) {
                // Top block: desert always uses sand. Otherwise beaches use sand
                // and inland uses grass.
                if (isDesert) {
                  // Desert surface is always sand
                  type = 5;
                } else if (isCold) {
                  // Cold biomes have snowy surfaces
                  type = 22;
                } else if (nearSea) {
                  // Beaches use sand near water
                  type = 5;
                } else {
                  // All other inland columns use grass
                  type = 1;
                }
              } else if (ly >= height - 3) {
                // Subsurface: in deserts use sand, otherwise dirt
                type = isDesert ? 5 : 2;
              } else {
                type = 3; // stone below
              }
            } else if (ly <= WATER_LEVEL) {
              // Below sea level but above land: fill with water
              type = 7;
            } else {
              type = 0; // air
            }
            this.setLocalBlock(lx, ly, lz, type);
          }
          // Attempt to place a tree on land. Trees only generate on
          // above‑water grass blocks that are not at chunk edges to avoid
          // cross‑chunk placement issues.
          // Only spawn trees in non-desert biomes. Forests get more trees than
          // plains. Deserts never spawn trees.
          if (!isDesert && !isCold && !nearSea && height > 4 && lx > 2 && lx < CHUNK_SIZE - 3 && lz > 2 && lz < CHUNK_SIZE - 3) {
            // Use pseudoRandom to decide tree placement; second seed ensures
            // independent distribution from terrain noise
            const r = pseudoRandom(gx, gz, this.world.noise.seed + 12345);
            // Increase tree density in forests, reduce in plains
            const threshold = isForest ? 0.96 : 0.985;
            if (r > threshold) {
              // Build trunk: 3 blocks high
              for (let ty = 1; ty <= 3; ty++) {
                const y = height + ty;
                if (y >= CHUNK_HEIGHT) break;
                this.setLocalBlock(lx, y, lz, 4);
              }
              // Add leaves on two layers above trunk
              for (let dy = 2; dy <= 3; dy++) {
                const y = height + 1 + dy;
                if (y >= CHUNK_HEIGHT) continue;
                for (let dx = -2; dx <= 2; dx++) {
                  for (let dz = -2; dz <= 2; dz++) {
                    // Skip corners on lower leaf layer for a more rounded tree
                    if (dy === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                    const lx2 = lx + dx;
                    const lz2 = lz + dz;
                    if (lx2 < 0 || lx2 >= CHUNK_SIZE || lz2 < 0 || lz2 >= CHUNK_SIZE) continue;
                    // Only place leaves on air or water
                    if (this.getLocalBlock(lx2, y, lz2) === 0 || this.getLocalBlock(lx2, y, lz2) === 7) {
                      this.setLocalBlock(lx2, y, lz2, 6);
                    }
                  }
                }
              }
            }
          }

          // Spawn cacti in deserts and sugar cane along shorelines. Cacti
          // grow only in deserts away from the water, and sugar cane sprouts
          // near water on beaches and river banks. Use separate seeds to
          // randomize distribution independently from terrain height and trees.
          {
            const rand1 = pseudoRandom(gx, gz, this.world.noise.seed + 54321);
            const rand2 = pseudoRandom(gx, gz, this.world.noise.seed + 98765);
            // Cactus: desert only, not near sea, not at world edge, above water
            if (isDesert && !nearSea && height > WATER_LEVEL && lx > 1 && lx < CHUNK_SIZE - 2 && lz > 1 && lz < CHUNK_SIZE - 2) {
              if (rand1 > 0.997) {
                const cactusHeight = 2 + Math.floor(pseudoRandom(gx, gz, this.world.noise.seed + 11111) * 2);
                for (let ch = 1; ch <= cactusHeight; ch++) {
                  const y = height + ch;
                  if (y >= CHUNK_HEIGHT) break;
                  this.setLocalBlock(lx, y, lz, 20);
                }
              }
            }
            // Sugar cane: near water on sand or grass. Use nearSea and random threshold.
            if (nearSea && height >= WATER_LEVEL && rand2 > 0.998) {
              const caneHeight = 2 + Math.floor(pseudoRandom(gx, gz, this.world.noise.seed + 22222) * 2);
              for (let ch = 1; ch <= caneHeight; ch++) {
                const y = height + ch;
                if (y >= CHUNK_HEIGHT) break;
                this.setLocalBlock(lx, y, lz, 21);
              }
            }
          }
        }
      }
      // After basic terrain and trees are generated, carve out caves and add ore
      // deposits. We iterate through all blocks in the chunk and transform
      // certain stone/dirt blocks into air (caves) or ores based on depth and
      // random chance. Caves help make underground exploration more interesting
      // and ore veins incentivize mining.
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          for (let ly = 1; ly < CHUNK_HEIGHT - 1; ly++) {
            const type = this.getLocalBlock(lx, ly, lz);
            // Only modify solid blocks (stone or dirt) below the surface
            if (type === 2 || type === 3) {
              const globalX = cx * CHUNK_SIZE + lx;
              const globalZ = cz * CHUNK_SIZE + lz;
              // Cave noise: sample from caveNoise using a 2D slice that varies
              // with y to approximate 3D noise. Higher threshold yields
              // isolated pockets; lower threshold would yield more caves.
              const caveVal = this.world.caveNoise.noise(globalX * 0.07 + ly * 0.03, globalZ * 0.07 - ly * 0.03);
              if (caveVal > 0.8) {
                this.setLocalBlock(lx, ly, lz, 0);
                continue;
              }
              // Ore generation. Use pseudoRandom with a composite key to
              // produce per-block randomness. Rarer ores generate deeper
              // underground. The thresholds control approximate spawn
              // probabilities.
              const pr = pseudoRandom(globalX, ly * 131 + globalZ, this.world.noise.seed + 99999);
              if (ly < 16 && pr > 0.9985) {
                this.setLocalBlock(lx, ly, lz, 11); // diamond ore
                continue;
              }
              if (ly < 24 && pr > 0.997) {
                this.setLocalBlock(lx, ly, lz, 12); // redstone ore
                continue;
              }
              if (ly < 32 && pr > 0.996) {
                this.setLocalBlock(lx, ly, lz, 10); // gold ore
                continue;
              }
              if (ly < 48 && pr > 0.992) {
                this.setLocalBlock(lx, ly, lz, 9); // iron ore
                continue;
              }
              if (ly < 58 && pr > 0.96) {
                this.setLocalBlock(lx, ly, lz, 8); // coal ore
                continue;
              }
              // Gravel pockets: occasional gravel replaces stone/dirt
              if (pr < 0.02) {
                this.setLocalBlock(lx, ly, lz, 15);
                continue;
              }
            }
          }
        }
      }
    }
    buildMesh() {
      // Build or rebuild the mesh when necessary
      if (!this.needsMesh) return;
      this.needsMesh = false;
      // Remove existing mesh from scene
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
      // Direction vectors and face brightness factors
      const dirs = [
        { d: [1, 0, 0], brightness: 0.8 },  // +X east
        { d: [-1, 0, 0], brightness: 0.8 }, // -X west
        { d: [0, 1, 0], brightness: 1.0 },  // +Y up
        { d: [0, -1, 0], brightness: 0.5 }, // -Y down
        { d: [0, 0, 1], brightness: 0.9 },  // +Z south
        { d: [0, 0, -1], brightness: 0.9 }, // -Z north
      ];
      const vertexOffsets = [
        // For each face we define four corner offsets; they will be created inside loop
      ];
      // Precompute offsets for each face (two triangles) relative to block position
      const faceVertices = [
        // +X
        [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
        // -X
        [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
        // +Y
        [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
        // -Y
        [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
        // +Z
        [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
        // -Z
        [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
      ];
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const type = this.getLocalBlock(lx, ly, lz);
            if (type === 0) continue;
            const baseColor = hexToRgbLinear(BLOCK_TYPES[type].color);
            // For each face
            for (let fi = 0; fi < 6; fi++) {
              const dir = dirs[fi].d;
              const brightness = dirs[fi].brightness;
              // Neighbor block global coordinates
              const nx = lx + dir[0];
              const ny = ly + dir[1];
              const nz = lz + dir[2];
              // Determine neighbor block type
              let neighborType;
              if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
                neighborType = this.getLocalBlock(nx, ny, nz);
              } else {
                // Neighbor lies in adjacent chunk or outside height; use world getBlock
                const gx = this.cx * CHUNK_SIZE + lx + dir[0];
                const gy = ly + dir[1];
                const gz = this.cz * CHUNK_SIZE + lz + dir[2];
                neighborType = this.world.getBlock(gx, gy, gz);
              }
              if (neighborType !== 0) continue; // skip hidden face
              // Add face vertices
              const verts = faceVertices[fi];
              for (let vi = 0; vi < 4; vi++) {
                const v = verts[vi];
                const px = this.cx * CHUNK_SIZE + lx + v[0];
                const py = ly + v[1];
                const pz = this.cz * CHUNK_SIZE + lz + v[2];
                positions.push(px, py, pz);
                // Multiply base color by brightness
                colors.push(baseColor[0] * brightness, baseColor[1] * brightness, baseColor[2] * brightness);
              }
              // Two triangles per face: indices relative to current vertex count
              indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
              indices.push(vertexCount + 2, vertexCount + 3, vertexCount);
              vertexCount += 4;
            }
          }
        }
      }
      if (positions.length === 0) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.frustumCulled = false; // disable frustum culling to avoid disappearing edges
      this.world.scene.add(this.mesh);
    }
  }

  class World {
    constructor(scene) {
      this.scene = scene;
      this.chunks = new Map();
      // Primary noise for terrain height
      this.noise = new Perlin(42);
      // Separate noise instance for cave generation. Using a different seed
      // ensures caves are independent of the terrain surface.
      this.caveNoise = new Perlin(142);
      // Noise for biome variation. This controls the distribution of deserts,
      // forests and plains. Each biome influences the surface block and tree
      // density. Using its own seed decouples it from height and caves.
      this.biomeNoise = new Perlin(242);

      // Torches emit light into the world. We store active torch lights in
      // a map keyed by their global coordinates. When a torch is placed a
      // point light is created and added to the scene; when removed the
      // corresponding light is removed. Without this map it would be
      // impossible to clean up lights when their blocks are destroyed.
      this.torchLights = new Map();

      // Piston orientation map. Pistons need to know which direction they
      // push blocks when powered by a redstone torch. The key is a string
      // "x,y,z" and the value is an object with x, y, z components of the
      // facing normal (each component is -1, 0 or 1). Pistons without an
      // entry default to facing +X.
      this.pistonFacing = new Map();

      // Sticky piston extension state. When a sticky piston pushes a block
      // forward, we mark it as extended. On loss of power the piston will
      // attempt to pull the block back if it can. The key is the piston
      // coordinate string "x,y,z" and the value is a boolean indicating
      // whether it is currently extended.
      this.stickyExtended = new Map();

      // Array of passive mobs (e.g. sheep) currently in the world. Each
      // mob stores its position, direction of movement and a Three.js mesh.
      this.mobs = [];

      // Array of hostile mobs (e.g. zombies) currently in the world. Hostile
      // mobs spawn at night and pursue the player, damaging them on contact.
      this.hostileMobs = [];

      // Array of flying arrows shot by skeletons. Each element contains a
      // Three.js mesh and velocity vector. Arrows persist until they hit
      // something or travel too far.
      this.arrows = [];
    }
    // Get or generate a chunk by chunk coordinates
    getChunk(cx, cz) {
      const key = `${cx},${cz}`;
      let chunk = this.chunks.get(key);
      if (!chunk) {
        chunk = new Chunk(this, cx, cz);
        this.chunks.set(key, chunk);
      }
      if (!chunk.generated) chunk.generate();
      return chunk;
    }
    // Get block type at global coordinates
    getBlock(x, y, z) {
      if (y < 0) return 3; // solid below world
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const chunk = this.getChunk(cx, cz);
      return chunk.getLocalBlock(lx, y, lz);
    }
    // Set block type at global coordinates and mark affected chunks for rebuild
    setBlock(x, y, z, type) {
      if (y < 0 || y >= CHUNK_HEIGHT) return;
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const chunk = this.getChunk(cx, cz);
      const old = chunk.getLocalBlock(lx, y, lz);
      if (old === type) return;
      // If the existing block is a torch, remove its light before replacing
      if (old === 17 || old === 19) {
        this.removeTorchLight(x, y, z);
      }
      chunk.setLocalBlock(lx, y, lz, type);
      // If placing a torch, add a point light at its position
      if (type === 17 || type === 19) {
        this.addTorchLight(x, y, z);
      }
      // Mark chunk and neighbors for mesh rebuild because exposed faces changed
      chunk.needsMesh = true;
      // For blocks on boundaries, mark adjacent chunk
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
     * Create a point light when a torch block is placed. Lights are keyed
     * by their global coordinates (x,y,z) to allow removal when the torch
     * is broken. The light has a warm orange hue and limited range.
     */
    addTorchLight(x, y, z) {
      const key = `${x},${y},${z}`;
      if (this.torchLights.has(key)) return;
      const light = new THREE.PointLight(0xffd27c, 0.8, 6);
      // Position the light at the centre of the block so it illuminates
      // surrounding blocks evenly.
      light.position.set(x + 0.5, y + 0.6, z + 0.5);
      this.scene.add(light);
      this.torchLights.set(key, light);
    }

    /**
     * Remove the point light associated with a torch block when it is
     * destroyed. If no light exists for the coordinates this is a no‑op.
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
     * Set the facing direction for a piston at the specified coordinates. This
     * should be called when placing a piston so that it remembers which
     * direction to push blocks. The face argument should be the face normal
     * returned from the raycast when placing (an object with x, y, z keys).
     */
    setPistonFacing(x, y, z, face) {
      const key = `${x},${y},${z}`;
      // Store a copy of the face vector. If the player places a piston on
      // the bottom of a block, we invert so the piston faces upward (it
      // always extends away from the clicked face).
      const fx = face.x;
      const fy = face.y;
      const fz = face.z;
      this.pistonFacing.set(key, { x: fx, y: fy, z: fz });
    }

    /**
     * Remove the stored facing for a piston at the given coordinates. This
     * should be called when a piston is destroyed.
     */
    removePistonFacing(x, y, z) {
      const key = `${x},${y},${z}`;
      this.pistonFacing.delete(key);
    }

    /**
     * Update powered blocks (pistons and TNT) based on nearby redstone torches.
     * For each redstone torch in loaded chunks, check its six neighbors. If
     * a neighbor is a piston, push the block in front of it. If a neighbor is
     * TNT, trigger an explosion. This simplistic approach ignores redstone
     * wire propagation but captures the core mechanic of torches powering
     * adjacent devices.
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
          // iterate through blocks in chunk
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
              for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const type = chunk.getLocalBlock(lx, ly, lz);
                if (type !== 19) continue; // only redstone torches
                const x = cx * CHUNK_SIZE + lx;
                const y = ly;
                const z = cz * CHUNK_SIZE + lz;
                // Check neighbors
                for (const d of dirs) {
                  const nx = x + d.x;
                  const ny = y + d.y;
                  const nz = z + d.z;
                  const nbType = this.getBlock(nx, ny, nz);
                  if (nbType === 13 || nbType === 23) {
                    // Powered piston (regular or sticky): push block in front
                    const key = `${nx},${ny},${nz}`;
                    const facing = this.pistonFacing.get(key) || { x: 1, y: 0, z: 0 };
                    const fx = facing.x;
                    const fy = facing.y;
                    const fz = facing.z;
                    // Block directly in front of piston head
                    const frontX = nx + fx;
                    const frontY = ny + fy;
                    const frontZ = nz + fz;
                    const frontType = this.getBlock(frontX, frontY, frontZ);
                    // Only push if front block is solid (non-zero and not special non-solid)
                    if (frontType !== 0 && frontType !== 6 && frontType !== 7 && frontType !== 17 && frontType !== 18 && frontType !== 19) {
                      const destX = frontX + fx;
                      const destY = frontY + fy;
                      const destZ = frontZ + fz;
                      // Ensure destination within world bounds
                      if (destY >= 0 && destY < CHUNK_HEIGHT) {
                        const destType = this.getBlock(destX, destY, destZ);
                        // Only push if destination is air, water, leaves or torches/ladders
                        if (destType === 0 || destType === 6 || destType === 7 || destType === 17 || destType === 18 || destType === 19) {
                          // Move block from front to dest
                          this.setBlock(destX, destY, destZ, frontType);
                          this.setBlock(frontX, frontY, frontZ, 0);
                          // Mark sticky piston as extended
                          if (nbType === 23) {
                            this.stickyExtended.set(key, true);
                          }
                        }
                      }
                    }
                  } else if (nbType === 14) {
                    // Powered TNT: trigger explosion
                    explode(nx, ny, nz);
                  }
                }
              }
            }
          }
        }
      }
    }

    /**
     * Retract sticky pistons that are no longer powered. When a sticky piston
     * has pushed a block forward and subsequently loses its redstone power,
     * it will attempt to pull the block back. We scan sticky pistons in
     * loaded chunks and, for those marked as extended, check whether any
     * adjacent redstone torch remains. If none are found, we move the block
     * one block in front of the piston back into the empty space next to the
     * piston head and clear the extension flag.
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
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
              for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const type = chunk.getLocalBlock(lx, ly, lz);
                if (type !== 23) continue; // only sticky pistons
                const x = cx * CHUNK_SIZE + lx;
                const y = ly;
                const z = cz * CHUNK_SIZE + lz;
                const key = `${x},${y},${z}`;
                if (!this.stickyExtended.get(key)) continue;
                // Determine if piston is still powered by any adjacent redstone torch
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
                if (powered) continue;
                // Not powered: attempt to retract
                const facing = this.pistonFacing.get(key) || { x: 1, y: 0, z: 0 };
                const fx = facing.x;
                const fy = facing.y;
                const fz = facing.z;
                // front block position (adjacent to piston head)
                const frontX = x + fx;
                const frontY = y + fy;
                const frontZ = z + fz;
                // destination where pushed block resides (one further)
                const destX = frontX + fx;
                const destY = frontY + fy;
                const destZ = frontZ + fz;
                // Only retract if destination block exists and front is air or non-solid
                const destType = this.getBlock(destX, destY, destZ);
                const frontType = this.getBlock(frontX, frontY, frontZ);
                // Non-solid types (air, leaves, water, torches, ladders, redstone torches)
                const isFrontEmpty = (frontType === 0 || frontType === 6 || frontType === 7 || frontType === 17 || frontType === 18 || frontType === 19);
                if (destType !== 0 && destType !== 7 && isFrontEmpty) {
                  this.setBlock(frontX, frontY, frontZ, destType);
                  this.setBlock(destX, destY, destZ, 0);
                  this.stickyExtended.set(key, false);
                }
              }
            }
          }
        }
      }
    }

    /**
     * Spawn a passive mob at the given world coordinates. The mob will be
     * represented as a simple white cube that wanders randomly over grass.
     */
    spawnMob(x, y, z) {
      // Create mesh for mob: white box. Slightly taller than wide.
      const geometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
      const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x + 0.5, y, z + 0.5);
      this.scene.add(mesh);
      const mob = {
        mesh: mesh,
        dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
        moveTime: 2 + Math.random() * 4, // seconds until direction change
      };
      this.mobs.push(mob);
    }

    /**
     * Update all mobs: wander randomly, stay on top of the terrain and avoid
     * water. Mobs have no vertical momentum; their y position is snapped
     * directly to the top of the terrain below them. They ignore collisions
     * with the player and other mobs.
     */
    updateMobs(dt) {
      // Movement speed of mobs (blocks per second)
      const speed = 1.5;
      for (const mob of this.mobs) {
        mob.moveTime -= dt;
        if (mob.moveTime <= 0) {
          // Choose new random direction and reset timer
          mob.dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
          mob.moveTime = 2 + Math.random() * 4;
        }
        // Propose new position
        let newX = mob.mesh.position.x + mob.dir.x * speed * dt;
        let newZ = mob.mesh.position.z + mob.dir.y * speed * dt;
        // Check if destination block below is water; if so invert direction
        const checkX = Math.floor(newX);
        const checkZ = Math.floor(newZ);
        // Find ground y at destination (scan downward from top). This ensures
        // mobs stay on the surface regardless of caves underneath.
        let groundY = -1;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const t = this.getBlock(checkX, y, checkZ);
          if (t !== 0 && t !== 6 && t !== 7 && t !== 17 && t !== 18 && t !== 19 && t !== 21) {
            groundY = y;
            break;
          }
        }
        // If destination is invalid (e.g. ground under water or outside loaded chunks), stay put and pick new dir
        if (groundY < 0) {
          mob.moveTime = 0;
          continue;
        }
        // Check if ground block is water (type 7) or lava; avoid
        const underType = this.getBlock(checkX, groundY, checkZ);
        if (underType === 7) {
          // bounce back and choose new direction
          mob.moveTime = 0;
          continue;
        }
        // Update position on terrain
        mob.mesh.position.x = newX;
        mob.mesh.position.z = newZ;
        mob.mesh.position.y = groundY + 1;
      }
    }

    /**
     * Spawn a hostile mob at the given world coordinates. Hostiles are
     * represented as taller green boxes. They will wander or chase the
     * player depending on proximity and inflict damage upon contact.
     */
    spawnHostile(x, y, z) {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshLambertMaterial({ color: 0x228b22 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x + 0.5, y, z + 0.5);
      this.scene.add(mesh);
      const mob = {
        mesh: mesh,
        dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
        moveTime: 2 + Math.random() * 4,
      };
      this.hostileMobs.push(mob);
    }

    /**
     * Spawn a skeleton hostile mob. Skeletons are ranged attackers that
     * periodically shoot arrows at the player from a distance. They share
     * wandering behaviour with zombies but will try to keep a medium range
     * when aggroed. The geometry is thinner and taller to differentiate
     * them visually.
     */
    spawnSkeleton(x, y, z) {
      const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
      const material = new THREE.MeshLambertMaterial({ color: 0xdddddd });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x + 0.5, y, z + 0.5);
      this.scene.add(mesh);
      const mob = {
        mesh: mesh,
        dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
        moveTime: 2 + Math.random() * 4,
        type: 'skeleton',
        arrowCooldown: 2 + Math.random() * 2,
      };
      this.hostileMobs.push(mob);
    }

    /**
     * Spawn a creeper hostile mob. Creepers are iconic explosive mobs that
     * silently approach the player and detonate when close. They are
     * represented as green columns. Each creeper tracks a fuse timer that
     * counts down once it begins to hiss. When the fuse reaches zero the
     * creeper explodes, destroying nearby blocks and damaging the player.
     */
    spawnCreeper(x, y, z) {
      // Creepers are slightly taller than zombies but thinner than skeletons
      const geometry = new THREE.BoxGeometry(0.6, 1.6, 0.6);
      const material = new THREE.MeshLambertMaterial({ color: 0x3a8b3a });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x + 0.5, y, z + 0.5);
      this.scene.add(mesh);
      const mob = {
        mesh: mesh,
        dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
        moveTime: 2 + Math.random() * 4,
        type: 'creeper',
        fuse: 2.0,        // seconds until explosion once triggered
        fusing: false,    // whether the fuse is currently burning
      };
      this.hostileMobs.push(mob);
    }

    /**
     * Update all flying arrows shot by skeletons. Arrows follow a simple
     * ballistic trajectory affected by gravity. They deal damage to the
     * player on contact and disappear on impact with solid blocks or after
     * travelling for too long. Damage inflicted per hit is one heart.
     */
    updateArrows(dt) {
      const newArrows = [];
      for (const arrow of this.arrows) {
        // Apply gravity to vertical velocity
        arrow.vel.y -= GRAVITY * 0.5 * dt;
        // Update position
        arrow.mesh.position.x += arrow.vel.x * dt;
        arrow.mesh.position.y += arrow.vel.y * dt;
        arrow.mesh.position.z += arrow.vel.z * dt;
        const px = arrow.mesh.position.x;
        const py = arrow.mesh.position.y;
        const pz = arrow.mesh.position.z;
        // If arrow is below ground level, remove it
        if (py < 0) {
          this.scene.remove(arrow.mesh);
          continue;
        }
        // Check collision with blocks. Only air, leaves, water, torches, ladders,
        // redstone torches and sugar cane are considered passable.
        const bx = Math.floor(px);
        const by = Math.floor(py);
        const bz = Math.floor(pz);
        const bType = this.getBlock(bx, by, bz);
        if (bType !== 0 && bType !== 6 && bType !== 7 && bType !== 17 && bType !== 18 && bType !== 19 && bType !== 21) {
          // Hit solid block: remove arrow
          this.scene.remove(arrow.mesh);
          continue;
        }
        // Check collision with player. Use player's eye height for vertical range.
        const dx = px - player.pos.x;
        const dy = py - (player.pos.y + 0.9);
        const dz = pz - player.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.25) {
          // Deal 2 points of damage (1 heart)
          if (typeof damagePlayer === 'function') {
            damagePlayer(1);
          }
          this.scene.remove(arrow.mesh);
          continue;
        }
        // Keep arrow if still active
        newArrows.push(arrow);
      }
      this.arrows = newArrows;
    }

    /**
     * Update hostile mobs. If the player is within an 8 block radius the
     * mob will chase them; otherwise it wanders randomly. When very close
     * (<0.8 blocks) the mob inflicts damage on the player over time.
     */
    updateHostiles(dt) {
      const chaseDistSq = 64; // 8 blocks squared
      const speed = 1.5;
      for (const mob of this.hostileMobs) {
        const dx = player.pos.x - mob.mesh.position.x;
        const dz = player.pos.z - mob.mesh.position.z;
        const distSq = dx * dx + dz * dz;
        let dir2;
        // Determine movement direction: chase if within radius, otherwise wander
        if (distSq < chaseDistSq) {
          const dist = Math.sqrt(distSq) || 1;
          dir2 = new THREE.Vector2(dx / dist, dz / dist);
        } else {
          // Wander randomly
          mob.moveTime -= dt;
          if (mob.moveTime <= 0) {
            mob.dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
            mob.moveTime = 2 + Math.random() * 4;
          }
          dir2 = mob.dir;
        }
        // Skeleton-specific behaviour: shoot arrows periodically when the player
        // is within range. Skeletons attempt to maintain some distance but still
        // follow the same movement logic as zombies for simplicity.
        if (mob.type === 'skeleton') {
          mob.arrowCooldown -= dt;
          if (mob.arrowCooldown <= 0 && distSq < 225) { // 15 blocks squared
            // Compute direction towards player's eye height
            const target = new THREE.Vector3(player.pos.x, player.pos.y + 0.9, player.pos.z);
            const origin = new THREE.Vector3(mob.mesh.position.x, mob.mesh.position.y + 0.9, mob.mesh.position.z);
            const dir3 = target.clone().sub(origin).normalize();
            // Create arrow mesh (a thin cylinder). Align it to direction implicitly by
            // translating; rotation is not necessary for simple visualization.
            const arrowGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
            const arrowMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
            arrowMesh.position.copy(origin);
            this.scene.add(arrowMesh);
            const arrow = {
              mesh: arrowMesh,
              vel: dir3.clone().multiplyScalar(12),
            };
            this.arrows.push(arrow);
            // Reset cooldown between 2 and 4 seconds
            mob.arrowCooldown = 2 + Math.random() * 2;
          }
        }
        // Creeper-specific behaviour: start fuse when close to the player and
        // explode after the fuse counts down. Creepers continue to move
        // toward the player while fusing. When they explode, they call the
        // shared explode() function and are removed from the world. Damage
        // to the player is applied if nearby.
        if (mob.type === 'creeper') {
          // Begin fusing when within a 4-block radius of the player
          if (!mob.fusing && distSq < 16) {
            mob.fusing = true;
          }
          if (mob.fusing) {
            mob.fuse -= dt;
            if (mob.fuse <= 0) {
              // Remove creeper mesh
              this.scene.remove(mob.mesh);
              // Compute explosion center at integer coordinates
              const cx = Math.floor(mob.mesh.position.x);
              const cy = Math.floor(mob.mesh.position.y);
              const cz = Math.floor(mob.mesh.position.z);
              explode(cx, cy, cz);
              // Damage player if close to explosion
              const pdx = player.pos.x - cx;
              const pdy = player.pos.y - cy;
              const pdz = player.pos.z - cz;
              const pd2 = pdx * pdx + pdy * pdy + pdz * pdz;
              if (pd2 < 16 && typeof damagePlayer === 'function') {
                damagePlayer(4);
              }
              // Flag for removal from mob list
              mob.toRemove = true;
              continue;
            }
          }
        }
        // Proposed new position for the mob
        let newX = mob.mesh.position.x + dir2.x * speed * dt;
        let newZ = mob.mesh.position.z + dir2.y * speed * dt;
        const checkX = Math.floor(newX);
        const checkZ = Math.floor(newZ);
        let groundY = -1;
        // Find the ground height at the new position. Mobs stand on top of the
        // first solid block below. Non-solid blocks like leaves, water, torches,
        // ladders, redstone torches and sugar cane are ignored when searching
        // for ground.
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const t = this.getBlock(checkX, y, checkZ);
          if (t !== 0 && t !== 6 && t !== 7 && t !== 17 && t !== 18 && t !== 19 && t !== 21) {
            groundY = y;
            break;
          }
        }
        // If no valid ground found, skip movement and reset wander timer
        if (groundY < 0) {
          mob.moveTime = 0;
          continue;
        }
        // Avoid water
        const underType = this.getBlock(checkX, groundY, checkZ);
        if (underType === 7) {
          mob.moveTime = 0;
          continue;
        }
        mob.mesh.position.x = newX;
        mob.mesh.position.z = newZ;
        mob.mesh.position.y = groundY + 1;
        // Melee damage: both zombies and skeletons hurt the player when very
        // close. Skeleton arrows already deal damage, but contact damage
        // remains for simplicity.
        if (distSq < 0.64) {
          if (typeof damagePlayer === 'function') {
            damagePlayer(dt * 2);
          }
        }
      }
      // Remove any mobs flagged for removal (e.g. exploded creepers)
      this.hostileMobs = this.hostileMobs.filter(m => !m.toRemove);
    }
    // Update chunks around player position
    updateChunks(playerX, playerZ) {
      // Determine the player's current chunk coordinates
      const pcx = Math.floor(playerX / CHUNK_SIZE);
      const pcz = Math.floor(playerZ / CHUNK_SIZE);
      // Keep track of chunks that should remain loaded around the player
      const needed = new Set();
      // Iterate through the range of chunks within view distance
      for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
        for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          needed.add(`${cx},${cz}`);
          const chunk = this.getChunk(cx, cz);
          // Build or update the chunk's mesh if necessary
          chunk.buildMesh();
        }
      }
      // Unload and optionally discard chunks far outside the view distance.
      // This prevents the chunk map from growing without bound when the
      // player travels long distances. A margin of +1 ensures that
      // freshly loaded chunks just outside the view distance aren't
      // immediately destroyed.
      for (const [key, chunk] of this.chunks.entries()) {
        // Extract chunk coordinates from the key string
        const [cxStr, czStr] = key.split(',');
        const cx = parseInt(cxStr, 10);
        const cz = parseInt(czStr, 10);
        const dx = Math.abs(cx - pcx);
        const dz = Math.abs(cz - pcz);
        const maxDist = Math.max(dx, dz);
        // If the chunk is outside the needed set, unload its mesh. If
        // it's beyond the view distance plus a safety margin, also
        // remove the chunk data entirely to free memory.
        if (!needed.has(key)) {
          if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            chunk.mesh.material.dispose();
            chunk.mesh = null;
          }
          // Discard chunk if it's far beyond the view distance (e.g., > VIEW_DISTANCE + 1)
          if (maxDist > VIEW_DISTANCE + 1) {
            this.chunks.delete(key);
          }
        }
      }
    }

    // Update falling sand and gravel blocks. This scans all loaded chunks
    // within view distance and causes sand (5) and gravel (15) blocks to fall
    // downwards one block if there is air or water beneath them. Only one
    // vertical step is performed per update to match the slow falling in
    // classic Minecraft. Neighboring chunks are marked dirty when a block
    // crosses a chunk boundary.
    updateFallingBlocks(playerX, playerZ) {
      const pcx = Math.floor(playerX / CHUNK_SIZE);
      const pcz = Math.floor(playerZ / CHUNK_SIZE);
      for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
        for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = `${cx},${cz}`;
          const chunk = this.chunks.get(key);
          if (!chunk) continue;
          // Iterate from bottom up so multiple blocks can fall sequentially
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
              // Skip the bottom layer (y=0) since nothing can fall further
              for (let ly = 1; ly < CHUNK_HEIGHT; ly++) {
                const type = chunk.getLocalBlock(lx, ly, lz);
                if (type === 5 || type === 15) {
                  const worldY = ly - 1;
                  const worldX = cx * CHUNK_SIZE + lx;
                  const worldZ = cz * CHUNK_SIZE + lz;
                  const belowType = this.getBlock(worldX, worldY, worldZ);
                  if (belowType === 0 || belowType === 7) {
                    // Swap blocks: move current block down and set current to air
                    this.setBlock(worldX, worldY, worldZ, type);
                    this.setBlock(worldX, worldY + 1, worldZ, 0);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // ---- Player definition ----
  class Player {
    constructor(camera, world) {
      this.camera = camera;
      this.world = world;
      // Position of player's feet (bottom of bounding box)
      // Spawn the player well above ground to avoid spawning underground. A
      // moderate Y value (40) suits the larger world height.
      this.pos = new THREE.Vector3(0, 40, 0);
      this.vel = new THREE.Vector3();
      this.yaw = 0;
      this.pitch = 0;
      this.keys = { forward: false, backward: false, left: false, right: false, jump: false, sprint: false };
      this.onGround = false;
      // Track falling for fall damage. When the player begins to fall we
      // record the starting Y position. Upon landing we calculate the
      // distance fallen and apply damage based on the drop. See
      // https://manacube.fandom.com/wiki/Falling for fall damage thresholds【17503841745776†L88-L103】.
      this.fallStartY = this.pos.y;
      this.falling = false;
    }
    // Check if player's bounding box collides with any block
    collides(x, y, z) {
      // Compute bounding box extents
      const minX = Math.floor(x - PLAYER_RADIUS);
      const maxX = Math.floor(x + PLAYER_RADIUS);
      const minY = Math.floor(y);
      const maxY = Math.floor(y + PLAYER_HEIGHT);
      const minZ = Math.floor(z - PLAYER_RADIUS);
      const maxZ = Math.floor(z + PLAYER_RADIUS);
      for (let ix = minX; ix <= maxX; ix++) {
        for (let iy = minY; iy <= maxY; iy++) {
          for (let iz = minZ; iz <= maxZ; iz++) {
            const block = this.world.getBlock(ix, iy, iz);
            // Only treat certain blocks as solid. Leaves (6), water (7), torches (17)
            // and ladders (18) are considered non‑solid so the player can move
            // through them. Air (0) is also non‑solid. All other blocks block
            // movement.
            if (block !== 0 && block !== 6 && block !== 7 && block !== 17 && block !== 18 && block !== 19 && block !== 21) {
              return true;
            }
          }
        }
      }
      return false;
    }
    update(dt) {
      // Compute movement direction based on keys and yaw
      let moveX = 0;
      let moveZ = 0;
      if (this.keys.forward) { moveZ -= 1; }
      if (this.keys.backward) { moveZ += 1; }
      if (this.keys.left) { moveX -= 1; }
      if (this.keys.right) { moveX += 1; }
      let dir = new THREE.Vector3();
      if (moveX !== 0 || moveZ !== 0) {
        const speed = WALK_SPEED * (this.keys.sprint ? 1.5 : 1);
        const yawRad = this.yaw;
        // Right vector: (cos(yaw), 0, -sin(yaw))
        const right = new THREE.Vector3(Math.cos(yawRad), 0, -Math.sin(yawRad));
        // Forward vector: (sin(yaw), 0, cos(yaw))
        const forward = new THREE.Vector3(Math.sin(yawRad), 0, Math.cos(yawRad));
        dir.copy(right).multiplyScalar(moveX).add(forward.multiplyScalar(moveZ)).normalize().multiplyScalar(speed);
      }
      // Set horizontal velocity
      this.vel.x = dir.x;
      this.vel.z = dir.z;
      // Apply gravity
      // Check if the player is inside a ladder. If so we override gravity and
      // allow climbing up or down. We sample blocks at the player's feet and
      // head to capture ladders encountered mid‑air. Ladders are represented
      // by block type 18.
      const footX = Math.floor(this.pos.x);
      const footY = Math.floor(this.pos.y);
      const footZ = Math.floor(this.pos.z);
      const headY = Math.floor(this.pos.y + PLAYER_HEIGHT - 0.1);
      const onLadder = (this.world.getBlock(footX, footY, footZ) === 18) ||
                       (this.world.getBlock(footX, headY, footZ) === 18);
      if (onLadder) {
        // Cancel gravity while on a ladder
        this.vel.y = 0;
        // Climb up when the player holds jump; descend when holding sprint.
        const climbSpeed = 3;
        if (this.keys.jump) {
          this.pos.y += climbSpeed * dt;
        } else if (this.keys.sprint) {
          this.pos.y -= climbSpeed * dt;
        }
        // Prevent the player from being flagged as onGround so they don't stop
        // moving when colliding with the ladder block
        this.onGround = false;
      } else {
        // Apply gravity normally when not on a ladder
        this.vel.y -= GRAVITY * dt;
      }
      // Jump
      if (this.keys.jump && this.onGround) {
        this.vel.y = JUMP_SPEED;
        this.onGround = false;
      }
      // Desired new position
      const newX = this.pos.x + this.vel.x * dt;
      const newZ = this.pos.z + this.vel.z * dt;
      let newY = this.pos.y + this.vel.y * dt;
      // Horizontal collisions along X
      if (!this.collides(newX, this.pos.y, this.pos.z)) {
        this.pos.x = newX;
      } else {
        this.vel.x = 0;
      }
      // Horizontal collisions along Z
      if (!this.collides(this.pos.x, this.pos.y, newZ)) {
        this.pos.z = newZ;
      } else {
        this.vel.z = 0;
      }
      // Vertical movement and collisions
      if (this.vel.y > 0) {
        // Ascending: check head collision
        if (!this.collides(this.pos.x, newY + PLAYER_HEIGHT - 0.001, this.pos.z)) {
          this.pos.y = newY;
        } else {
          // Hit ceiling
          this.vel.y = 0;
          // Snap just below ceiling
          this.pos.y = Math.floor(this.pos.y + PLAYER_HEIGHT) - PLAYER_HEIGHT;
        }
      } else {
        // Descending or stationary: check ground collision
        if (!this.collides(this.pos.x, newY, this.pos.z)) {
          // If we were previously on the ground and now starting to fall,
          // mark the beginning of a fall. We only record the start once per
          // fall. Falling state resets when landing below.
          if (!this.falling && !this.onGround && this.vel.y < 0) {
            this.falling = true;
            this.fallStartY = this.pos.y;
          }
          this.pos.y = newY;
          this.onGround = false;
        } else {
          // Hit ground
          // Snap to top of block
          this.pos.y = Math.floor(this.pos.y);
          this.onGround = true;
          this.vel.y = 0;
          // Apply fall damage if we were falling from a significant height.
          if (this.falling) {
            const fallDistance = this.fallStartY - this.pos.y;
            if (fallDistance > 3) {
              // In classic Minecraft, each block after 3 inflicts half a heart
              // of damage. We convert hearts to health points (1 heart = 2 points).
              const damageHearts = (fallDistance - 3) / 2;
              if (typeof damagePlayer === 'function') {
                damagePlayer(damageHearts);
              }
            }
            this.falling = false;
          }
        }
      }
      // Update camera position and orientation
      this.camera.position.set(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
      // Set camera rotation based on yaw and pitch (YXZ order to avoid gimbal lock)
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

      // Apply environmental hazards. Cactus blocks (type 20) hurt the player
      // when touched. We sample both the player's feet and head block to
      // detect contact. Damage is proportional to dt (1 point per
      // second).
      const footBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z));
      const headBlock = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + PLAYER_HEIGHT - 0.1), Math.floor(this.pos.z));
      if (footBlock === 20 || headBlock === 20) {
        if (typeof damagePlayer === 'function') {
          damagePlayer(dt);
        }
      }
    }
  }

  // ---- Voxel raycasting using 3D DDA ----
  function raycastVoxel(world, origin, direction, maxDist = 5) {
    // Based on Amanatides & Woo 3D DDA algorithm
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
    let tMaxX;
    let tMaxY;
    let tMaxZ;
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

  // ---- TNT explosion ----
  // When a TNT block is ignited (e.g. by left clicking), remove it and
  // destroy surrounding blocks in a spherical radius. This simplistic
  // explosion clears out blocks (except water) without physics or damage
  // to the player. It mimics the destructive power of TNT in Minecraft.
  function explode(cx, cy, cz) {
    const radius = 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > radius + 0.5) continue;
          const x = cx + dx;
          const y = cy + dy;
          const z = cz + dz;
          const block = world.getBlock(x, y, z);
          // Skip destroying water or air. All other blocks are removed.
          if (block !== 0 && block !== 7) {
            world.setBlock(x, y, z, 0);
          }
        }
      }
    }
  }

  // ---- Hotbar UI management ----
  function updateHotbar(selected) {
    hud.innerHTML = '';
    for (let i = 0; i < HOTBAR_SLOTS.length; i++) {
      const slotType = HOTBAR_SLOTS[i];
      const slot = document.createElement('div');
      slot.className = 'slot' + (i === selected ? ' selected' : '');
      const name = BLOCK_TYPES[slotType].name;
      slot.textContent = i + 1;
      slot.style.backgroundColor = '#' + BLOCK_TYPES[slotType].color.toString(16).padStart(6, '0');
      hud.appendChild(slot);
    }
  }

  // ---- Initialization ----
  // Create renderer, scene and camera
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x87CEEB); // sky blue
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  // Lighting: ambient light and directional sunlight
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.set(1, 1.5, 1).normalize();
  scene.add(sunLight);
  // Fog for distance falloff
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.025);
  // Camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  // Create world and player
  const world = new World(scene);
  const player = new Player(camera, world);
  // Hotbar state
  let selectedSlot = 0;
  updateHotbar(selectedSlot);

  // -------- Health System --------
  // Display and track the player's health. A new <div id="health"> is
  // defined in index.html. The player has 10 hearts by default and
  // regenerates when respawning. When health reaches zero the player
  // respawns at the original spawn point.
  const healthDiv = document.getElementById('health');
  let playerHealth = 10;
  const maxHealth = 10;
  // Update the health UI. Use heart symbols to represent full hearts.
  function updateHealth() {
    // Compute the number of full hearts (1 per point). We allow half hearts
    // when health is fractional, but only display half if there is at least
    // 0.5 health left beyond the integer portion.
    const fullHearts = Math.floor(playerHealth);
    const halfHeart = playerHealth - fullHearts >= 0.5;
    let hearts = '';
    for (let i = 0; i < fullHearts; i++) {
      hearts += '❤';
    }
    if (halfHeart) hearts += '♥';
    healthDiv.textContent = hearts;
  }
  // Damage the player by the specified amount. If health falls to or below
  // zero, reset health to maximum and respawn the player at the spawn
  // location. The player's velocity is also cleared to avoid
  // immediately falling to death again.
  function damagePlayer(amount) {
    playerHealth -= amount;
    if (playerHealth <= 0) {
      playerHealth = maxHealth;
      // Respawn: position the player above the ground and reset velocity
      player.pos.set(0, 40, 0);
      player.vel.set(0, 0, 0);
    }
    updateHealth();
  }
  // Initialize the health display
  updateHealth();

  // Spawn a few passive mobs near the origin to make the world feel alive.
  // We choose positions within a 16×16 area around (0,0). Mobs will find
  // their own height on the terrain when they first update.
  for (let i = 0; i < 4; i++) {
    const mx = (Math.random() - 0.5) * 16;
    const mz = (Math.random() - 0.5) * 16;
    // Determine initial y by sampling terrain height. We'll scan down from
    // top to find ground. If none found, default to 40.
    let my = 40;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const t = world.getBlock(Math.floor(mx), y, Math.floor(mz));
      if (t !== 0 && t !== 6 && t !== 7 && t !== 17 && t !== 18 && t !== 19) {
        my = y + 1;
        break;
      }
    }
    world.spawnMob(Math.floor(mx), my, Math.floor(mz));
  }

  // Resize handling
  window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
  });

  // Pointer lock and input handling
  let pointerLocked = false;
  function lockPointer() {
    if (!pointerLocked) {
      renderer.domElement.requestPointerLock();
    }
  }
  // Listen for pointer lock changes
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
      pointerLocked = true;
      overlay.classList.add('hidden');
    } else {
      pointerLocked = false;
      overlay.classList.remove('hidden');
    }
  });
  // Mouse move: update yaw and pitch
  document.addEventListener('mousemove', (event) => {
    if (!pointerLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    player.yaw -= movementX * SENSITIVITY;
    player.pitch -= movementY * SENSITIVITY;
    // Clamp pitch to avoid flipping
    const maxPitch = Math.PI / 2 - 0.01;
    player.pitch = clamp(player.pitch, -maxPitch, maxPitch);
  });
  // Mouse buttons for block interactions
  document.addEventListener('mousedown', (event) => {
    if (!pointerLocked) {
      lockPointer();
      return;
    }
    // 0: left click (destroy), 2: right click (place)
    if (event.button === 0 || event.button === 2) {
      event.preventDefault();
      const origin = camera.position.clone();
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const hit = raycastVoxel(world, origin, direction, 6);
      if (hit) {
        const blockType = world.getBlock(hit.x, hit.y, hit.z);
        if (event.button === 0) {
          // Left click: break block. Special case for TNT: trigger explosion
          if (blockType === 14) {
            explode(hit.x, hit.y, hit.z);
          } else {
            // If breaking a piston, remove its facing record
            if (blockType === 13) {
              world.removePistonFacing(hit.x, hit.y, hit.z);
            }
            world.setBlock(hit.x, hit.y, hit.z, 0);
          }
        } else if (event.button === 2 && hit.face) {
          // Right click: place block adjacent to face using selected hotbar type
          const placeX = hit.x + hit.face.x;
          const placeY = hit.y + hit.face.y;
          const placeZ = hit.z + hit.face.z;
          // Don't place inside player bounding box
          if (!player.collides(placeX + 0.5, placeY, placeZ + 0.5)) {
            const typeToPlace = HOTBAR_SLOTS[selectedSlot];
            world.setBlock(placeX, placeY, placeZ, typeToPlace);
            // If placing a piston or sticky piston, record its facing direction (away from the clicked face)
            if ((typeToPlace === 13 || typeToPlace === 23) && hit.face) {
              // Pistons push blocks in the direction of hit.face, so we store this vector
              world.setPistonFacing(placeX, placeY, placeZ, hit.face);
              // Ensure sticky pistons start unextended
              if (typeToPlace === 23) {
                const key = `${placeX},${placeY},${placeZ}`;
                world.stickyExtended.set(key, false);
              }
            }
          }
        }
      }
    }
  });
  // Context menu: prevent default when pointer locked
  document.addEventListener('contextmenu', (e) => {
    if (pointerLocked) e.preventDefault();
  });
  // Keyboard input
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW': player.keys.forward = true; break;
      case 'KeyS': player.keys.backward = true; break;
      case 'KeyA': player.keys.left = true; break;
      case 'KeyD': player.keys.right = true; break;
      case 'Space': player.keys.jump = true; break;
      case 'ShiftLeft': player.keys.sprint = true; break;
      case 'Digit1': selectedSlot = 0; updateHotbar(selectedSlot); break;
      case 'Digit2': if (HOTBAR_SLOTS.length > 1) { selectedSlot = 1; updateHotbar(selectedSlot); } break;
      case 'Digit3': if (HOTBAR_SLOTS.length > 2) { selectedSlot = 2; updateHotbar(selectedSlot); } break;
      case 'Digit4': if (HOTBAR_SLOTS.length > 3) { selectedSlot = 3; updateHotbar(selectedSlot); } break;
      case 'Digit5': if (HOTBAR_SLOTS.length > 4) { selectedSlot = 4; updateHotbar(selectedSlot); } break;
      case 'Digit6': if (HOTBAR_SLOTS.length > 5) { selectedSlot = 5; updateHotbar(selectedSlot); } break;
      case 'Digit7': if (HOTBAR_SLOTS.length > 6) { selectedSlot = 6; updateHotbar(selectedSlot); } break;
      case 'Digit8': if (HOTBAR_SLOTS.length > 7) { selectedSlot = 7; updateHotbar(selectedSlot); } break;
      case 'Digit9': if (HOTBAR_SLOTS.length > 8) { selectedSlot = 8; updateHotbar(selectedSlot); } break;
      case 'Digit0': if (HOTBAR_SLOTS.length > 9) { selectedSlot = 9; updateHotbar(selectedSlot); } break;
      case 'Backquote':
        // Toggle debug overlay when the backtick/tilde key is pressed. F3 is
        // reserved by many browsers for find in page so we use this key instead.
        debugVisible = !debugVisible;
        debugDiv.style.display = debugVisible ? 'block' : 'none';
        break;
      default: break;
    }
  });
  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': player.keys.forward = false; break;
      case 'KeyS': player.keys.backward = false; break;
      case 'KeyA': player.keys.left = false; break;
      case 'KeyD': player.keys.right = false; break;
      case 'Space': player.keys.jump = false; break;
      case 'ShiftLeft': player.keys.sprint = false; break;
      default: break;
    }
  });
  // Mouse wheel to change selected block
  document.addEventListener('wheel', (e) => {
    if (!pointerLocked) return;
    e.preventDefault();
    if (e.deltaY > 0) {
      selectedSlot = (selectedSlot + 1) % HOTBAR_SLOTS.length;
    } else {
      selectedSlot = (selectedSlot - 1 + HOTBAR_SLOTS.length) % HOTBAR_SLOTS.length;
    }
    updateHotbar(selectedSlot);
  }, { passive: false });

  // Click overlay to start
  overlay.addEventListener('click', () => {
    lockPointer();
  });

  // Game loop
  const clock = new THREE.Clock();
  // Track world time for the day/night cycle.
  let worldTime = 0;
  // Colours used in the day/night cycle for sky and fog. Day is a bright sky
  // blue, night is a deep navy. These values are similar to the classic beta
  // palette.
  const dayColor = new THREE.Color(0x87CEEB);
  const nightColor = new THREE.Color(0x0B0D2B);
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (pointerLocked) {
      player.update(dt);
      // Update world chunks around player
      world.updateChunks(player.pos.x, player.pos.z);
      // Apply falling physics to sand and gravel within loaded chunks
      world.updateFallingBlocks(player.pos.x, player.pos.z);
      // Power redstone devices (pistons, sticky pistons and TNT) from nearby redstone torches
      world.updatePoweredBlocks(player.pos.x, player.pos.z);
      // Retract sticky pistons that are no longer powered
      world.updateStickyRetraction(player.pos.x, player.pos.z);
      // Update mob wandering and positioning
      world.updateMobs(dt);
      // Update hostile mobs: chase the player and deal damage on contact
      world.updateHostiles(dt);
    }
    // Advance the world time. Wraps around after a full day.
    worldTime += dt;
    const t = (worldTime % DAY_LENGTH) / DAY_LENGTH; // 0..1
    // Compute the sun's angle around the sky. At t=0.25 it's midday.
    const angle = t * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunIntensityBase = clamp(sunY * 0.5 + 0.5, 0, 1);

    // During the night (when the sun is low), spawn hostile mobs if there
    // are too few. Hostiles spawn at random positions around the player,
    // up to 20 blocks away, and only when the pointer is locked (game is
    // active). They will seek out the player and inflict damage. We
    // attempt to spawn up to three hostiles.
    if (sunIntensityBase < 0.2 && pointerLocked) {
      const desiredHostiles = 3;
      if (world.hostileMobs.length < desiredHostiles) {
        for (let i = world.hostileMobs.length; i < desiredHostiles; i++) {
          const angleSpawn = Math.random() * Math.PI * 2;
          const distSpawn = 8 + Math.random() * 12;
          const hx = player.pos.x + Math.cos(angleSpawn) * distSpawn;
          const hz = player.pos.z + Math.sin(angleSpawn) * distSpawn;
          // Determine ground height at spawn location
          let hy = 40;
          for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
            const tblock = world.getBlock(Math.floor(hx), y, Math.floor(hz));
            if (tblock !== 0 && tblock !== 6 && tblock !== 7 && tblock !== 17 && tblock !== 18 && tblock !== 19 && tblock !== 21) {
              hy = y + 1;
              break;
            }
          }
          // Randomly choose between a zombie, skeleton and creeper when spawning hostiles.
          const r = Math.random();
          if (r < 0.33) {
            world.spawnHostile(Math.floor(hx), hy, Math.floor(hz));
          } else if (r < 0.66) {
            world.spawnSkeleton(Math.floor(hx), hy, Math.floor(hz));
          } else {
            world.spawnCreeper(Math.floor(hx), hy, Math.floor(hz));
          }
        }
      }
    }
    // Toggle weather periodically. When the timer exceeds the next toggle, end
    // any current precipitation and potentially start a new one. Deserts
    // never see rain or snow【338925297753919†L107-L112】. Cold biomes are more likely
    // to experience snow【338925297753919†L160-L171】.
    weatherTimer += dt;
    if (weatherTimer >= nextWeatherToggle) {
      weatherTimer = 0;
      nextWeatherToggle = 120 + Math.random() * 180;
      // End current precipitation
      if (isRaining) {
        removeRain();
        isRaining = false;
      }
      if (isSnowing) {
        removeSnow();
        isSnowing = false;
      }
      // Determine biome value at the player's position using the biome noise
      const bVal = world.biomeNoise.noise(player.pos.x * 0.01, player.pos.z * 0.01);
      // Only consider precipitation outside of deserts
      if (bVal <= 0.6) {
        if (bVal < -0.6) {
          // Strongly favour snow in cold regions
          if (Math.random() < 0.7) {
            isSnowing = true;
            createSnow();
          } else {
            isRaining = true;
            createRain();
          }
        } else {
          // In moderate climates choose rain most of the time but allow occasional snow
          const r = Math.random();
          if (r < 0.5) {
            isRaining = true;
            createRain();
          } else if (r < 0.7) {
            isSnowing = true;
            createSnow();
          }
        }
      }
    }
    // Update active precipitation systems
    if (isRaining) updateRain(dt);
    if (isSnowing) updateSnow(dt);
    // Dim lighting during precipitation
    const weatherDim = (isRaining || isSnowing) ? 0.6 : 1;
    const sunIntensity = sunIntensityBase * weatherDim;
    sunLight.intensity = 0.8 * sunIntensity;
    ambientLight.intensity = (0.2 + 0.3 * sunIntensityBase) * weatherDim;
    // Move the sun around the sky
    sunLight.position.set(Math.cos(angle), sunY, Math.sin(angle)).normalize();
    // Compute sky colour, darkening it slightly when precipitating
    const skyColor = new THREE.Color();
    skyColor.lerpColors(nightColor, dayColor, sunIntensityBase);
    if (isRaining || isSnowing) {
      skyColor.multiplyScalar(0.8);
    }
    renderer.setClearColor(skyColor);
    scene.fog.color.copy(skyColor);
    // Update debug overlay if visible
    if (debugVisible) {
      const degYaw = ((player.yaw * 180 / Math.PI) % 360).toFixed(1);
      const degPitch = ((player.pitch * 180 / Math.PI) % 360).toFixed(1);
      let weatherStr = '';
      if (isRaining) weatherStr = '<br>Weather: Rain';
      else if (isSnowing) weatherStr = '<br>Weather: Snow';
      debugDiv.innerHTML =
        `X: ${player.pos.x.toFixed(2)} Y: ${player.pos.y.toFixed(2)} Z: ${player.pos.z.toFixed(2)}<br>` +
        `Yaw: ${degYaw}° Pitch: ${degPitch}°` +
        weatherStr;
    }
    renderer.render(scene, camera);
  }
  animate();
});