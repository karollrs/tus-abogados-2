#!/bin/bash

# =============================================================================
# TUSA GATO'S 24/7 - START FRONTEND ONLY
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🐱 TUSA GATO'S 24/7 - Starting Frontend                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}🚀 Starting Next.js on port 3000...${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "🌐 Open: ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}\n"

npm run dev
