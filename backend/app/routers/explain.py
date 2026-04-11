"""
FactoryShield — explain router
GET /api/explain   — SHAP explanation for given machine parameters
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.explain import get_shap_explanation

router = APIRouter()


class ExplainRequest(BaseModel):
    machine_type:        Optional[str]  = "M"
    air_temperature:     float          = 300.0
    process_temperature: float          = 310.0
    rotational_speed:    float          = 1500.0
    torque:              float          = 40.0
    tool_wear:           float          = 100.0


@router.post("/explain")
async def explain(req: ExplainRequest):
    try:
        return get_shap_explanation(req.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
