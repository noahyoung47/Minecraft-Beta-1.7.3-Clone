/**
 * Input Manager
 * Handles keyboard, mouse, and pointer lock events
 */

import * as THREE from 'three';
import { SENSITIVITY } from '../core/config.js';
import { raycastVoxel } from '../utils/raycast.js';

export class InputManager {
  constructor(player, world, hotbar, debugOverlay, healthSystem) {
    this.player = player;
    this.world = world;
    this.hotbar = hotbar;
    this.debugOverlay = debugOverlay;
    this.healthSystem = healthSystem;

    this.pointerLocked = false;
    this.overlay = document.getElementById('overlay');
    this.crosshair = document.getElementById('crosshair');
    this.canvas = null;

    this.hudVisible = true;

    this.setupEventListeners();
  }

  /**
   * Set the renderer canvas for pointer lock
   */
  setCanvas(canvas) {
    this.canvas = canvas;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    this.setupPointerLock();
    this.setupMouseEvents();
    this.setupKeyboardEvents();
    this.setupWheelEvents();
  }

  /**
   * Setup pointer lock functionality
   */
  setupPointerLock() {
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.canvas) {
        this.pointerLocked = true;
        if (this.overlay) {
          this.overlay.style.display = 'none';
        }
      } else {
        this.pointerLocked = false;
        if (this.overlay) {
          this.overlay.style.display = 'block';
        }
      }
    });

    // Click overlay to start
    if (this.overlay) {
      this.overlay.addEventListener('click', () => {
        this.lockPointer();
      });
    }
  }

  /**
   * Request pointer lock
   */
  lockPointer() {
    if (!this.pointerLocked && this.canvas) {
      this.canvas.requestPointerLock();
    }
  }

  /**
   * Setup mouse events
   */
  setupMouseEvents() {
    // Mouse movement
    document.addEventListener('mousemove', (event) => {
      if (!this.pointerLocked) return;
      
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      this.player.updateYaw(movementX, SENSITIVITY);
      this.player.updatePitch(movementY, SENSITIVITY);
    });

    // Mouse clicks
    document.addEventListener('mousedown', (event) => {
      if (!this.pointerLocked) {
        this.lockPointer();
        return;
      }

      if (event.button === 0 || event.button === 2) {
        event.preventDefault();
        this.handleBlockInteraction(event.button === 0);
      }
    });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
      if (this.pointerLocked) e.preventDefault();
    });
  }

  /**
   * Handle block breaking and placing
   */
  handleBlockInteraction(isBreaking) {
    const origin = this.player.camera.position.clone();
    const direction = new THREE.Vector3();
    this.player.camera.getWorldDirection(direction);
    
    const hit = raycastVoxel(this.world, origin, direction, 6);
    if (!hit) return;

    const blockType = this.world.getBlock(hit.x, hit.y, hit.z);

    if (isBreaking) {
      // Left click: break block
      if (blockType === 14) {
        // TNT: explode
        this.world.explode(hit.x, hit.y, hit.z);
      } else {
        // Remove piston facing if breaking a piston
        if (blockType === 13 || blockType === 23) {
          this.world.removePistonFacing(hit.x, hit.y, hit.z);
        }
        this.world.setBlock(hit.x, hit.y, hit.z, 0);
      }
    } else if (hit.face) {
      // Right click: place block
      const placeX = hit.x + hit.face.x;
      const placeY = hit.y + hit.face.y;
      const placeZ = hit.z + hit.face.z;

      // Don't place inside player
      if (!this.player.collides(placeX + 0.5, placeY, placeZ + 0.5)) {
        const typeToPlace = this.hotbar.getSelectedBlockType();
        this.world.setBlock(placeX, placeY, placeZ, typeToPlace);

        // Handle piston placement
        if (typeToPlace === 13 || typeToPlace === 23) {
          this.world.setPistonFacing(placeX, placeY, placeZ, hit.face);
          if (typeToPlace === 23) {
            const key = `${placeX},${placeY},${placeZ}`;
            this.world.stickyExtended.set(key, false);
          }
        }
      }
    }
  }

  /**
   * Setup keyboard events
   */
  setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      
      switch (e.code) {
        // Movement
        case 'KeyW': this.player.keys.forward = true; break;
        case 'KeyS': this.player.keys.backward = true; break;
        case 'KeyA': this.player.keys.left = true; break;
        case 'KeyD': this.player.keys.right = true; break;
        case 'Space': this.player.keys.jump = true; break;
        case 'ShiftLeft': this.player.keys.sprint = true; break;
        
        // Hotbar selection
        case 'Digit1': this.hotbar.selectSlot(0); break;
        case 'Digit2': this.hotbar.selectSlot(1); break;
        case 'Digit3': this.hotbar.selectSlot(2); break;
        case 'Digit4': this.hotbar.selectSlot(3); break;
        case 'Digit5': this.hotbar.selectSlot(4); break;
        case 'Digit6': this.hotbar.selectSlot(5); break;
        case 'Digit7': this.hotbar.selectSlot(6); break;
        case 'Digit8': this.hotbar.selectSlot(7); break;
        case 'Digit9': this.hotbar.selectSlot(8); break;
        case 'Digit0': this.hotbar.selectSlot(9); break;

        // Debug toggle (F3)
        case 'F3':
          this.debugOverlay.toggle();
          this.debugOverlay.updateHUDVisibility(this.hudVisible);
          break;

        // HUD toggle (F1)
        case 'F1':
          this.toggleHUD();
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.player.keys.forward = false; break;
        case 'KeyS': this.player.keys.backward = false; break;
        case 'KeyA': this.player.keys.left = false; break;
        case 'KeyD': this.player.keys.right = false; break;
        case 'Space': this.player.keys.jump = false; break;
        case 'ShiftLeft': this.player.keys.sprint = false; break;
      }
    });
  }

  /**
   * Setup mouse wheel events
   */
  setupWheelEvents() {
    document.addEventListener('wheel', (e) => {
      if (!this.pointerLocked) return;
      
      e.preventDefault();
      
      if (e.deltaY > 0) {
        this.hotbar.nextSlot();
      } else {
        this.hotbar.prevSlot();
      }
    }, { passive: false });
  }

  /**
   * Toggle HUD visibility (hotbar, health, crosshair and debug overlay)
   */
  toggleHUD() {
    this.hudVisible = !this.hudVisible;

    if (this.hudVisible) {
      this.hotbar.show();
      this.healthSystem.show();
      if (this.crosshair) {
        this.crosshair.style.display = 'block';
      }
    } else {
      this.hotbar.hide();
      this.healthSystem.hide();
      if (this.crosshair) {
        this.crosshair.style.display = 'none';
      }
    }

    this.debugOverlay.updateHUDVisibility(this.hudVisible);
  }

  /**
   * Check if pointer is locked
   */
  isPointerLocked() {
    return this.pointerLocked;
  }

  /**
   * Create damage player function for use by other systems
   */
  createDamagePlayerFunction() {
    return (amount) => {
      const died = this.healthSystem.damage(amount);
      if (died) {
        // Respawn player
        this.healthSystem.reset();
        this.player.pos.set(0, 40, 0);
        this.player.vel.set(0, 0, 0);
        this.player.falling = false;
      }
    };
  }
}
