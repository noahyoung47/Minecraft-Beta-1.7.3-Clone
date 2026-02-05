/**
 * Block Picker UI
 * Allows selecting blocks from the complete list (Creative-style)
 */

import { BLOCK_TYPES } from '../core/config.js';

export class BlockPickerUI {
  constructor(hotbar) {
    this.hotbar = hotbar;
    this.visible = false;
    this.element = null;
    this.setupUI();
  }

  setupUI() {
    this.element = document.createElement('div');
    this.element.id = 'block-picker';
    this.element.style.display = 'none';
    this.element.style.position = 'absolute';
    this.element.style.top = '50%';
    this.element.style.left = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
    this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.element.style.padding = '20px';
    this.element.style.borderRadius = '10px';
    this.element.style.zIndex = '100';
    this.element.style.width = '600px';
    this.element.style.maxHeight = '80vh';
    this.element.style.overflowY = 'auto';
    this.element.style.display = 'none';
    this.element.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
    this.element.style.gap = '10px';

    // Add CSS Grid styling dynamically or inline
    this.element.style.display = 'none'; // Initially hidden

    document.body.appendChild(this.element);

    this.renderBlocks();
  }

  renderBlocks() {
    // Clear existing
    this.element.innerHTML = '';

    // Header
    const title = document.createElement('h2');
    title.textContent = 'Select Block';
    title.style.color = 'white';
    title.style.gridColumn = '1 / -1';
    title.style.marginTop = '0';
    title.style.textAlign = 'center';
    title.style.width = '100%';
    this.element.appendChild(title);

    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Click a block to replace the currently selected hotbar slot.';
    instructions.style.color = '#ccc';
    instructions.style.gridColumn = '1 / -1';
    instructions.style.fontSize = '14px';
    instructions.style.marginBottom = '15px';
    this.element.appendChild(instructions);

    // Container for grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
    grid.style.gap = '10px';
    grid.style.width = '100%';
    grid.style.gridColumn = '1 / -1';
    this.element.appendChild(grid);

    // Create a slot for each block type
    Object.entries(BLOCK_TYPES).forEach(([id, block]) => {
      const blockId = parseInt(id);
      if (blockId === 0) return; // Skip air

      const slot = document.createElement('div');
      slot.className = 'picker-slot';
      slot.style.width = '60px';
      slot.style.height = '60px';
      slot.style.border = '2px solid #555';
      slot.style.backgroundColor = '#' + block.color.toString(16).padStart(6, '0');
      slot.style.cursor = 'pointer';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.color = 'white';
      slot.style.fontSize = '10px';
      slot.style.textAlign = 'center';
      slot.style.textShadow = '1px 1px 2px black';
      slot.style.boxSizing = 'border-box';
      slot.title = block.name;

      // Basic text label if no texture
      slot.textContent = block.name;

      slot.addEventListener('click', () => {
        this.selectBlock(blockId);
      });

      slot.addEventListener('mouseenter', () => {
        slot.style.borderColor = 'white';
        slot.style.transform = 'scale(1.05)';
      });

      slot.addEventListener('mouseleave', () => {
        slot.style.borderColor = '#555';
        slot.style.transform = 'scale(1)';
      });

      grid.appendChild(slot);
    });
  }

  selectBlock(blockId) {
    this.hotbar.setSlot(this.hotbar.selectedSlot, blockId);
    this.hide();

    // Re-lock pointer
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
  }

  show() {
    this.visible = true;
    this.element.style.display = 'grid'; // Use grid layout
    document.exitPointerLock();
  }

  hide() {
    this.visible = false;
    this.element.style.display = 'none';
  }

  toggle() {
    if (this.visible) {
      this.hide();
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.requestPointerLock();
    } else {
      this.show();
    }
  }

  isVisible() {
    return this.visible;
  }
}
