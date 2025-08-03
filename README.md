# Minecraft Beta 1.7.3 Clone

A web-based Minecraft Beta 1.7.3 clone built with Three.js, featuring infinite world generation, dynamic chunk loading, and classic Minecraft mechanics.

![Minecraft Web Clone](https://img.shields.io/badge/Minecraft-Beta%201.7.3%20Clone-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-blue)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎮 Live Demo

**[Play Now!](https://noahyoung47.github.io/Minecraft-Beta-1.7.3-Clone/)** *(coming soon)*

## ✨ Features

### 🌍 World Generation
- **Infinite procedural world** using Perlin noise
- **Dynamic chunk loading** for optimal performance
- **Multiple biomes**: Forests, Plains, Deserts, and Cold regions
- **Natural features**: Trees, cacti, sugar cane, caves, and ore deposits

### 🎯 Gameplay Mechanics
- **First-person controls** with pointer lock
- **Block placement and destruction** with raycast selection
- **10 different block types** including redstone components
- **Physics system** with gravity, jumping, and collision detection
- **Health system** with fall damage and environmental hazards

### 🌅 Environmental Systems
- **Day/night cycle** with dynamic lighting
- **Weather system** with rain and snow based on biomes
- **Ambient lighting** that changes throughout the day

### 🤖 Mob System
- **Passive mobs** that wander the world
- **Hostile creatures** that spawn at night:
  - **Zombies** - Chase and attack the player
  - **Skeletons** - Shoot arrows from a distance
  - **Creepers** - Explode when close to the player

### ⚡ Redstone Mechanics
- **Torches** that emit light
- **Redstone torches** that power adjacent blocks
- **Pistons** that push blocks when powered
- **Sticky pistons** that can pull blocks back
- **TNT** that explodes when powered

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **Modern web browser** with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/noahyoung47/Minecraft-Beta-1.7.3-Clone.git
cd Minecraft-Beta-1.7.3-Clone

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:3000`

### Alternative Quick Start
```bash
# Use the included startup script
./start-dev.sh
```

## 🎮 Controls

| Control | Action |
|---------|--------|
| **WASD** | Move around |
| **Mouse** | Look around (click to lock pointer) |
| **Space** | Jump |
| **Shift** | Sprint/Sneak (climb down ladders) |
| **Left Click** | Mine/destroy blocks |
| **Right Click** | Place blocks |
| **1-9, 0** | Select hotbar items |
| **Mouse Wheel** | Cycle through hotbar |
| **` (Backtick)** | Toggle debug info |

## 🏗️ Project Structure

```
minecraft_v10/
├── src/
│   ├── core/          # Core game systems and configuration
│   ├── world/         # World generation and chunk management
│   ├── entities/      # Player and mob systems
│   ├── utils/         # Utility functions and algorithms
│   ├── ui/            # User interface components
│   ├── weather/       # Weather and particle systems
│   └── main.js        # Main application entry point
├── assets/
│   └── css/           # Game stylesheets
├── .vscode/           # VS Code configuration
├── index.html         # Main HTML file
└── package.json       # Dependencies and scripts
```

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server with live reload
- `npm run start` - Start production server
- `npm run build` - Build project for deployment

### VS Code Integration
This project includes full VS Code integration:
- **Debugging configuration** for Chrome
- **Automated tasks** for building and running
- **Live server** with auto-reload
- **Recommended extensions**

### Adding New Features

#### New Block Types
1. Add to `BLOCK_TYPES` in `src/core/config.js`
2. Update `HOTBAR_SLOTS` if the block should be placeable
3. Add generation logic in `src/world/chunk.js`

#### New Mob Types
1. Create spawn method in `src/entities/mobs.js`
2. Add behavior logic in the update methods
3. Define mob-specific properties

## 🎯 Technical Highlights

### Performance Optimizations
- **Chunk-based rendering** - Only visible chunks are loaded
- **Face culling** - Hidden block faces are not rendered
- **Efficient mesh generation** - BufferGeometry with vertex colors
- **Memory management** - Distant chunks are automatically unloaded

### Modern Architecture
- **ES6 Modules** - Clean dependency management
- **Class-based design** - Object-oriented structure
- **Modular components** - Easy to maintain and extend
- **Comprehensive documentation** - JSDoc comments throughout

### Browser Compatibility
- **Chrome/Chromium** (Recommended)
- **Firefox** (Full support)
- **Safari** (WebGL required)
- **Edge** (Modern versions)

## 🌟 Screenshots

*Screenshots coming soon!*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Minecraft** by Mojang Studios for the original game concept
- **Three.js** for the excellent 3D graphics library
- **Perlin noise algorithm** for procedural generation
- **Beta 1.7.3** for being the best version of Minecraft

## 📧 Contact

Noah Young - [@noahyoung47](https://github.com/noahyoung47)

Project Link: [https://github.com/noahyoung47/Minecraft-Beta-1.7.3-Clone](https://github.com/noahyoung47/Minecraft-Beta-1.7.3-Clone)

---

**⭐ If you like this project, please give it a star on GitHub! ⭐**
