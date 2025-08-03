/**
 * Utility Functions
 * Common mathematical and helper functions used throughout the game
 */

/**
 * Generate deterministic pseudo-random value based on coordinates and seed
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} seed - Random seed
 * @returns {number} Pseudo-random value between 0 and 1
 */
export function pseudoRandom(x, y, seed) {
  const s = Math.sin((x * 3747613 + y * 668265263 + seed * 700001) & 0xffffffff);
  return s - Math.floor(s);
}

/**
 * Modulo function that handles negative numbers properly
 * @param {number} n - Number to mod
 * @param {number} m - Modulus
 * @returns {number} Proper modulo result
 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert hex color to linear RGB array (0-1 range)
 * @param {number} hex - Hex color value
 * @returns {number[]} RGB array with values 0-1
 */
export function hexToRgbLinear(hex) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return [r, g, b];
}

/**
 * Check if a block type is solid (blocks movement)
 * @param {number} blockType - Block type ID
 * @returns {boolean} True if block is solid
 */
export function isSolid(blockType) {
  // Air, leaves, water, torches, ladders, redstone torches, sugar cane are non-solid
  return blockType !== 0 && blockType !== 6 && blockType !== 7 && 
         blockType !== 17 && blockType !== 18 && blockType !== 19 && blockType !== 21;
}

/**
 * Check if a block type is passable for projectiles
 * @param {number} blockType - Block type ID
 * @returns {boolean} True if projectile can pass through
 */
export function isPassable(blockType) {
  return blockType === 0 || blockType === 6 || blockType === 7 || 
         blockType === 17 || blockType === 18 || blockType === 19 || blockType === 21;
}
