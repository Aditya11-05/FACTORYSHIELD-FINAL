/**
 * FactoryShield — Simulation Engine
 * Generates realistic industrial sensor data with:
 * - Gradual tool wear drift
 * - Temperature drift with noise
 * - Random vibration fluctuations
 * - Occasional anomaly spikes
 * - Injected failure mode
 */

export interface SensorReading {
  timestamp:   number
  timeLabel:   string
  temperature: number
  vibration:   number
  torque:      number
  toolWear:    number
  speed:       number
  machineType: string
}

export interface SimState {
  tick:            number
  baseTemp:        number
  baseVibration:   number
  baseTorque:      number
  toolWearCursor:  number
  speed:           number
  failureInjected: boolean
  failureTicksLeft:number
}

const MACHINE_TYPE = "M"

export function createInitialState(): SimState {
  return {
    tick:             0,
    baseTemp:         300 + Math.random() * 4,
    baseVibration:    1.2 + Math.random() * 0.5,
    baseTorque:       38 + Math.random() * 8,
    toolWearCursor:   40 + Math.random() * 60,   // start mid-life
    speed:            1450 + Math.random() * 100,
    failureInjected:  false,
    failureTicksLeft: 0,
  }
}

function noise(magnitude: number): number {
  // Box-Muller gaussian noise
  const u = 1 - Math.random()
  const v = Math.random()
  return magnitude * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function nextTick(state: SimState, speedMultiplier: number = 1): {
  reading: SensorReading
  nextState: SimState
} {
  const tick = state.tick + 1

  // Tool wear: gradual increase + tiny noise
  const wearIncrement  = 0.08 * speedMultiplier + noise(0.05)
  let toolWear         = clamp(state.toolWearCursor + wearIncrement, 0, 250)

  // Temp: slow drift with noise
  let tempDrift        = Math.sin(tick * 0.05) * 1.5
  let temperature      = state.baseTemp + tempDrift + noise(0.4)

  // Vibration: oscillates with noise
  let vibration        = state.baseVibration + Math.sin(tick * 0.12) * 0.3 + noise(0.15)

  // Torque: gradual increase with wear
  let torque           = state.baseTorque + (toolWear / 250) * 15 + noise(1.5)

  // Speed: slight variation
  let speed            = state.speed + noise(20)

  // Failure injection — spike all sensors drastically
  let failureTicksLeft = Math.max(0, state.failureTicksLeft - 1)
  let failureInjected  = state.failureInjected

  if (failureInjected && failureTicksLeft > 0) {
    const severity   = failureTicksLeft / 20  // decays over 20 ticks
    temperature      = temperature + 18 * severity + noise(1)
    vibration        = vibration   + 5.5 * severity + noise(0.3)
    torque           = torque      + 30 * severity + noise(2)
    toolWear         = clamp(toolWear + 15 * severity, 0, 250)
    speed            = clamp(speed - 200 * severity, 800, 3000)
  }

  // Natural failure escalation near tool wear limit
  if (toolWear > 200) {
    const excess  = (toolWear - 200) / 50
    temperature  += excess * 6
    vibration    += excess * 2
    torque       += excess * 10
  }

  const now = new Date()
  const timeLabel = now.toLocaleTimeString("en-US", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  })

  const reading: SensorReading = {
    timestamp:   Date.now(),
    timeLabel,
    temperature: Math.round(temperature * 10) / 10,
    vibration:   Math.round(vibration  * 100) / 100,
    torque:      Math.round(torque     * 10) / 10,
    toolWear:    Math.round(toolWear   * 10) / 10,
    speed:       Math.round(speed),
    machineType: MACHINE_TYPE,
  }

  const nextState: SimState = {
    tick,
    baseTemp:        state.baseTemp + noise(0.02),   // slow drift
    baseVibration:   state.baseVibration,
    baseTorque:      state.baseTorque,
    toolWearCursor:  toolWear,
    speed:           clamp(speed, 900, 2200),
    failureInjected: failureTicksLeft > 0,
    failureTicksLeft,
  }

  return { reading, nextState }
}

export function injectFailure(state: SimState): SimState {
  return {
    ...state,
    failureInjected:  true,
    failureTicksLeft: 20,
  }
}

export function resetSimulation(): SimState {
  return createInitialState()
}
