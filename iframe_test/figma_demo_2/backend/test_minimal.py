from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello World", "status": "ok"}

@app.get("/test")
def test():
    return {"test": "This is a test endpoint"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000, log_level="info")
