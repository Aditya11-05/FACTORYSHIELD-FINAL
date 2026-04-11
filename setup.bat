@echo off
REM FactoryShield — Windows Setup Script
title FactoryShield Setup

echo.
echo  ========================================
echo    FactoryShield - AI Predictive Platform
echo  ========================================
echo.

REM ── Backend ──────────────────────────────────────────────────────────────────
echo [1/4] Setting up backend...
cd backend

python -m venv venv
call venv\Scripts\activate.bat

pip install --upgrade pip
pip install -r requirements.txt

echo [2/4] Training ML models...
python scripts\train_model.py

if not exist .env copy .env.example .env
cd ..

REM ── Frontend ─────────────────────────────────────────────────────────────────
echo [3/4] Setting up frontend...
cd frontend
if not exist .env copy .env.example .env
npm install
cd ..

echo.
echo  ========================================
echo    Setup Complete!
echo  ----------------------------------------
echo    Backend:  cd backend ^&^& uvicorn app.main:app --reload
echo    Frontend: cd frontend ^&^& npm run dev
echo    App:      http://localhost:5173
echo    API Docs: http://localhost:8000/docs
echo  ========================================
echo.
pause
