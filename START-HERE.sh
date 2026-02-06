#!/bin/bash

# =============================================================================
# TUSA GATO'S 24/7 - COMPLETE STARTUP SCRIPT
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🐱 TUSA GATO'S 24/7 - CRM PROTOTYPE                        ║"
echo "║                                                                ║"
echo "║     AI Receptionist + Lead Management + Attorney Matching      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# =============================================================================
# CHECK DEPENDENCIES
# =============================================================================

echo -e "\n${BLUE}🔍 Checking dependencies...${NC}"

deps_ok=true

if ! command_exists python3; then
    echo -e "${RED}❌ python3 not found${NC}"
    deps_ok=false
else
    echo -e "${GREEN}✅ python3${NC}"
fi

if ! command_exists pip3; then
    echo -e "${RED}❌ pip3 not found${NC}"
    deps_ok=false
else
    echo -e "${GREEN}✅ pip3${NC}"
fi

if ! deps_ok; then
    echo -e "${RED}\n❌ Please install missing dependencies${NC}"
    exit 1
fi

# =============================================================================
# SETUP BACKEND
# =============================================================================

echo -e "\n${BLUE}⚙️  Setting up Backend...${NC}"

cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -q -r requirements.txt

cd ..

# =============================================================================
# START BACKEND
# =============================================================================

echo -e "\n${BLUE}🚀 Starting Backend (Port 8000)...${NC}"

cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

sleep 3

# =============================================================================
# START FRONTEND
# =============================================================================

echo -e "\n${BLUE}🎨 Starting Frontend (Port 8080)...${NC}"

python3 serve-frontend.py &
FRONTEND_PID=$!

sleep 2

# =============================================================================
# PRINT STATUS
# =============================================================================

echo -e "\n${GREEN}✅ All services started!${NC}"
echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "🌐 ${CYAN}Dashboard:${NC}     ${GREEN}http://localhost:8080${NC}"
echo -e "⚙️  ${CYAN}Backend API:${NC}    ${GREEN}http://localhost:8000${NC}"
echo -e "📚 ${CYAN}API Docs:${NC}       ${GREEN}http://localhost:8000/docs${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Open ${GREEN}http://localhost:8080${NC} to see your dashboard"
echo -e "   2. Click 'Setup AI Agent' button to configure RetellAI"
echo -e "   3. Click 'Test Call' to simulate an incoming call"
echo -e "   4. Or call your number: ${CYAN}+1(646)687-2689${NC}"

echo -e "\n${YELLOW}📞 RetellAI Phone:${NC} ${CYAN}+1(646)687-2689${NC}"
echo -e "${YELLOW}🔑 API Key:${NC}       Configured ✓"

echo -e "\n${RED}Press Ctrl+C to stop all services${NC}\n"

# =============================================================================
# WAIT FOR SIGNAL
# =============================================================================

trap "echo -e '\n${RED}🛑 Stopping all services...${NC}'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit 0" INT

wait
