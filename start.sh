#!/bin/bash

# =============================================================================
# TUSA GATO'S 24/7 - STARTUP SCRIPT
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
echo "║   🐱 TUSA GATO'S 24/7 - CRM Prototype                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from .env...${NC}"
    cp .env .env.local
    echo -e "${RED}❗ Please edit .env.local with your actual API keys before continuing${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# START CONVEX (if not running)
# =============================================================================

echo -e "\n${BLUE}📦 Checking Convex...${NC}"

if ! command -v convex &> /dev/null; then
    echo -e "${YELLOW}Installing Convex CLI...${NC}"
    npm install -g convex
fi

# Start convex in background
echo -e "${GREEN}Starting Convex dev server...${NC}"
npx convex dev &
CONVEX_PID=$!

# Wait for convex to start
sleep 3

# =============================================================================
# START BACKEND
# =============================================================================

echo -e "\n${BLUE}🚀 Starting Backend...${NC}"

cd backend

# Check virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -q -r requirements.txt

# Start backend in background
echo -e "${GREEN}Starting FastAPI server on port 8000...${NC}"
python main.py &
BACKEND_PID=$!

cd ..

# Wait for backend to start
sleep 2

# =============================================================================
# START FRONTEND
# =============================================================================

echo -e "\n${BLUE}🎨 Starting Frontend...${NC}"

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Node dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}Starting Next.js dev server on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!

cd ..

# =============================================================================
# PRINT STATUS
# =============================================================================

echo -e "\n${GREEN}✅ All services started!${NC}"
echo -e "\n${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "📱 Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "⚙️  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "📊 API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Trap Ctrl+C and kill all background processes
trap "echo -e '\n${RED}🛑 Stopping all services...${NC}'; kill $FRONTEND_PID $BACKEND_PID $CONVEX_PID 2>/dev/null; exit 0" INT

# Wait for all background processes
wait
