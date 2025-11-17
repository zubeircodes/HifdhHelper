#!/bin/bash

# Quran Learning App - Development Server Launcher

echo "🕌 Quran Learning App - Starting Development Server..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✓ Python 3 found"
    echo ""
    echo "Server starting on http://localhost:8000"
    echo "Press Ctrl+C to stop the server"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    python3 -m http.server 8000
# Check if Python 2 is available
elif command -v python &> /dev/null; then
    echo "✓ Python found"
    echo ""
    echo "Server starting on http://localhost:8000"
    echo "Press Ctrl+C to stop the server"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    python -m SimpleHTTPServer 8000
# Check if Node.js is available
elif command -v npx &> /dev/null; then
    echo "✓ Node.js found"
    echo ""
    echo "Installing http-server (one-time)..."
    npx http-server -p 8000
else
    echo "❌ Error: No suitable HTTP server found"
    echo ""
    echo "Please install one of the following:"
    echo "  - Python 3: https://www.python.org/downloads/"
    echo "  - Node.js: https://nodejs.org/"
    echo ""
    echo "Or open index.html directly in your browser (some features may not work)"
    exit 1
fi
