/**
 * Hotbar UI System
 * Manages the player's item selection interface
 */

import { HOTBAR_SLOTS, BLOCK_TYPES } from '../core/config.js';

export class HotbarUI {
  constructor() {
    this.selectedSlot = 0;
    this.slots = [...HOTBAR_SLOTS]; // Create a mutable copy
    this.hudElement = document.getElementById('hud');
    this.visible = true;
  }

  /**
   * Update hotbar display
   */
  update() {
    if (!this.hudElement || !this.visible) return;
    
    this.hudElement.innerHTML = '';
    
    for (let i = 0; i < this.slots.length; i++) {
      const slotType = this.slots[i];
      const slot = document.createElement('div');
      slot.className = 'slot' + (i === this.selectedSlot ? ' selected' : '');
      
      const name = BLOCK_TYPES[slotType].name;
      slot.textContent = i + 1;
      slot.style.backgroundColor = '#' + BLOCK_TYPES[slotType].color.toString(16).padStart(6, '0');
      slot.title = BLOCK_TYPES[slotType].name; // Add tooltip
      
      this.hudElement.appendChild(slot);
    }
  }

  /**
   * Set the block type for a specific slot
   */
  setSlot(index, blockType) {
    if (index >= 0 && index < this.slots.length) {
      this.slots[index] = blockType;
      this.update();
    }
  }

  /**
   * Select slot by index
   */
  selectSlot(index) {
    if (index >= 0 && index < this.slots.length) {
      this.selectedSlot = index;
      this.update();
    }
  }

  /**
   * Cycle to next slot
   */
  nextSlot() {
    this.selectedSlot = (this.selectedSlot + 1) % this.slots.length;
    this.update();
  }

  /**
   * Cycle to previous slot
   */
  prevSlot() {
    this.selectedSlot = (this.selectedSlot - 1 + this.slots.length) % this.slots.length;
    this.update();
  }

  /**
   * Get currently selected block type
   */
  getSelectedBlockType() {
    return this.slots[this.selectedSlot];
  }

  /**
   * Get selected slot index
   */
  getSelectedSlot() {
    return this.selectedSlot;
  }

  /**
   * Show the hotbar
   */
  show() {
    this.visible = true;
    if (this.hudElement) {
      this.hudElement.style.display = 'flex';
    }
    this.update();
  }

  /**
   * Hide the hotbar
   */
  hide() {
    this.visible = false;
    if (this.hudElement) {
      this.hudElement.style.display = 'none';
    }
  }

  /**
   * Toggle hotbar visibility
   */
  toggleVisibility() {
    this.visible ? this.hide() : this.show();
  }
}
