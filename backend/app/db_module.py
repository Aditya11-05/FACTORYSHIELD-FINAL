"""
FactoryShield — Supabase client + save helpers
"""

import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Will be None if env vars are not set — all save functions check for this
_client: Client | None = None

def get_client() -> Client | None:
    global _client
    if _client is None and SUPABASE_URL and SUPABASE_KEY:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def save_reading(machine_id: str, inputs: dict, result: dict):
    """Save a prediction result to machine_readings table."""
    db = get_client()
    if db is None:
        return  # Silently skip if Supabase not configured

    top_cause = None
    explanation = result.get("explanation")
    if explanation and explanation.get("contributions"):
        top_cause = explanation["contributions"][0].get("feature")

    row = {
        "machine_id":          machine_id,
        "temperature":         inputs.get("process_temperature"),
        "torque":              inputs.get("torque"),
        "tool_wear":           inputs.get("tool_wear"),
        "rotational_speed":    inputs.get("rotational_speed"),
        "failure_probability": result.get("failure_probability"),
        "failure_type":        result.get("failure_type"),
        "risk_level":          result.get("risk_level"),
        "predicted_failure":   result.get("predicted_failure"),
        "top_cause":           top_cause,
    }
    try:
        db.table("machine_readings").insert(row).execute()
    except Exception as e:
        print(f"[Supabase] save_reading failed: {e}")


def save_alert(machine_id: str, result: dict):
    """Save a high/critical prediction to machine_alerts table."""
    db = get_client()
    if db is None:
        return

    row = {
        "machine_id":   machine_id,
        "risk_level":   result.get("risk_level"),
        "failure_type": result.get("failure_type"),
        "probability":  result.get("failure_probability"),
        "resolved":     False,
    }
    try:
        db.table("machine_alerts").insert(row).execute()
    except Exception as e:
        print(f"[Supabase] save_alert failed: {e}")