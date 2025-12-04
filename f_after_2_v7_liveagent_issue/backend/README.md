# Backend (FastAPI)

This backend provides simple in-memory chat storage for the Pulse demo UI.

Requirements
- Python 3.8+

Quickstart (Windows PowerShell)

```powershell
cd C:\Users\Easwar\Pulse\backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
# Run with autoreload during development:
uvicorn backend.main:app --reload
# Or run directly (no reload):
python backend/main.py
```

Notes
- Data is stored in-memory (backend/data.py) and will be reset when the server restarts.
- If you run the frontend dev server on a different port, the backend allows CORS from any origin for development.
