/**
 * Block Highlight System
 * Renders a wireframe box around the currently targeted block
 */

import * as THREE from 'three';
import { raycastVoxel } from '../utils/raycast.js';

export class BlockHighlight {
  constructor(scene, camera, world) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.mesh = null;

    this.init();
  }

  /**
   * Initialize the highlight mesh
   */
  init() {
    // Create a wireframe box slightly larger than a block
    const geometry = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      opacity: 0.4,
      transparent: true
    });

    this.mesh = new THREE.LineSegments(edges, material);
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  /**
   * Update highlight position based on raycast
   */
  update() {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const hit = raycastVoxel(this.world, origin, direction, 6);

    if (hit) {
      this.mesh.position.set(
        hit.x + 0.5,
        hit.y + 0.5,
        hit.z + 0.5
      );
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }
}
