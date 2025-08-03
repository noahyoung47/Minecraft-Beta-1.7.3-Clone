/**
 * Perlin Noise Implementation
 * Based on the algorithm described by Joe Iddon
 * Used for terrain generation and cave systems
 */

import { pseudoRandom } from './helpers.js';

export class Perlin {
  constructor(seed = 0) {
    this.seed = seed;
  }

  /**
   * Generate a random gradient vector for a given integer coordinate
   * @param {number} ix - Integer X coordinate
   * @param {number} iy - Integer Y coordinate
   * @returns {Object} Gradient vector with x, y components
   */
  randomGradient(ix, iy) {
    const random = pseudoRandom(ix, iy, this.seed);
    const angle = random * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  /**
   * Compute dot product between gradient vector at grid point and distance vector
   * @param {number} ix - Integer X coordinate
   * @param {number} iy - Integer Y coordinate
   * @param {number} x - Actual X coordinate
   * @param {number} y - Actual Y coordinate
   * @returns {number} Dot product result
   */
  dotGridGradient(ix, iy, x, y) {
    const grad = this.randomGradient(ix, iy);
    const dx = x - ix;
    const dy = y - iy;
    return dx * grad.x + dy * grad.y;
  }

  /**
   * Quintic smoothstep function for interpolation
   * @param {number} t - Input value 0-1
   * @returns {number} Smoothed value
   */
  smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * 2D Perlin noise at coordinates (x, y)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Noise value in range [0,1]
   */
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
