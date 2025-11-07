"""
Simple test script to verify FastAPI routes work
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_root():
    """Test the root endpoint"""
    print("\n=== Testing ROOT endpoint (GET /) ===")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_token_generation():
    """Test token generation endpoint"""
    print("\n=== Testing TOKEN endpoint (POST /token) ===")
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            auth=("src_workforce_agent_user", "topsecret123"),
            json={"domainid": "TEST12345"},
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Token Generated: {data.get('access_token', '')[:50]}...")
            print(f"Expires In: {data.get('expires_in')} seconds")
        else:
            print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting API Tests...")
    print(f"📍 Base URL: {BASE_URL}")
    
    results = []
    
    # Test 1: Root endpoint
    results.append(("Root Endpoint", test_root()))
    
    # Test 2: Token generation
    results.append(("Token Generation", test_token_generation()))
    
    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY:")
    print("="*50)
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name}: {status}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")
