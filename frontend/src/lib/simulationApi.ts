/**
 * FactoryShield — Simulation API Client
 * Sends sensor readings to backend and returns predictions
 */

import type { SensorReading } from "./simulationEngine"

const API_URL = "https://factoryshield-api.onrender.com"

export interface PredictionResult {
  failure_probability:      number
  failure_type:             string
  risk_level:               "Low" | "Medium" | "High" | "Critical"
  recommended_action:       string
  estimated_downtime_hours: number
  estimated_cost_loss:      string
  explanation?: {
    contributions: Array<{
      feature:    string
      percentage: number
      direction:  string
    }>
  }
}

export interface SimulationDataPoint extends SensorReading, PredictionResult {
  machineId: string
}

export async function fetchPrediction(
  reading: SensorReading,
  machineId: string = "CNC-SIM-01"
): Promise<PredictionResult> {
  const body = {
    machine_id:          machineId,
    machine_type:        reading.machineType,
    air_temperature:     reading.temperature,
    process_temperature: reading.temperature + 10,
    rotational_speed:    reading.speed,
    torque:              reading.torque,
    tool_wear:           reading.toolWear,
    include_explanation: true,
  }

  const res = await fetch(`${API_URL}/api/predict`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// Fallback local prediction when backend is offline
export function localPredict(reading: SensorReading): PredictionResult {
  const wearScore  = reading.toolWear / 250
  const tempScore  = Math.max(0, (reading.temperature - 298) / 22)
  const torqScore  = Math.max(0, (reading.torque - 30) / 50)
  const vibScore   = Math.max(0, (reading.vibration - 1.0) / 5)

  const raw = 0.40 * wearScore + 0.25 * torqScore + 0.20 * tempScore + 0.15 * vibScore
  const prob = Math.round(100 / (1 + Math.exp(-8 * (raw - 0.45))))

  const risk: PredictionResult["risk_level"] =
    prob < 30 ? "Low" : prob < 60 ? "Medium" : prob < 80 ? "High" : "Critical"

  let failure_type = "No Failure"
  if (prob >= 30) {
    if (reading.toolWear > 200)       failure_type = "Tool Wear Failure"
    else if (reading.temperature > 314) failure_type = "Heat Dissipation Failure"
    else if (reading.torque > 65)     failure_type = "Power Failure"
    else if (reading.vibration > 4)   failure_type = "Overstrain Failure"
    else                              failure_type = "Random Failure"
  }

  const actions: Record<string, string> = {
    "Tool Wear Failure":        "Replace cutting tool immediately.",
    "Heat Dissipation Failure": "Check coolant system and clean heat exchangers.",
    "Power Failure":            "Inspect motor windings and electrical connections.",
    "Overstrain Failure":       "Reduce machining load. Check alignment.",
    "Random Failure":           "Run full diagnostic on all subsystems.",
    "No Failure":               "Operating normally. Routine maintenance scheduled.",
  }

  return {
    failure_probability:      prob,
    failure_type,
    risk_level:               risk,
    recommended_action:       actions[failure_type],
    estimated_downtime_hours: prob >= 80 ? 8 : prob >= 60 ? 4 : prob >= 30 ? 2 : 0,
    estimated_cost_loss:      prob >= 80 ? "$1,200–$4,800" : prob >= 60 ? "$600–$2,400" : prob >= 30 ? "$200–$800" : "$0",
  }
}
