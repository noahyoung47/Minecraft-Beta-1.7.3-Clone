/**
 * Health System
 * Manages player health display and tracking
 */

import { MAX_HEALTH } from '../core/config.js';

export class HealthSystem {
  constructor() {
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.healthElement = document.getElementById('health');
  }

  /**
   * Update health display
   */
  updateDisplay() {
    if (!this.healthElement) return;
    
    const fullHearts = Math.floor(this.health);
    const halfHeart = this.health - fullHearts >= 0.5;
    
    let hearts = '';
    for (let i = 0; i < fullHearts; i++) {
      hearts += '❤';
    }
    if (halfHeart) {
      hearts += '♥';
    }
    
    this.healthElement.textContent = hearts;
  }

  /**
   * Damage the player
   */
  damage(amount) {
    this.health -= amount;
    if (this.health < 0) {
      this.health = 0;
    }
    this.updateDisplay();
    
    return this.health <= 0; // Return true if player died
  }

  /**
   * Heal the player
   */
  heal(amount) {
    this.health += amount;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }
    this.updateDisplay();
  }

  /**
   * Reset health to full (for respawning)
   */
  reset() {
    this.health = this.maxHealth;
    this.updateDisplay();
  }

  /**
   * Get current health
   */
  getHealth() {
    return this.health;
  }

  /**
   * Check if player is alive
   */
  isAlive() {
    return this.health > 0;
  }
}
