import subprocess
import time
import requests
import sys

# Start the server
print("Starting server...")
proc = subprocess.Popen(
    [r"C:\Users\Easwar\AppData\Local\Programs\Python\Python39\python.exe", "test_minimal.py"],
    cwd=r"C:\Users\Easwar\Github\ec2_app\Pulse\iframe_test\figma_demo_new_iframe_working\backend"
)

# Wait for server to start
print("Waiting 4 seconds for server to start...")
time.sleep(4)

# Make request
try:
    print("\nMaking request to http://localhost:9000/...")
    response = requests.get("http://localhost:9000/", timeout=5)
    print(f"✅ SUCCESS!")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test another endpoint
    print("\nTesting /test endpoint...")
    response2 = requests.get("http://localhost:9000/test", timeout=5)
    print(f"✅ SUCCESS!")
    print(f"Response: {response2.json()}")
    
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    # Kill the server
    print("\nStopping server...")
    proc.terminate()
    proc.wait()
    print("Done!")
