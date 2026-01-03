/**
 * Particle System
 * Handles block breaking particles
 */

import * as THREE from 'three';
import { BLOCK_TYPES } from '../core/config.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  /**
   * Spawn particles at a specific location
   */
  spawnBlockParticles(x, y, z, blockType) {
    if (blockType === 0) return;

    const blockColor = BLOCK_TYPES[blockType].color;
    const count = 8; // Number of particles

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: blockColor });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material);

      // Random position within the block
      mesh.position.set(
        x + Math.random(),
        y + Math.random(),
        z + Math.random()
      );

      // Random velocity
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        vel: vel,
        life: 1.0 // Seconds
      });
    }
  }

  /**
   * Update all particles
   */
  update(dt) {
    const gravity = 20;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        // Material is shared, don't dispose
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vel.y -= gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);

      // Ground collision (simple floor check)
      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 0;
        p.vel.y *= -0.5; // Bounce
      }
    }
  }
}
