"""Main entry point for backend."""

# If in debug mode, populate environment first
import os

if not os.path.isdir("../../dev/.env"):
    from dotenv import load_dotenv

    load_dotenv(dotenv_path="../../dev/.env")


from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from apis import router


# Setup FastAPI
app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

# Start
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.environ.get("HOST", "localhost"),
        port=int(os.environ.get("PORT", "5010")),
        log_config="log_conf.yaml",
    )
