import subprocess
import time
import requests
import sys

# Start the server
print("Starting FastAPI app on port 8000...")
proc = subprocess.Popen(
    [r"C:\Users\Easwar\AppData\Local\Programs\Python\Python39\python.exe", "app.py"],
    cwd=r"C:\Users\Easwar\Github\ec2_app\Pulse\iframe_test\figma_demo_new_iframe_working\backend"
)

# Wait for server to start
print("Waiting 5 seconds for server to start...")
time.sleep(5)

# Make request
try:
    print("\n=== Testing ROOT endpoint (GET /) ===")
    response = requests.get("http://localhost:8000/", timeout=10)
    print(f"✅ SUCCESS!")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test token generation
    print("\n=== Testing TOKEN endpoint (POST /token) ===")
    response2 = requests.post(
        "http://localhost:8000/token",
        auth=("src_workforce_agent_user", "topsecret123"),
        json={"domainid": "TEST12345"},
        timeout=10
    )
    print(f"Status Code: {response2.status_code}")
    if response2.status_code == 200:
        data = response2.json()
        print(f"✅ Token Generated Successfully!")
        print(f"Access Token: {data.get('access_token', '')[:60]}...")
        print(f"Token Type: {data.get('token_type')}")
        print(f"Expires In: {data.get('expires_in')} seconds")
    else:
        print(f"Response: {response2.text}")
    
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {e}")
finally:
    # Kill the server
    print("\n" + "="*60)
    print("Stopping server...")
    proc.terminate()
    proc.wait()
    print("✅ Test Complete!")
