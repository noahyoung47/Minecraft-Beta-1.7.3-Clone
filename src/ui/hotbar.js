/**
 * Hotbar UI System
 * Manages the player's item selection interface
 */

import { HOTBAR_SLOTS, BLOCK_TYPES } from '../core/config.js';

export class HotbarUI {
  constructor() {
    this.selectedSlot = 0;
    this.hudElement = document.getElementById('hud');
  }

  /**
   * Update hotbar display
   */
  update() {
    if (!this.hudElement) return;
    
    this.hudElement.innerHTML = '';
    
    for (let i = 0; i < HOTBAR_SLOTS.length; i++) {
      const slotType = HOTBAR_SLOTS[i];
      const slot = document.createElement('div');
      slot.className = 'slot' + (i === this.selectedSlot ? ' selected' : '');
      
      const name = BLOCK_TYPES[slotType].name;
      slot.textContent = i + 1;
      slot.style.backgroundColor = '#' + BLOCK_TYPES[slotType].color.toString(16).padStart(6, '0');
      
      this.hudElement.appendChild(slot);
    }
  }

  /**
   * Select slot by index
   */
  selectSlot(index) {
    if (index >= 0 && index < HOTBAR_SLOTS.length) {
      this.selectedSlot = index;
      this.update();
    }
  }

  /**
   * Cycle to next slot
   */
  nextSlot() {
    this.selectedSlot = (this.selectedSlot + 1) % HOTBAR_SLOTS.length;
    this.update();
  }

  /**
   * Cycle to previous slot
   */
  prevSlot() {
    this.selectedSlot = (this.selectedSlot - 1 + HOTBAR_SLOTS.length) % HOTBAR_SLOTS.length;
    this.update();
  }

  /**
   * Get currently selected block type
   */
  getSelectedBlockType() {
    return HOTBAR_SLOTS[this.selectedSlot];
  }

  /**
   * Get selected slot index
   */
  getSelectedSlot() {
    return this.selectedSlot;
  }
}
