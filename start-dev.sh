#!/bin/bash

# Minecraft Web Prototype - Development Server Startup Script
# This script starts a local development server for easy testing

echo "🎮 Starting Minecraft Web Prototype Development Server..."
echo "📍 Server will be available at: http://localhost:3000"
echo "🚀 Press Ctrl+C to stop the server"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the development server
echo "🌐 Starting live server..."
npm run dev
