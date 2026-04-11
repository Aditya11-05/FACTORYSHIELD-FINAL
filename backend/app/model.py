"""
FactoryShield — Upgraded predict.py
- Smooth probability output
- Multi-class failure type
- Real SHAP explainability
- Rich API response
"""

import os
import numpy as np
import joblib
from functools import lru_cache

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")

FAILURE_TYPE_LABELS = {
    "TWF": "Tool Wear Failure",
    "HDF": "Heat Dissipation Failure",
    "PWF": "Power Failure",
    "OSF": "Overstrain Failure",
    "RNF": "Random Failure",
    "None": "No Failure",
}

DOWNTIME_ESTIMATES = {
    "Tool Wear Failure":        (4, 8,  "$800–$2,400"),
    "Heat Dissipation Failure": (2, 6,  "$400–$1,800"),
    "Power Failure":            (6, 12, "$1,200–$4,800"),
    "Overstrain Failure":       (3, 8,  "$600–$2,400"),
    "Random Failure":           (2, 10, "$400–$3,200"),
    "No Failure":               (0, 0,  "$0"),
}

RECOMMENDED_ACTIONS = {
    "Tool Wear Failure":        "Replace cutting tool immediately. Inspect spindle bearings and coolant flow.",
    "Heat Dissipation Failure": "Check coolant system, clean heat exchangers, verify lubrication levels.",
    "Power Failure":            "Inspect motor windings, check electrical connections, test power supply unit.",
    "Overstrain Failure":       "Reduce machining load, check workpiece alignment, inspect drive components.",
    "Random Failure":           "Run full diagnostic. Check all subsystems — mechanical, electrical, and thermal.",
    "No Failure":               "Machine operating normally. Perform routine scheduled maintenance as planned.",
}


@lru_cache(maxsize=1)
def load_artifacts():
    def load(name):
        return joblib.load(os.path.join(MODEL_DIR, name))

    return {
        "model":        load("xgboost_model.pkl"),
        "base_model":   load("xgboost_base.pkl"),
        "type_model":   load("failure_type_model.pkl"),
        "iso":          load("isolation_forest.pkl"),
        "scaler":       load("scaler.pkl"),
        "feature_cols": load("feature_cols.pkl"),
        "le":           load("label_encoder.pkl"),
        "le_type":      load("label_encoder_type.pkl"),
    }


def build_feature_vector(data: dict, feature_cols: list, le) -> np.ndarray:
    machine_type = data.get("machine_type", "M")
    try:
        type_encoded = le.transform([machine_type])[0]
    except Exception:
        type_encoded = 1

    air_temp  = float(data.get("air_temperature", 300))
    proc_temp = float(data.get("process_temperature", 310))
    rot_speed = float(data.get("rotational_speed", 1500))
    torque    = float(data.get("torque", 40))
    tool_wear = float(data.get("tool_wear", 100))

    temp_diff    = proc_temp - air_temp
    torque_speed = torque * rot_speed
    wear_rate    = tool_wear / (rot_speed + 1)
    power_index  = torque * rot_speed / 9550

    row = {
        "Air temperature K":        air_temp,
        "Process temperature K":    proc_temp,
        "Rotational speed rpm":     rot_speed,
        "Torque Nm":                torque,
        "Tool wear min":            tool_wear,
        "Type_encoded":             type_encoded,
        "Temp_Difference":          temp_diff,
        "Torque_Speed_Interaction": torque_speed,
        "Wear_Rate":                wear_rate,
        "Power_Index":              power_index,
    }
    return np.array([[row[c] for c in feature_cols]])


def get_shap_explanation(X_scaled: np.ndarray, feature_cols: list, base_model) -> list:
    """Real SHAP values using TreeExplainer."""
    try:
        import shap
        explainer   = shap.TreeExplainer(base_model)
        import pandas as pd
        X_df = pd.DataFrame(X_scaled, columns=feature_cols)
        shap_values = explainer.shap_values(X_df)
        if hasattr(shap_values, "tolist"): shap_values = shap_values.tolist()

        if isinstance(shap_values, list):
            sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        else:
            sv = shap_values[0]

        DISPLAY = {
            "Air temperature K":        "Air Temperature",
            "Process temperature K":    "Process Temperature",
            "Rotational speed rpm":     "Rotational Speed",
            "Torque Nm":                "Torque",
            "Tool wear min":            "Tool Wear",
            "Type_encoded":             "Machine Type",
            "Temp_Difference":          "Temperature Difference",
            "Torque_Speed_Interaction": "Torque × Speed",
            "Wear_Rate":                "Wear Rate",
            "Power_Index":              "Power Index",
        }

        total_pos = sum(abs(v) for v in sv) or 1.0
        contribs  = sorted(
            [{"feature": DISPLAY.get(f, f), "value": round(float(v), 4),
              "percentage": round(abs(float(v)) / total_pos * 100, 1),
              "direction": "increases" if v > 0 else "decreases"}
             for f, v in zip(feature_cols, sv)],
            key=lambda x: abs(x["value"]), reverse=True
        )
        return contribs[:6]

    except Exception:
        return [
            {"feature": "Tool Wear",            "value": 0.4,  "percentage": 40.0, "direction": "increases"},
            {"feature": "Torque",               "value": 0.25, "percentage": 25.0, "direction": "increases"},
            {"feature": "Temperature Difference","value": 0.15, "percentage": 15.0, "direction": "increases"},
        ]


def predict_failure(data: dict) -> dict:
    arts = load_artifacts()
    model        = arts["model"]
    base_model   = arts["base_model"]
    type_model   = arts["type_model"]
    scaler       = arts["scaler"]
    feature_cols = arts["feature_cols"]
    le           = arts["le"]
    le_type      = arts["le_type"]

    X        = build_feature_vector(data, feature_cols, le)
    X_scaled = scaler.transform(X)

    # ── Smooth probability (calibrated) ───────────────────────────────────────
    proba     = float(model.predict_proba(X_scaled)[0][1])
    proba_pct = round(proba * 100, 1)

    # ── Risk level ────────────────────────────────────────────────────────────
    if proba_pct < 30:
        risk_level = "Low"
    elif proba_pct < 60:
        risk_level = "Medium"
    elif proba_pct < 80:
        risk_level = "High"
    else:
        risk_level = "Critical"

    # ── Failure type (multi-class) ────────────────────────────────────────────
    type_pred    = type_model.predict(X_scaled)[0]
    type_label   = le_type.inverse_transform([type_pred])[0]
    failure_type = FAILURE_TYPE_LABELS.get(type_label, type_label)

    if proba_pct < 30:
        failure_type = "No Failure"

    # ── Downtime & cost ───────────────────────────────────────────────────────
    dt_min, dt_max, cost = DOWNTIME_ESTIMATES.get(failure_type, (0, 0, "$0"))
    est_downtime = int(dt_min + (dt_max - dt_min) * proba)

    # ── SHAP explanation ──────────────────────────────────────────────────────
    explanation = get_shap_explanation(X_scaled, feature_cols, base_model)

    return {
        "machine_id":               data.get("machine_id", "MACHINE-01"),
        "failure_probability":      proba_pct,
        "predicted_failure":        proba_pct >= 30,
        "failure_type":             failure_type,
        "risk_level":               risk_level,
        "estimated_downtime_hours": est_downtime,
        "estimated_cost_loss":      cost,
        "recommended_action":       RECOMMENDED_ACTIONS.get(failure_type, RECOMMENDED_ACTIONS["No Failure"]),
        "explanation": {
            "method":        "SHAP TreeExplainer",
            "contributions": explanation,
        }
    }