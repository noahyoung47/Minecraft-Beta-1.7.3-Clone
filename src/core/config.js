/**
 * Game Configuration Constants
 * Central location for all game configuration values
 */

// World generation constants
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const VIEW_DISTANCE = 2;
export const WATER_LEVEL = 12;

// Physics constants
export const GRAVITY = 20;
export const WALK_SPEED = 4;
export const JUMP_SPEED = 8;

// Player constants
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.3;
export const EYE_HEIGHT = 1.62;
export const SENSITIVITY = 0.0025;

// Time and weather constants
export const DAY_LENGTH = 600; // seconds per game day

// Weather constants
export const RAIN_DROP_COUNT = 600;
export const RAIN_SPEED = 20;
export const SNOW_FLAKE_COUNT = 400;
export const SNOW_SPEED = 5;

// Block type definitions
export const BLOCK_TYPES = {
  0: { name: 'Air', color: 0x000000 },
  1: { name: 'Grass', color: 0x4CAF50 },
  2: { name: 'Dirt', color: 0x8B5A2B },
  3: { name: 'Stone', color: 0x888888 },
  4: { name: 'Wood', color: 0x71543E },
  5: { name: 'Sand', color: 0xE2C499 },
  6: { name: 'Leaves', color: 0x3A8C41 },
  7: { name: 'Water', color: 0x2D59AA },
  8: { name: 'Coal Ore', color: 0x4a4a4a },
  9: { name: 'Iron Ore', color: 0xd8a559 },
  10: { name: 'Gold Ore', color: 0xf5d76e },
  11: { name: 'Diamond Ore', color: 0x48d1cc },
  12: { name: 'Redstone Ore', color: 0xc70039 },
  13: { name: 'Piston', color: 0xb5a565 },
  14: { name: 'TNT', color: 0xcc0000 },
  15: { name: 'Gravel', color: 0x83786f },
  16: { name: 'Fence', color: 0x8b4513 },
  17: { name: 'Torch', color: 0xffa500 },
  18: { name: 'Ladder', color: 0xa67c52 },
  19: { name: 'Redstone Torch', color: 0xdd3300 },
  20: { name: 'Cactus', color: 0x2ca02c },
  21: { name: 'Sugar Cane', color: 0x6dc066 },
  22: { name: 'Snow', color: 0xffffff },
  23: { name: 'Sticky Piston', color: 0x9c8544 },
};

// Hotbar block types (what players can place)
export const HOTBAR_SLOTS = [
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

// Health system constants
export const MAX_HEALTH = 10;

// Day/night cycle colors
export const DAY_COLOR = 0x87CEEB;
export const NIGHT_COLOR = 0x0B0D2B;
