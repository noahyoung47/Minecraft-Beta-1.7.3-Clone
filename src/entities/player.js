/**
 * Player Class
 * Handles player movement, physics, and interactions
 */

import * as THREE from 'three';
import { 
  GRAVITY, 
  WALK_SPEED, 
  JUMP_SPEED, 
  PLAYER_HEIGHT, 
  PLAYER_RADIUS, 
  EYE_HEIGHT 
} from '../core/config.js';
import { isSolid } from '../utils/helpers.js';

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    
    // Position and movement
    this.pos = new THREE.Vector3(0, 40, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    
    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false
    };
    
    // Physics state
    this.onGround = false;
    this.fallStartY = this.pos.y;
    this.falling = false;

    // View bobbing state
    this.bobbingTime = 0;
    this.bobbingAmount = 0.05; // Amplitude of bobbing
    this.bobbingSpeed = 10;    // Speed of bobbing
  }

  /**
   * Check if player's bounding box collides with any solid block
   */
  collides(x, y, z) {
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
          if (isSolid(block)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Update player position and physics
   */
  update(dt, damagePlayerFn) {
    this.updateMovement(dt);
    this.updatePhysics(dt, damagePlayerFn);
    this.updateCamera();
    this.checkEnvironmentalHazards(dt, damagePlayerFn);
  }

  /**
   * Update movement based on input
   */
  updateMovement(dt) {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) moveZ -= 1;
    if (this.keys.backward) moveZ += 1;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;

    let dir = new THREE.Vector3();
    if (moveX !== 0 || moveZ !== 0) {
      const speed = WALK_SPEED * (this.keys.sprint ? 1.5 : 1);
      const yawRad = this.yaw;

      // Calculate movement direction based on camera yaw
      const right = new THREE.Vector3(Math.cos(yawRad), 0, -Math.sin(yawRad));
      const forward = new THREE.Vector3(Math.sin(yawRad), 0, Math.cos(yawRad));

      dir.copy(right).multiplyScalar(moveX)
         .add(forward.multiplyScalar(moveZ))
         .normalize()
         .multiplyScalar(speed);
    }

    this.vel.x = dir.x;
    this.vel.z = dir.z;
  }

  /**
   * Update physics (gravity, jumping, climbing)
   */
  updatePhysics(dt, damagePlayerFn) {
    // Check for ladders
    const footX = Math.floor(this.pos.x);
    const footY = Math.floor(this.pos.y);
    const footZ = Math.floor(this.pos.z);
    const headY = Math.floor(this.pos.y + PLAYER_HEIGHT - 0.1);
    
    const onLadder = (this.world.getBlock(footX, footY, footZ) === 18) ||
                     (this.world.getBlock(footX, headY, footZ) === 18);

    if (onLadder) {
      this.vel.y = 0;
      const climbSpeed = 3;
      
      if (this.keys.jump) {
        this.pos.y += climbSpeed * dt;
      } else if (this.keys.sprint) {
        this.pos.y -= climbSpeed * dt;
      }
      
      this.onGround = false;
    } else {
      this.vel.y -= GRAVITY * dt;
    }

    // Jumping
    if (this.keys.jump && this.onGround) {
      this.vel.y = JUMP_SPEED;
      this.onGround = false;
    }

    this.updatePosition(dt, damagePlayerFn);
  }

  /**
   * Update position with collision detection
   */
  updatePosition(dt, damagePlayerFn) {
    const newX = this.pos.x + this.vel.x * dt;
    const newZ = this.pos.z + this.vel.z * dt;
    let newY = this.pos.y + this.vel.y * dt;

    // Horizontal collisions (X)
    if (!this.collides(newX, this.pos.y, this.pos.z)) {
      this.pos.x = newX;
    } else {
      this.vel.x = 0;
    }

    // Horizontal collisions (Z)
    if (!this.collides(this.pos.x, this.pos.y, newZ)) {
      this.pos.z = newZ;
    } else {
      this.vel.z = 0;
    }

    // Vertical movement
    if (this.vel.y > 0) {
      // Moving up - check ceiling
      if (!this.collides(this.pos.x, newY + PLAYER_HEIGHT - 0.001, this.pos.z)) {
        this.pos.y = newY;
      } else {
        this.vel.y = 0;
        this.pos.y = Math.floor(this.pos.y + PLAYER_HEIGHT) - PLAYER_HEIGHT;
      }
    } else {
      // Moving down - check ground
      if (!this.collides(this.pos.x, newY, this.pos.z)) {
        // Start tracking fall if beginning to fall
        if (!this.falling && !this.onGround && this.vel.y < 0) {
          this.falling = true;
          this.fallStartY = this.pos.y;
        }
        
        this.pos.y = newY;
        this.onGround = false;
      } else {
        // Hit ground
        this.pos.y = Math.floor(this.pos.y);
        this.onGround = true;
        this.vel.y = 0;

        // Apply fall damage
        if (this.falling) {
          const fallDistance = this.fallStartY - this.pos.y;
          if (fallDistance > 3) {
            const damageHearts = (fallDistance - 3) / 2;
            if (damagePlayerFn) {
              damagePlayerFn(damageHearts);
            }
          }
          this.falling = false;
        }
      }
    }
  }

  /**
   * Update camera position and rotation
   */
  updateCamera() {
    // Calculate bobbing offset
    let bobX = 0;
    let bobY = 0;

    // Only bob when moving and on ground
    const isMoving = this.vel.x !== 0 || this.vel.z !== 0;
    if (isMoving && this.onGround) {
      // Advance bobbing time
      this.bobbingTime += 0.015 * this.vel.length(); // Scale by speed

      // Calculate sine wave offsets
      // Y moves up and down (2x frequency of X)
      bobY = Math.sin(this.bobbingTime * 2) * this.bobbingAmount;
      // X moves left and right
      bobX = Math.cos(this.bobbingTime) * (this.bobbingAmount * 0.5);
    } else {
      // Decay bobbing when stopped
      this.bobbingTime = 0;
    }

    this.camera.position.set(
      this.pos.x + bobX,
      this.pos.y + EYE_HEIGHT + bobY,
      this.pos.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /**
   * Check for environmental hazards (cactus damage)
   */
  checkEnvironmentalHazards(dt, damagePlayerFn) {
    const footX = Math.floor(this.pos.x);
    const footY = Math.floor(this.pos.y);
    const footZ = Math.floor(this.pos.z);
    const headY = Math.floor(this.pos.y + PLAYER_HEIGHT - 0.1);

    const footBlock = this.world.getBlock(footX, footY, footZ);
    const headBlock = this.world.getBlock(footX, headY, footZ);

    // Cactus damage
    if ((footBlock === 20 || headBlock === 20) && damagePlayerFn) {
      damagePlayerFn(dt);
    }
  }

  /**
   * Update yaw (horizontal rotation)
   */
  updateYaw(deltaX, sensitivity) {
    this.yaw -= deltaX * sensitivity;
  }

  /**
   * Update pitch (vertical rotation)
   */
  updatePitch(deltaY, sensitivity) {
    this.pitch -= deltaY * sensitivity;
    
    // Clamp pitch to prevent flipping
    const maxPitch = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }
}
