/**
 * Mob System
 * Handles passive and hostile mobs, arrows, and AI behaviors
 */

import * as THREE from 'three';
import { CHUNK_HEIGHT, GRAVITY } from '../core/config.js';
import { isSolid, isPassable } from '../utils/helpers.js';

export class MobManager {
  constructor(world) {
    this.world = world;
    this.mobs = [];
    this.hostileMobs = [];
    this.arrows = [];
  }

  /**
   * Spawn a passive mob at the given coordinates
   */
  spawnMob(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + 0.5, y, z + 0.5);
    this.world.scene.add(mesh);

    const mob = {
      mesh: mesh,
      dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
      moveTime: 2 + Math.random() * 4,
    };
    this.mobs.push(mob);
  }

  /**
   * Spawn a hostile zombie mob
   */
  spawnHostile(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + 0.5, y, z + 0.5);
    this.world.scene.add(mesh);

    const mob = {
      mesh: mesh,
      dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
      moveTime: 2 + Math.random() * 4,
      type: 'zombie',
    };
    this.hostileMobs.push(mob);
  }

  /**
   * Spawn a skeleton mob
   */
  spawnSkeleton(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + 0.5, y, z + 0.5);
    this.world.scene.add(mesh);

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
   * Spawn a creeper mob
   */
  spawnCreeper(x, y, z) {
    const geometry = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0x3a8b3a });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + 0.5, y, z + 0.5);
    this.world.scene.add(mesh);

    const mob = {
      mesh: mesh,
      dir: new THREE.Vector2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize(),
      moveTime: 2 + Math.random() * 4,
      type: 'creeper',
      fuse: 2.0,
      fusing: false,
    };
    this.hostileMobs.push(mob);
  }

  /**
   * Update all passive mobs
   */
  updateMobs(dt) {
    const speed = 1.5;
    
    for (const mob of this.mobs) {
      mob.moveTime -= dt;
      if (mob.moveTime <= 0) {
        mob.dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
        mob.moveTime = 2 + Math.random() * 4;
      }

      const newX = mob.mesh.position.x + mob.dir.x * speed * dt;
      const newZ = mob.mesh.position.z + mob.dir.y * speed * dt;
      
      const checkX = Math.floor(newX);
      const checkZ = Math.floor(newZ);
      
      const groundY = this.findGroundHeight(checkX, checkZ);
      if (groundY < 0) {
        mob.moveTime = 0;
        continue;
      }

      const underType = this.world.getBlock(checkX, groundY, checkZ);
      if (underType === 7) { // Avoid water
        mob.moveTime = 0;
        continue;
      }

      mob.mesh.position.x = newX;
      mob.mesh.position.z = newZ;
      mob.mesh.position.y = groundY + 1;
    }
  }

  /**
   * Update all hostile mobs
   */
  updateHostiles(dt, player, damagePlayerFn) {
    const chaseDistSq = 64; // 8 blocks squared
    const speed = 1.5;

    for (const mob of this.hostileMobs) {
      const dx = player.pos.x - mob.mesh.position.x;
      const dz = player.pos.z - mob.mesh.position.z;
      const distSq = dx * dx + dz * dz;

      let dir2;
      if (distSq < chaseDistSq) {
        const dist = Math.sqrt(distSq) || 1;
        dir2 = new THREE.Vector2(dx / dist, dz / dist);
      } else {
        mob.moveTime -= dt;
        if (mob.moveTime <= 0) {
          mob.dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
          mob.moveTime = 2 + Math.random() * 4;
        }
        dir2 = mob.dir;
      }

      // Handle mob-specific behaviors
      this.handleMobBehavior(mob, dt, player, distSq, damagePlayerFn);

      // Move mob
      this.moveMob(mob, dir2, speed, dt);

      // Deal melee damage if close
      if (distSq < 0.64 && damagePlayerFn) {
        damagePlayerFn(dt * 2);
      }
    }

    // Remove flagged mobs
    this.hostileMobs = this.hostileMobs.filter(m => !m.toRemove);
  }

  /**
   * Handle specific mob behaviors
   */
  handleMobBehavior(mob, dt, player, distSq, damagePlayerFn) {
    if (mob.type === 'skeleton') {
      this.handleSkeletonBehavior(mob, dt, player, distSq);
    } else if (mob.type === 'creeper') {
      this.handleCreeperBehavior(mob, dt, player, distSq, damagePlayerFn);
    }
  }

  /**
   * Handle skeleton shooting behavior
   */
  handleSkeletonBehavior(mob, dt, player, distSq) {
    mob.arrowCooldown -= dt;
    if (mob.arrowCooldown <= 0 && distSq < 225) { // 15 blocks squared
      const target = new THREE.Vector3(player.pos.x, player.pos.y + 0.9, player.pos.z);
      const origin = new THREE.Vector3(mob.mesh.position.x, mob.mesh.position.y + 0.9, mob.mesh.position.z);
      const dir3 = target.clone().sub(origin).normalize();

      this.shootArrow(origin, dir3);
      mob.arrowCooldown = 2 + Math.random() * 2;
    }
  }

  /**
   * Handle creeper explosion behavior
   */
  handleCreeperBehavior(mob, dt, player, distSq, damagePlayerFn) {
    if (!mob.fusing && distSq < 16) {
      mob.fusing = true;
    }

    if (mob.fusing) {
      mob.fuse -= dt;
      if (mob.fuse <= 0) {
        this.world.scene.remove(mob.mesh);
        
        const cx = Math.floor(mob.mesh.position.x);
        const cy = Math.floor(mob.mesh.position.y);
        const cz = Math.floor(mob.mesh.position.z);
        
        this.world.explode(cx, cy, cz);

        // Damage player if close
        const pdx = player.pos.x - cx;
        const pdy = player.pos.y - cy;
        const pdz = player.pos.z - cz;
        const pd2 = pdx * pdx + pdy * pdy + pdz * pdz;
        
        if (pd2 < 16 && damagePlayerFn) {
          damagePlayerFn(4);
        }

        mob.toRemove = true;
      }
    }
  }

  /**
   * Shoot an arrow from skeleton
   */
  shootArrow(origin, direction) {
    const arrowGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
    const arrowMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
    arrowMesh.position.copy(origin);
    this.world.scene.add(arrowMesh);

    const arrow = {
      mesh: arrowMesh,
      vel: direction.clone().multiplyScalar(12),
    };
    this.arrows.push(arrow);
  }

  /**
   * Update flying arrows
   */
  updateArrows(dt, player, damagePlayerFn) {
    const newArrows = [];
    
    for (const arrow of this.arrows) {
      arrow.vel.y -= GRAVITY * 0.5 * dt;
      
      arrow.mesh.position.x += arrow.vel.x * dt;
      arrow.mesh.position.y += arrow.vel.y * dt;
      arrow.mesh.position.z += arrow.vel.z * dt;

      const px = arrow.mesh.position.x;
      const py = arrow.mesh.position.y;
      const pz = arrow.mesh.position.z;

      if (py < 0) {
        this.world.scene.remove(arrow.mesh);
        continue;
      }

      // Check collision with blocks
      const bx = Math.floor(px);
      const by = Math.floor(py);
      const bz = Math.floor(pz);
      const bType = this.world.getBlock(bx, by, bz);
      
      if (!isPassable(bType)) {
        this.world.scene.remove(arrow.mesh);
        continue;
      }

      // Check collision with player
      const dx = px - player.pos.x;
      const dy = py - (player.pos.y + 0.9);
      const dz = pz - player.pos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq < 0.25) {
        if (damagePlayerFn) {
          damagePlayerFn(1);
        }
        this.world.scene.remove(arrow.mesh);
        continue;
      }

      newArrows.push(arrow);
    }
    
    this.arrows = newArrows;
  }

  /**
   * Move a mob with collision detection
   */
  moveMob(mob, direction, speed, dt) {
    const newX = mob.mesh.position.x + direction.x * speed * dt;
    const newZ = mob.mesh.position.z + direction.y * speed * dt;
    
    const checkX = Math.floor(newX);
    const checkZ = Math.floor(newZ);
    
    const groundY = this.findGroundHeight(checkX, checkZ);
    if (groundY < 0) {
      mob.moveTime = 0;
      return;
    }

    const underType = this.world.getBlock(checkX, groundY, checkZ);
    if (underType === 7) { // Avoid water
      mob.moveTime = 0;
      return;
    }

    mob.mesh.position.x = newX;
    mob.mesh.position.z = newZ;
    mob.mesh.position.y = groundY + 1;
  }

  /**
   * Find ground height at given coordinates
   */
  findGroundHeight(x, z) {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const blockType = this.world.getBlock(x, y, z);
      if (isSolid(blockType)) {
        return y;
      }
    }
    return -1;
  }

  /**
   * Spawn hostile mobs during night
   */
  spawnHostilesAroundPlayer(player, count = 3) {
    for (let i = this.hostileMobs.length; i < count; i++) {
      const angleSpawn = Math.random() * Math.PI * 2;
      const distSpawn = 8 + Math.random() * 12;
      const hx = player.pos.x + Math.cos(angleSpawn) * distSpawn;
      const hz = player.pos.z + Math.sin(angleSpawn) * distSpawn;

      const hy = this.findGroundHeight(Math.floor(hx), Math.floor(hz));
      if (hy < 0) continue;

      const r = Math.random();
      if (r < 0.33) {
        this.spawnHostile(Math.floor(hx), hy + 1, Math.floor(hz));
      } else if (r < 0.66) {
        this.spawnSkeleton(Math.floor(hx), hy + 1, Math.floor(hz));
      } else {
        this.spawnCreeper(Math.floor(hx), hy + 1, Math.floor(hz));
      }
    }
  }

  /**
   * Get current mob counts
   */
  getMobCounts() {
    return {
      passive: this.mobs.length,
      hostile: this.hostileMobs.length,
      arrows: this.arrows.length
    };
  }
}
