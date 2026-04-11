"""
FactoryShield — anomaly router
GET  /api/anomaly         — fleet anomaly report
POST /api/anomaly/detect  — single-machine anomaly detection
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.anomaly import detect_anomaly, get_fleet_anomaly_report

router = APIRouter()


class AnomalyRequest(BaseModel):
    machine_id:          Optional[str]  = "MACHINE-01"
    machine_type:        Optional[str]  = "M"
    air_temperature:     float          = 300.0
    process_temperature: float          = 310.0
    rotational_speed:    float          = 1500.0
    torque:              float          = 40.0
    tool_wear:           float          = 100.0


@router.get("/anomaly")
async def fleet_anomaly():
    """Return anomaly scores for the entire fleet."""
    try:
        return {"machines": get_fleet_anomaly_report()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/anomaly/detect")
async def detect(req: AnomalyRequest):
    try:
        return detect_anomaly(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
