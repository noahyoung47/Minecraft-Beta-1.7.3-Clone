/**
 * Hand/Arm Class
 * Renders the player's hand/arm and held item
 */

import * as THREE from 'three';

export class Hand {
  constructor(camera) {
    this.camera = camera;
    this.mesh = null;
    this.swinging = false;
    this.swingTime = 0;
    this.swingDuration = 0.3; // Seconds

    this.init();
  }

  init() {
    // Simple arm geometry
    // Minecraft arm is roughly 4x12x4 pixels (approx 0.25 x 0.75 x 0.25 units)
    const geometry = new THREE.BoxGeometry(0.25, 0.25, 0.75);

    // Skin color
    const material = new THREE.MeshLambertMaterial({ color: 0xB88866 }); // Basic skin tone

    this.mesh = new THREE.Mesh(geometry, material);

    // Position relative to camera
    // Down and to the right
    this.mesh.position.set(0.4, -0.4, -0.8);

    // Add to camera so it moves with view
    this.camera.add(this.mesh);
  }

  /**
   * Trigger swing animation
   */
  swing() {
    if (!this.swinging) {
      this.swinging = true;
      this.swingTime = 0;
    }
  }

  /**
   * Update animation
   */
  update(dt) {
    if (this.swinging) {
      this.swingTime += dt;

      if (this.swingTime >= this.swingDuration) {
        this.swinging = false;
        this.swingTime = 0;
        // Reset position/rotation
        this.mesh.rotation.x = 0;
        this.mesh.rotation.y = 0;
        this.mesh.position.set(0.4, -0.4, -0.8);
      } else {
        // Calculate swing progress (0 to 1)
        const t = this.swingTime / this.swingDuration;
        const sineT = Math.sin(t * Math.PI); // 0 -> 1 -> 0

        // Simple swing arc
        // Rotate down and slightly inward
        this.mesh.rotation.x = -sineT * 1.5;
        this.mesh.rotation.z = sineT * 0.5;

        // Move forward slightly
        this.mesh.position.z = -0.8 - sineT * 0.4;
      }
    }

    // Slight idle sway (breathing)
    if (!this.swinging) {
      const time = Date.now() * 0.002;
      this.mesh.position.y = -0.4 + Math.sin(time) * 0.01;
      this.mesh.rotation.z = Math.sin(time * 0.5) * 0.02;
    }
  }
}
