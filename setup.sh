#!/usr/bin/env bash
# FactoryShield — One-click setup script
# Usage: bash setup.sh

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ███████╗ █████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗"
echo "  ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝"
echo "  █████╗  ███████║██║        ██║   ██║   ██║██████╔╝ ╚████╔╝ "
echo "  ██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗  ╚██╔╝  "
echo "  ██║     ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║   ██║   "
echo "  ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝  "
echo "   ███████╗██╗  ██╗██╗███████╗██╗     ██████╗               "
echo -e "${NC}"
echo -e "${GREEN}  AI-Powered Predictive Maintenance Platform${NC}"
echo ""

# ── Check Python ──────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/4] Checking Python...${NC}"
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}Python 3 not found. Install Python 3.10+${NC}"; exit 1
fi
PY_VER=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}  ✓ Python $PY_VER${NC}"

# ── Backend setup ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[2/4] Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

echo "  Installing Python packages..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}  ✓ Backend packages installed${NC}"

# ── Train models ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/4] Training ML models...${NC}"
python scripts/train_model.py
echo -e "${GREEN}  ✓ Models trained and saved${NC}"

# ── .env files ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}  ⚠ Created backend/.env — add API keys for LLM features${NC}"
fi
cd ..

# ── Frontend setup ────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[4/4] Setting up frontend...${NC}"
if ! command -v node &>/dev/null; then
    echo -e "${RED}Node.js not found. Install Node 18+${NC}"; exit 1
fi
NODE_VER=$(node --version)
echo -e "${GREEN}  ✓ Node $NODE_VER${NC}"

cd frontend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}  ⚠ Created frontend/.env — add Supabase keys (optional)${NC}"
fi
npm install --silent
echo -e "${GREEN}  ✓ Frontend packages installed${NC}"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅  Setup Complete!                   ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Start backend:  cd backend && uvicorn        ║${NC}"
echo -e "${GREEN}║    app.main:app --reload --port 8000          ║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║  Start frontend: cd frontend && npm run dev   ║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:5173             ║${NC}"
echo -e "${GREEN}║  API Docs:  http://localhost:8000/docs        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Optional: Add API keys to backend/.env for LLM chatbot${NC}"
echo -e "${YELLOW}Optional: Add Supabase keys to frontend/.env for auth${NC}"
echo ""
