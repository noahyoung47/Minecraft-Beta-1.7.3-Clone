/**
 * Debug Overlay System
 * Shows player coordinates, orientation, and game information
 */

export class DebugOverlay {
  constructor() {
    this.debugElement = document.getElementById('debug');
    this.visible = false;
  }

  /**
   * Toggle debug overlay visibility
   */
  toggle() {
    this.visible = !this.visible;
    if (this.debugElement) {
      this.debugElement.style.display = this.visible ? 'block' : 'none';
    }
  }

  /**
   * Update debug information
   */
  update(player, weatherStatus = '') {
    if (!this.debugElement || !this.visible) return;

    const degYaw = ((player.yaw * 180 / Math.PI) % 360).toFixed(1);
    const degPitch = ((player.pitch * 180 / Math.PI) % 360).toFixed(1);
    
    let weatherStr = '';
    if (weatherStatus && weatherStatus !== 'Clear') {
      weatherStr = `<br>Weather: ${weatherStatus}`;
    }

    this.debugElement.innerHTML = 
      `X: ${player.pos.x.toFixed(2)} Y: ${player.pos.y.toFixed(2)} Z: ${player.pos.z.toFixed(2)}<br>` +
      `Yaw: ${degYaw}° Pitch: ${degPitch}°` +
      weatherStr;
  }

  /**
   * Check if debug overlay is visible
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Show debug overlay
   */
  show() {
    this.visible = true;
    if (this.debugElement) {
      this.debugElement.style.display = 'block';
    }
  }

  /**
   * Hide debug overlay
   */
  hide() {
    this.visible = false;
    if (this.debugElement) {
      this.debugElement.style.display = 'none';
    }
  }
}
