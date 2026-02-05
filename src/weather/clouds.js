/**
 * Cloud System
 * Renders a simple cloud layer
 */

import * as THREE from 'three';

export class CloudSystem {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.init();
  }

  init() {
    // Create a large plane for clouds
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 100; // Cloud height

    this.scene.add(this.mesh);
  }

  update(dt, playerPos) {
    if (!this.mesh) return;

    // Move clouds slowly
    const speed = 2; // Units per second

    // Move texture offset if we had a texture, but for a solid plane we can move the mesh
    // and wrap it, or just let it be a static layer for now.
    // For a simple effect, we can just center it on the player so it's always "there"
    // but maybe drift the texture coordinates?
    // Since we don't have textures, let's just keep it centered on XZ to simulate "infinite" clouds
    // relative to the view distance, but not actually moving.

    this.mesh.position.x = playerPos.x;
    this.mesh.position.z = playerPos.z;

    // To simulate movement without texture, we'd need actual cloud chunks.
    // Given the constraints, a semi-transparent white plane at height is a good start
    // for the "atmosphere".
  }
}
