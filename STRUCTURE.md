# Project Structure Guide

## Overview
This Minecraft Web Prototype has been completely refactored into a clean, modular architecture that's easy to understand, maintain, and extend.

## Directory Structure

```
minecraft_v10/
├── .vscode/                 # VS Code configuration
│   ├── launch.json         # Debug configurations
│   ├── settings.json       # Project settings
│   ├── tasks.json          # Build tasks
│   └── extensions.json     # Recommended extensions
├── src/                     # Source code
│   ├── core/               # Core game systems
│   │   ├── config.js       # Game configuration constants
│   │   └── input.js        # Input handling system
│   ├── world/              # World generation and management
│   │   ├── chunk.js        # Chunk class for terrain
│   │   └── world.js        # World management class
│   ├── entities/           # Game entities
│   │   ├── player.js       # Player physics and controls
│   │   └── mobs.js         # Mob AI and management
│   ├── utils/              # Utility functions
│   │   ├── helpers.js      # Common helper functions
│   │   ├── perlin.js       # Perlin noise implementation
│   │   └── raycast.js      # Voxel raycasting
│   ├── ui/                 # User interface components
│   │   ├── hotbar.js       # Inventory hotbar
│   │   ├── health.js       # Health system
│   │   └── debug.js        # Debug overlay
│   ├── weather/            # Weather systems
│   │   └── weather.js      # Rain and snow
│   └── main.js             # Main application entry point
├── assets/                  # Static assets
│   └── css/
│       └── styles.css      # Game styles
├── index.html              # Main HTML file
├── package.json            # Node.js dependencies
├── README.md               # Project documentation
├── start-dev.sh            # Development server script
└── .gitignore              # Git ignore rules
```

## Key Improvements

### 1. Modular Architecture
- **Separation of Concerns**: Each system is in its own file
- **Clear Dependencies**: Easy to understand what depends on what
- **Reusable Components**: Systems can be easily extended or replaced

### 2. Modern JavaScript
- **ES6 Modules**: Using import/export for clean dependency management
- **Class-based Design**: Clear object-oriented structure
- **Type Safety**: JSDoc comments for better IDE support

### 3. Development Experience
- **VS Code Integration**: Full IDE support with debugging
- **Live Server**: Auto-reload during development
- **Task Automation**: Build and run tasks in VS Code
- **Clean Scripts**: Simple npm commands for common tasks

### 4. Maintainability
- **Consistent Code Style**: Uniform formatting and naming
- **Comprehensive Comments**: Well-documented code
- **Logical Organization**: Files grouped by functionality
- **Version Control Ready**: Proper .gitignore and structure

## Running the Project

### Quick Start
```bash
# Navigate to project directory
cd minecraft_v10

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

### Alternative Methods
```bash
# Using the startup script
./start-dev.sh

# Or in VS Code
# Press Ctrl+Shift+P and run "Tasks: Run Task" > "Start Development Server"
```

### Available Scripts
- `npm run dev` - Start development server with live reload
- `npm run start` - Start production server
- `npm run build` - Build project for deployment
- `npm run clean` - Clean build directory

## VS Code Features

### Debug Configuration
- **Launch Chrome**: Debug in Chrome browser
- **Breakpoints**: Set breakpoints in source code
- **Variable Inspection**: Examine game state during runtime

### Tasks
- **Auto-start**: Development server starts when folder opens
- **Build Tasks**: One-click building and testing
- **Browser Launch**: Automatic browser opening

### Extensions
The project recommends these VS Code extensions:
- Live Server for development server
- Prettier for code formatting
- JavaScript debugging support

## Code Organization Principles

### 1. Single Responsibility
Each file has one clear purpose:
- `player.js` - Only player-related functionality
- `world.js` - Only world management
- `mobs.js` - Only mob behavior

### 2. Clear Dependencies
- Core systems don't depend on UI
- Utils are dependency-free
- Main.js coordinates everything

### 3. Easy Testing
- Each module can be tested independently
- Clear interfaces between systems
- Mock-friendly design

### 4. Performance Focused
- Efficient chunk loading
- Optimized rendering
- Smart update cycles

## Adding New Features

### Adding a New Block Type
1. Add to `BLOCK_TYPES` in `config.js`
2. Update `HOTBAR_SLOTS` if placeable
3. Add generation logic in `chunk.js`

### Adding a New Mob
1. Create spawn method in `mobs.js`
2. Add behavior in update methods
3. Add mob-specific properties

### Adding UI Elements
1. Create component in `ui/` directory
2. Initialize in `main.js`
3. Update styles in `styles.css`

## Performance Optimization

### Chunk System
- **Dynamic Loading**: Only loads visible chunks
- **Mesh Optimization**: Efficient geometry generation
- **Memory Management**: Unloads distant chunks

### Rendering
- **Face Culling**: Only renders visible faces
- **Batch Processing**: Groups similar operations
- **LOD Ready**: Structure supports level-of-detail

### Input Handling
- **Event Delegation**: Efficient event management
- **Pointer Lock**: Smooth mouse controls
- **Debounced Updates**: Prevents excessive processing

## Browser Compatibility

### Supported Browsers
- **Chrome/Chromium** (Recommended)
- **Firefox** (Full support)
- **Safari** (WebGL required)
- **Edge** (Modern versions)

### Requirements
- **WebGL Support**: For 3D rendering
- **ES6 Modules**: For modern JavaScript
- **Pointer Lock**: For first-person controls

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3000 is available
   - Ensure Node.js is installed
   - Run `npm install` first

2. **Game won't load**
   - Check browser console for errors
   - Verify Three.js is loading
   - Ensure WebGL is supported

3. **Performance issues**
   - Reduce view distance in config.js
   - Check hardware acceleration
   - Close other browser tabs

### Development Tips

1. **Use VS Code**: Full integration and debugging
2. **Check Console**: Browser dev tools show errors
3. **Test Incrementally**: Test changes frequently
4. **Profile Performance**: Use browser dev tools

This refactored structure makes the Minecraft prototype much more maintainable and easier to work with while preserving all the original functionality!
