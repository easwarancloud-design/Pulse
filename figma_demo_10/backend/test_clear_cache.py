"""
Simple script to test the cache clear endpoint
Usage: python test_clear_cache.py
"""
import requests

def clear_cache(domain_id: str, base_url: str = "http://localhost:8000"):
    """Clear Redis cache for a specific domain"""
    url = f"{base_url}/api/cache/clear/{domain_id}"
    
    print(f"🔧 Clearing cache for domain: {domain_id}")
    print(f"📡 URL: {url}")
    
    try:
        response = requests.delete(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data['message']}")
            print(f"📊 Keys deleted: {data['data']['keys_deleted']}")
            print(f"🗑️  Cache keys cleared:")
            for key in data['data']['cache_keys_cleared']:
                print(f"   - {key}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Failed to clear cache: {e}")

if __name__ == "__main__":
    # Change this to your domain ID
    DOMAIN_ID = "AG04333"
    
    clear_cache(DOMAIN_ID)
