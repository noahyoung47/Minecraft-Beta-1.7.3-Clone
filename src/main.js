/**
 * Minecraft Beta 1.7.3 Clone - Main Application
 * 
 * A Minecraft Beta 1.7.3 clone built with Three.js.
 * Features terrain generation, dynamic chunk loading, block placement/destruction,
 * first-person controls, day/night cycle, weather, mobs, and redstone mechanics.
 */

import * as THREE from 'three';

// Core systems
import { DAY_LENGTH, DAY_COLOR, NIGHT_COLOR } from './core/config.js';
import { InputManager } from './core/input.js';

// World systems
import { World } from './world/world.js';

// Entity systems
import { Player } from './entities/player.js';
import { MobManager } from './entities/mobs.js';
import { Hand } from './entities/hand.js';

// Weather systems
import { WeatherSystem } from './weather/weather.js';

// UI systems
import { HotbarUI } from './ui/hotbar.js';
import { HealthSystem } from './ui/health.js';
import { DebugOverlay } from './ui/debug.js';
import { BlockHighlight } from './ui/block_highlight.js';
import { BlockPickerUI } from './ui/block_picker.js';

// Utilities
import { clamp } from './utils/helpers.js';

class MinecraftGame {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.player = null;
    this.hand = null;
    this.mobManager = null;
    this.weatherSystem = null;
    this.inputManager = null;
    
    // UI systems
    this.hotbar = null;
    this.healthSystem = null;
    this.debugOverlay = null;
    this.blockHighlight = null;
    this.blockPicker = null;
    
    // Game state
    this.clock = new THREE.Clock();
    this.worldTime = 0;
    
    // Lighting
    this.ambientLight = null;
    this.sunLight = null;
    
    this.init();
  }

  /**
   * Initialize the game
   */
  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    this.setupWorld();
    this.setupPlayer();
    this.setupMobs();
    this.setupWeather();
    this.setupUI();
    this.setupInput();
    this.setupResize();
    
    this.spawnInitialMobs();
    this.startGameLoop();
  }

  /**
   * Setup Three.js renderer
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(DAY_COLOR);
    document.body.appendChild(this.renderer.domElement);
  }

  /**
   * Setup Three.js scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    // Linear fog for a cleaner "render distance cliff" look
    // 2 chunks view distance = 32 blocks. Start fog at 16, end at 32.
    this.scene.fog = new THREE.Fog(DAY_COLOR, 20, 48);
  }

  /**
   * Setup camera
   */
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
  }

  /**
   * Setup lighting system
   */
  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Directional sunlight
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(1, 1.5, 1).normalize();
    this.scene.add(this.sunLight);
  }

  /**
   * Setup world system
   */
  setupWorld() {
    this.world = new World(this.scene);
  }

  /**
   * Setup player
   */
  setupPlayer() {
    this.player = new Player(this.camera, this.world);
    this.hand = new Hand(this.camera);
  }

  /**
   * Setup mob system
   */
  setupMobs() {
    this.mobManager = new MobManager(this.world);
    
    // Link mob system to world for easier access
    this.world.mobs = this.mobManager.mobs;
    this.world.hostileMobs = this.mobManager.hostileMobs;
    this.world.arrows = this.mobManager.arrows;
  }

  /**
   * Setup weather system
   */
  setupWeather() {
    this.weatherSystem = new WeatherSystem(this.scene, this.world);
  }

  /**
   * Setup UI systems
   */
  setupUI() {
    this.hotbar = new HotbarUI();
    this.hotbar.update();

    this.blockPicker = new BlockPickerUI(this.hotbar);
    
    this.healthSystem = new HealthSystem();
    this.healthSystem.updateDisplay();
    
    this.debugOverlay = new DebugOverlay();

    this.blockHighlight = new BlockHighlight(this.scene, this.camera, this.world);
  }

  /**
   * Setup input handling
   */
  setupInput() {
    this.inputManager = new InputManager(
      this.player,
      this.world,
      this.hotbar,
      this.debugOverlay,
      this.healthSystem,
      this.blockPicker,
      this.hand
    );
    this.inputManager.setCanvas(this.renderer.domElement);
  }

  /**
   * Setup window resize handling
   */
  setupResize() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  /**
   * Spawn initial passive mobs
   */
  spawnInitialMobs() {
    for (let i = 0; i < 4; i++) {
      const mx = (Math.random() - 0.5) * 16;
      const mz = (Math.random() - 0.5) * 16;
      const my = this.mobManager.findGroundHeight(Math.floor(mx), Math.floor(mz));
      
      if (my >= 0) {
        this.mobManager.spawnMob(Math.floor(mx), my + 1, Math.floor(mz));
      }
    }
  }

  /**
   * Start the main game loop
   */
  startGameLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.update();
      this.render();
    };
    animate();
  }

  /**
   * Update game systems
   */
  update() {
    const dt = this.clock.getDelta();
    
    if (this.inputManager.isPointerLocked()) {
      // Update player
      const damagePlayerFn = this.inputManager.createDamagePlayerFunction();
      this.player.update(dt, damagePlayerFn);
      this.hand.update(dt);
      
      // Update world systems
      this.world.updateChunks(this.player.pos.x, this.player.pos.z);
      this.world.updateFallingBlocks(this.player.pos.x, this.player.pos.z);
      this.world.updatePoweredBlocks(this.player.pos.x, this.player.pos.z);
      this.world.updateStickyRetraction(this.player.pos.x, this.player.pos.z);
      
      // Update mobs
      this.mobManager.updateMobs(dt);
      this.mobManager.updateHostiles(dt, this.player, damagePlayerFn);
      this.mobManager.updateArrows(dt, this.player, damagePlayerFn);
    }

    // Update day/night cycle
    this.updateDayNightCycle(dt);
    
    // Update weather
    this.weatherSystem.update(dt, this.player.pos);
    
    // Update UI
    this.updateUI();
    
    // Spawn hostile mobs at night
    this.spawnNightMobs();
  }

  /**
   * Update day/night cycle
   */
  updateDayNightCycle(dt) {
    this.worldTime += dt;
    const t = (this.worldTime % DAY_LENGTH) / DAY_LENGTH; // 0..1
    
    // Sun position and intensity
    const angle = t * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunIntensityBase = clamp(sunY * 0.5 + 0.5, 0, 1);
    
    // Weather dimming
    const weatherDim = this.weatherSystem.isWeatherActive() ? 0.6 : 1;
    const sunIntensity = sunIntensityBase * weatherDim;
    
    // Update lighting
    this.sunLight.intensity = 0.8 * sunIntensity;
    this.ambientLight.intensity = (0.2 + 0.3 * sunIntensityBase) * weatherDim;
    this.sunLight.position.set(Math.cos(angle), sunY, Math.sin(angle)).normalize();
    
    // Update sky color
    const skyColor = new THREE.Color();
    skyColor.lerpColors(new THREE.Color(NIGHT_COLOR), new THREE.Color(DAY_COLOR), sunIntensityBase);
    
    if (this.weatherSystem.isWeatherActive()) {
      skyColor.multiplyScalar(0.8);
    }
    
    this.renderer.setClearColor(skyColor);
    this.scene.fog.color.copy(skyColor);

    // In Beta 1.7.3, void was often black or dark blue, but clear color handles the sky.
    // We could add a gradient dome here, but simple color + linear fog is a big step up.
  }

  /**
   * Spawn hostile mobs during night
   */
  spawnNightMobs() {
    if (!this.inputManager.isPointerLocked()) return;
    
    const t = (this.worldTime % DAY_LENGTH) / DAY_LENGTH;
    const angle = t * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunIntensity = clamp(sunY * 0.5 + 0.5, 0, 1);
    
    // Spawn mobs when it's dark
    if (sunIntensity < 0.2) {
      const currentHostiles = this.mobManager.getMobCounts().hostile;
      if (currentHostiles < 3) {
        this.mobManager.spawnHostilesAroundPlayer(this.player, 3);
      }
    }
  }

  /**
   * Update UI systems
   */
  updateUI() {
    if (this.debugOverlay.isVisible()) {
      const weatherStatus = this.weatherSystem.getWeatherStatus();
      this.debugOverlay.update(this.player, weatherStatus);
    }

    // Update block highlight
    this.blockHighlight.update();
  }

  /**
   * Render the scene
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
  new MinecraftGame();
});
