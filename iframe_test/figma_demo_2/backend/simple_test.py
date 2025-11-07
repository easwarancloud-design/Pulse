import sys
import time
import requests

print("Waiting for server to be ready...")
time.sleep(3)

print("\n🔍 Testing API...")
try:
    response = requests.get("http://127.0.0.1:8000/", timeout=10)
    print(f"✅ Success!")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection Error: {e}")
    sys.exit(1)
except requests.exceptions.Timeout:
    print("❌ Request timed out")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {e}")
    sys.exit(1)
