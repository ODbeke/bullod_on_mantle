from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.bybit import SYMBOLS

app = FastAPI(title="OD Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/markets")
async def markets() -> dict[str, tuple[str, ...]]:
    return {"symbols": SYMBOLS}
