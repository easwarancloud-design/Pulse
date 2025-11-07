# Backend Setup Instructions

## Issue Encountered
Your system has limited disk space which prevented complete installation of all Python dependencies.

## What Was Fixed
1. ✅ Fixed incorrect import: Removed `import jsonify` (line 6) - this was from Flask, not needed in FastAPI
2. ✅ Added missing imports: `asyncio` and `concurrent.futures` for async operations
3. ✅ Created `requirements.txt` with all dependencies
4. ✅ Installed core packages: FastAPI, uvicorn, redis, pymysql, pytz, python-jose

## What Still Needs Installation
The following packages failed to install due to disk space:

```
langgraph
langchain
langchain-core
langchain-community
langchain-openai
numpy
```

## Solutions

### Option 1: Free Up Disk Space (Recommended)
1. Clean up your C:\ drive to free at least 2-3 GB
2. Run this command from the `backend` folder:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python39\python.exe" -m pip install langgraph langchain langchain-core langchain-community langchain-openai numpy --no-cache-dir
```

### Option 2: Use Python 3.11 (if available)
The app uses Python 3.9, but you might have Python 3.11 installed which was detected in the pycache files. Try:
```powershell
# Check if Python 3.11 is available
where python311

# If found, use it to install packages
python311 -m pip install -r requirements.txt --no-cache-dir
```

### Option 3: Install on Different Drive
If you have another drive with more space, you can:
1. Move Python installation to that drive
2. Or use a virtual environment on that drive:
```powershell
# Create venv on D: drive (or another drive with space)
& "$env:LOCALAPPDATA\Programs\Python\Python39\python.exe" -m venv D:\venvs\workpal_backend
D:\venvs\workpal_backend\Scripts\Activate.ps1
pip install -r requirements.txt --no-cache-dir
```

## Python Path Issue
Python is not in your PATH. To run the app, always use the full path:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python39\python.exe" app.py
```

Or add Python to PATH:
1. Add this to your PATH environment variable:
   `C:\Users\Easwar\AppData\Local\Programs\Python\Python39`
   `C:\Users\Easwar\AppData\Local\Programs\Python\Python39\Scripts`

## Running the App
Once all packages are installed:
```powershell
cd backend
& "$env:LOCALAPPDATA\Programs\Python\Python39\python.exe" app.py
```

Or if Python is in PATH:
```powershell
cd backend
python app.py
```

The app will start on `http://0.0.0.0:80` (port 80).

## Complete Requirements List
See `requirements.txt` for the full list. Key dependencies:
- FastAPI + uvicorn (web framework) ✅ Installed
- langgraph + langchain (AI workflow) ❌ Needs disk space
- redis (caching) ✅ Installed  
- pymysql (database) ✅ Installed
- python-jose (JWT auth) ✅ Installed
- pydantic (data validation) ✅ Installed

## Quick Disk Space Check
```powershell
Get-PSDrive C | Select-Object Used,Free
```
