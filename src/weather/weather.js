/**
 * Weather System
 * Handles rain and snow particles with biome-specific behavior
 */

import * as THREE from 'three';
import { RAIN_DROP_COUNT, RAIN_SPEED, SNOW_FLAKE_COUNT, SNOW_SPEED } from '../core/config.js';

export class WeatherSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    
    // Rain system
    this.isRaining = false;
    this.rainGroup = null;
    this.rainGeometry = null;
    this.rainPositions = null;
    
    // Snow system
    this.isSnowing = false;
    this.snowGroup = null;
    this.snowGeometry = null;
    this.snowPositions = null;
    
    // Weather timing
    this.weatherTimer = 0;
    this.nextWeatherToggle = 120; // seconds until first weather change
  }

  /**
   * Create rain particle system
   */
  createRain() {
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(RAIN_DROP_COUNT * 3);
    const radius = 20;
    
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.random() * 20 + 10;
      
      this.rainPositions[i * 3 + 0] = x;
      this.rainPositions[i * 3 + 1] = y;
      this.rainPositions[i * 3 + 2] = z;
    }
    
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const material = new THREE.PointsMaterial({ 
      color: 0x66aaff, 
      size: 0.1, 
      transparent: true, 
      opacity: 0.7 
    });
    
    this.rainGroup = new THREE.Points(this.rainGeometry, material);
    this.scene.add(this.rainGroup);
  }

  /**
   * Remove rain particle system
   */
  removeRain() {
    if (this.rainGroup) {
      this.scene.remove(this.rainGroup);
      this.rainGeometry.dispose();
      this.rainGroup = null;
      this.rainGeometry = null;
      this.rainPositions = null;
    }
  }

  /**
   * Update rain particles
   */
  updateRain(dt, playerPos) {
    if (!this.rainGroup || !this.rainPositions) return;
    
    const radius = 20;
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      let y = this.rainPositions[i * 3 + 1];
      y -= RAIN_SPEED * dt;
      
      if (y < 0) {
        y = Math.random() * 20 + 10;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        this.rainPositions[i * 3 + 0] = r * Math.cos(theta);
        this.rainPositions[i * 3 + 2] = r * Math.sin(theta);
      }
      
      this.rainPositions[i * 3 + 1] = y;
    }
    
    this.rainGeometry.attributes.position.needsUpdate = true;
    this.rainGroup.position.set(playerPos.x, 0, playerPos.z);
  }

  /**
   * Create snow particle system
   */
  createSnow() {
    this.snowGeometry = new THREE.BufferGeometry();
    this.snowPositions = new Float32Array(SNOW_FLAKE_COUNT * 3);
    const radius = 20;
    
    for (let i = 0; i < SNOW_FLAKE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.random() * 20 + 10;
      
      this.snowPositions[i * 3 + 0] = x;
      this.snowPositions[i * 3 + 1] = y;
      this.snowPositions[i * 3 + 2] = z;
    }
    
    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    const material = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 0.15, 
      transparent: true, 
      opacity: 0.8 
    });
    
    this.snowGroup = new THREE.Points(this.snowGeometry, material);
    this.scene.add(this.snowGroup);
  }

  /**
   * Remove snow particle system
   */
  removeSnow() {
    if (this.snowGroup) {
      this.scene.remove(this.snowGroup);
      this.snowGeometry.dispose();
      this.snowGroup = null;
      this.snowGeometry = null;
      this.snowPositions = null;
    }
  }

  /**
   * Update snow particles
   */
  updateSnow(dt, playerPos) {
    if (!this.snowGroup || !this.snowPositions) return;
    
    const radius = 20;
    for (let i = 0; i < SNOW_FLAKE_COUNT; i++) {
      let y = this.snowPositions[i * 3 + 1];
      y -= SNOW_SPEED * dt;
      
      if (y < 0) {
        y = Math.random() * 20 + 10;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        this.snowPositions[i * 3 + 0] = r * Math.cos(theta);
        this.snowPositions[i * 3 + 2] = r * Math.sin(theta);
      }
      
      this.snowPositions[i * 3 + 1] = y;
    }
    
    this.snowGeometry.attributes.position.needsUpdate = true;
    this.snowGroup.position.set(playerPos.x, 0, playerPos.z);
  }

  /**
   * Update weather system
   */
  update(dt, playerPos) {
    // Update active weather
    if (this.isRaining) {
      this.updateRain(dt, playerPos);
    }
    if (this.isSnowing) {
      this.updateSnow(dt, playerPos);
    }

    // Handle weather changes
    this.weatherTimer += dt;
    if (this.weatherTimer >= this.nextWeatherToggle) {
      this.toggleWeather(playerPos);
    }
  }

  /**
   * Toggle weather based on biome
   */
  toggleWeather(playerPos) {
    this.weatherTimer = 0;
    this.nextWeatherToggle = 120 + Math.random() * 180;

    // End current weather
    if (this.isRaining) {
      this.removeRain();
      this.isRaining = false;
    }
    if (this.isSnowing) {
      this.removeSnow();
      this.isSnowing = false;
    }

    // Determine biome at player position
    const bVal = this.world.biomeNoise.noise(playerPos.x * 0.01, playerPos.z * 0.01);

    // Only consider precipitation outside of deserts
    if (bVal <= 0.6) {
      if (bVal < -0.6) {
        // Cold regions - favor snow
        if (Math.random() < 0.7) {
          this.isSnowing = true;
          this.createSnow();
        } else {
          this.isRaining = true;
          this.createRain();
        }
      } else {
        // Moderate climates - mostly rain, occasional snow
        const r = Math.random();
        if (r < 0.5) {
          this.isRaining = true;
          this.createRain();
        } else if (r < 0.7) {
          this.isSnowing = true;
          this.createSnow();
        }
      }
    }
  }

  /**
   * Check if any weather is active
   */
  isWeatherActive() {
    return this.isRaining || this.isSnowing;
  }

  /**
   * Get weather status for UI
   */
  getWeatherStatus() {
    if (this.isRaining) return 'Rain';
    if (this.isSnowing) return 'Snow';
    return 'Clear';
  }

  /**
   * Force clear weather
   */
  clearWeather() {
    if (this.isRaining) {
      this.removeRain();
      this.isRaining = false;
    }
    if (this.isSnowing) {
      this.removeSnow();
      this.isSnowing = false;
    }
  }
}
