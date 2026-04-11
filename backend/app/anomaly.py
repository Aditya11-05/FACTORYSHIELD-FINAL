"""
FactoryShield — anomaly.py
Isolation Forest-based anomaly detection.
"""

import numpy as np
from app.model import load_artifacts, build_feature_vector
from typing import List


def detect_anomaly(data: dict) -> dict:
    """Detect anomaly for a single machine reading."""
    _, iso_model, scaler, feature_cols, le = load_artifacts()
    X = build_feature_vector(data, feature_cols, le)

    raw_score   = iso_model.decision_function(X)[0]   # higher = more normal
    pred        = iso_model.predict(X)[0]              # -1 = anomaly, 1 = normal

    # Normalise score to 0–1 (1 = most anomalous)
    anomaly_score = float(np.clip(1 - (raw_score + 0.5), 0, 1))
    is_anomaly    = bool(pred == -1)

    status = (
        "Critical" if anomaly_score > 0.8 else
        "Warning"  if anomaly_score > 0.5 else
        "Normal"
    )

    machine_id = data.get("machine_id", "MACHINE-01")

    return {
        "machine_id":    machine_id,
        "anomaly_score": round(anomaly_score * 100, 2),
        "is_anomaly":    is_anomaly,
        "status":        status,
        "recommendation": _get_recommendation(status, anomaly_score),
    }


def batch_anomaly_detection(records: List[dict]) -> List[dict]:
    """Run anomaly detection on a list of machine readings."""
    return [detect_anomaly(r) for r in records]


def _get_recommendation(status: str, score: float) -> str:
    if status == "Critical":
        return "Immediate inspection required. Take machine offline for maintenance."
    elif status == "Warning":
        return "Schedule maintenance within 24–48 hours. Monitor closely."
    return "Operating within normal parameters. Continue routine monitoring."


# Simulated fleet data (used by GET /anomaly endpoint)
def get_fleet_anomaly_report() -> List[dict]:
    import random
    random.seed(42)
    machines = [
        {"id": f"CNC-{i:02d}", "base_score": random.uniform(0.1, 0.9)}
        for i in range(1, 13)
    ]
    report = []
    for m in machines:
        score  = min(1.0, m["base_score"] + random.uniform(-0.05, 0.05))
        status = (
            "Critical" if score > 0.8 else
            "Warning"  if score > 0.5 else
            "Normal"
        )
        report.append({
            "machine_id":    m["id"],
            "anomaly_score": round(score * 100, 1),
            "is_anomaly":    score > 0.5,
            "status":        status,
            "last_checked":  "2025-01-15T10:30:00Z",
            "recommendation": _get_recommendation(status, score),
        })
    return report
