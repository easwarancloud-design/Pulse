@echo off
echo 🚀 Starting WorkPal FastAPI Backend Server...
echo.
echo 📦 Installing dependencies...
pip install -r requirements.txt
echo.
echo 🔥 Starting server on http://localhost:8000...
echo 📋 API Docs available at: http://localhost:8000/docs
echo ⚡ Form Handler: http://localhost:8000/pulsehandler
echo.
python main.py