import subprocess
import time
import requests

def run():
    print("Starting FastAPI app on port 8000...")
    proc = subprocess.Popen(
        [r"C:\\Users\\Easwar\\AppData\\Local\\Programs\\Python\\Python39\\python.exe", "app.py"],
        cwd=r"C:\\Users\\Easwar\\Github\\ec2_app\\Pulse\\iframe_test\\figma_demo_new_iframe_working\\backend"
    )

    try:
        print("Waiting 5 seconds for server to start...")
        time.sleep(5)

        print("\n=== Testing /health/mysql ===")
        try:
            r = requests.get("http://localhost:8000/health/mysql", timeout=15)
            print(r.status_code, r.json())
        except Exception as e:
            print("MYSQL TEST ERROR:", e)

        print("\n=== Testing /health/redis ===")
        try:
            r = requests.get("http://localhost:8000/health/redis", timeout=15)
            print(r.status_code, r.json())
        except Exception as e:
            print("REDIS TEST ERROR:", e)

    finally:
        print("\nStopping server...")
        proc.terminate()
        proc.wait()
        print("Done.")

if __name__ == "__main__":
    run()
