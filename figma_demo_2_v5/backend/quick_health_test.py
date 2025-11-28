#!/usr/bin/env python3
"""
Quick Health Check Test
"""
import requests
import time
import sys

def test_health():
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"✅ Server responded: {response.status_code}")
        print(f"Response: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - server not running")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_health_endpoint():
    try:
        response = requests.get("http://localhost:8000/api/conversations/health", timeout=5)
        print(f"✅ Health endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
        return False

if __name__ == "__main__":
    print("Testing server connectivity...")
    if test_health():
        test_health_endpoint()
    sys.exit(0)