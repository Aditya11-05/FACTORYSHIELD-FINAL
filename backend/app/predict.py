"""
FactoryShield — predict router
POST /api/predict       — single prediction
POST /api/predict-bulk  — CSV batch prediction
"""

import io
import csv
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from app.model import predict_failure

router = APIRouter()


class PredictionRequest(BaseModel):
    machine_id:           Optional[str]   = "MACHINE-01"
    machine_type:         Optional[str]   = Field("M", description="L, M, or H")
    air_temperature:      float           = Field(300.0, ge=290, le=320)
    process_temperature:  float           = Field(310.0, ge=300, le=330)
    rotational_speed:     float           = Field(1500.0, ge=500, le=3000)
    torque:               float           = Field(40.0, ge=0, le=100)
    tool_wear:            float           = Field(100.0, ge=0, le=300)
    include_explanation:  Optional[bool]  = True


@router.post("/predict")
async def predict(req: PredictionRequest):
    try:
        from app.db import save_reading, save_alert

        data   = req.dict()
        result = predict_failure(data)
        result["machine_id"] = req.machine_id

        # Save every prediction to Supabase
        save_reading(req.machine_id, data, result)
        if result.get("risk_level") in ("High", "Critical"):
            save_alert(req.machine_id, result)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-bulk")
async def predict_bulk(file: UploadFile = File(...)):
    """Accept a CSV file and return predictions for all rows."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
    try:
        content = await file.read()
        reader  = csv.DictReader(io.StringIO(content.decode("utf-8")))
        results = []
        for i, row in enumerate(reader):
            data = {
                "machine_id":          row.get("machine_id", f"ROW-{i+1}"),
                "machine_type":        row.get("Type", row.get("machine_type", "M")),
                "air_temperature":     float(row.get("Air temperature [K]", row.get("air_temperature", 300))),
                "process_temperature": float(row.get("Process temperature [K]", row.get("process_temperature", 310))),
                "rotational_speed":    float(row.get("Rotational speed [rpm]", row.get("rotational_speed", 1500))),
                "torque":              float(row.get("Torque [Nm]", row.get("torque", 40))),
                "tool_wear":           float(row.get("Tool wear [min]", row.get("tool_wear", 100))),
            }
            pred = predict_failure(data)
            pred["machine_id"] = data["machine_id"]
            results.append(pred)

        summary = {
            "total":     len(results),
            "failures":  sum(1 for r in results if r["predicted_failure"]),
            "critical":  sum(1 for r in results if r["risk_level"] == "Critical"),
            "high_risk": sum(1 for r in results if r["risk_level"] == "High"),
        }
        return {"summary": summary, "predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))