"""
FactoryShield — FastAPI Backend  (main.py)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict, anomaly, explain, chat

app = FastAPI(
    title="FactoryShield API",
    description="AI-powered predictive maintenance backend",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(predict.router,  prefix="/api", tags=["Prediction"])
app.include_router(anomaly.router,  prefix="/api", tags=["Anomaly"])
app.include_router(explain.router,  prefix="/api", tags=["Explain"])
app.include_router(chat.router,     prefix="/api", tags=["Chat"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "FactoryShield API v1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
"""
FactoryShield — Upgraded FastAPI main.py
- All existing endpoints preserved
- New /simulate/live endpoint
- Self-ping keepalive
- CORS for Vercel
"""

import os, asyncio, random
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.routers import predict, anomaly, explain, chat

app = FastAPI(
    title="FactoryShield API",
    description="AI-powered predictive maintenance — upgraded",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api", tags=["Prediction"])
app.include_router(anomaly.router, prefix="/api", tags=["Anomaly"])
app.include_router(explain.router, prefix="/api", tags=["Explain"])
app.include_router(chat.router,    prefix="/api", tags=["Chat"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "FactoryShield API v2.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# ── Simulation engine ─────────────────────────────────────────────────────────
MACHINE_IDS = [f"CNC-{i:02d}" for i in range(1, 13)]

def _simulate_reading(machine_id: str) -> dict:
    """Generate realistic sensor reading with drift."""
    base_wear  = random.uniform(50, 230)
    base_torq  = random.uniform(20, 75)
    air_temp   = round(random.normalvariate(300, 2), 2)
    proc_temp  = round(air_temp + random.normalvariate(10, 1), 2)
    speed      = round(random.normalvariate(1500, 150), 0)
    torque     = round(abs(base_torq + random.normalvariate(0, 3)), 2)
    tool_wear  = round(base_wear + random.uniform(0, 5), 1)

    return {
        "machine_id":          machine_id,
        "machine_type":        random.choice(["L","M","H"]),
        "air_temperature":     air_temp,
        "process_temperature": proc_temp,
        "rotational_speed":    speed,
        "torque":              torque,
        "tool_wear":           tool_wear,
        "timestamp":           datetime.utcnow().isoformat(),
    }


@app.get("/simulate/live", tags=["Simulation"])
async def simulate_live():
    """
    Server-Sent Events stream of live machine predictions.
    GET /simulate/live
    """
    from app.predict import predict_failure

    async def event_stream():
        import json
        while True:
            machine_id = random.choice(MACHINE_IDS)
            reading    = _simulate_reading(machine_id)
            try:
                prediction = predict_failure(reading)
                payload    = {**reading, **prediction}
            except Exception as e:
                payload = {"error": str(e), "machine_id": machine_id}

            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(random.uniform(2, 5))

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/simulate/snapshot", tags=["Simulation"])
async def simulate_snapshot():
    """Return one prediction snapshot for all 12 machines."""
    from app.predict import predict_failure
    results = []
    for mid in MACHINE_IDS:
        reading = _simulate_reading(mid)
        try:
            pred = predict_failure(reading)
            results.append({**reading, **pred})
        except Exception as e:
            results.append({"machine_id": mid, "error": str(e)})
    return {"machines": results, "timestamp": datetime.utcnow().isoformat()}


# ── Self-ping keepalive ───────────────────────────────────────────────────────
@app.on_event("startup")
async def start_keepalive():
    render_url = os.getenv("RENDER_EXTERNAL_URL", "")
    if render_url:
        async def _ping():
            import httpx
            while True:
                await asyncio.sleep(240)
                try:
                    async with httpx.AsyncClient() as client:
                        await client.get(f"{render_url}/health", timeout=10)
                        print(f"[KEEPALIVE] Pinged at {datetime.utcnow().isoformat()}")
                except Exception:
                    pass
        asyncio.create_task(_ping())
