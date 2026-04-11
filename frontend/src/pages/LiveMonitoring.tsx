import { useState, useEffect, useRef, useCallback } from "react"
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import {
  Play, Square, Zap, RotateCcw, Wifi, WifiOff,
  AlertTriangle, CheckCircle, Activity, Thermometer,
  Cpu, Timer, TrendingUp, ChevronUp, ChevronDown,
} from "lucide-react"
import {
  createInitialState, nextTick, injectFailure,
  type SensorReading, type SimState,
} from "../lib/simulationEngine"
import {
  fetchPrediction, localPredict,
  type PredictionResult, type SimulationDataPoint,
} from "../lib/simulationApi"

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_POINTS  = 50
const MACHINE_IDS = ["CNC-01", "CNC-03", "CNC-07"]

// ── Helpers ───────────────────────────────────────────────────────────────────
function riskColor(level: string) {
  return level === "Critical" ? "#ff4466"
       : level === "High"     ? "#ff8c42"
       : level === "Medium"   ? "#ffc837"
       :                        "#00ff9d"
}

function riskBg(level: string) {
  return level === "Critical" ? "rgba(255,68,102,0.12)"
       : level === "High"     ? "rgba(255,140,66,0.12)"
       : level === "Medium"   ? "rgba(255,200,55,0.12)"
       :                        "rgba(0,255,157,0.12)"
}

function probToStatus(prob: number) {
  if (prob >= 70) return { label: "CRITICAL", color: "#ff4466", pulse: true }
  if (prob >= 40) return { label: "WARNING",  color: "#ffc837", pulse: true }
  return               { label: "NORMAL",    color: "#00ff9d", pulse: false }
}

// ── Gauge Component ───────────────────────────────────────────────────────────
function ProbGauge({ value }: { value: number }) {
  const color = value >= 70 ? "#ff4466" : value >= 40 ? "#ffc837" : "#00ff9d"
  const pct   = Math.min(value, 100)
  const dash  = (pct / 100) * 188
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 80 50" className="w-40 h-24">
        <path d="M8 46 A34 34 0 0 1 72 46" fill="none" stroke="#1e2f50" strokeWidth="8" strokeLinecap="round" />
        <path d="M8 46 A34 34 0 0 1 72 46" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} 188`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
        />
        <text x="40" y="42" textAnchor="middle" fill="white"
          style={{ fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
          {value}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 font-mono -mt-2">Failure Probability</span>
    </div>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  label, value, unit, icon: Icon, color, trend
}: {
  label: string; value: string | number; unit: string
  icon: any; color: string; trend?: "up" | "down" | "flat"
}) {
  return (
    <div className="glass p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}
        style={{ background: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold font-mono text-white">{value}</span>
          <span className="text-xs text-slate-500">{unit}</span>
          {trend === "up"   && <ChevronUp   className="w-3 h-3 text-red-400" />}
          {trend === "down" && <ChevronDown className="w-3 h-3 text-green-400" />}
        </div>
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#0d1526", border: "1px solid rgba(0,212,255,0.2)",
      borderRadius: 8, padding: "8px 12px", fontSize: 11,
    }}>
      <p style={{ color: "#64748b", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveMonitoring() {
  const [running,     setRunning]     = useState(false)
  const [speed,       setSpeed]       = useState<1 | 2 | 5>(1)
  const [machineId,   setMachineId]   = useState(MACHINE_IDS[0])
  const [data,        setData]        = useState<SimulationDataPoint[]>([])
  const [simState,    setSimState]    = useState<SimState>(createInitialState())
  const [prediction,  setPrediction]  = useState<PredictionResult | null>(null)
  const [backendOnline, setBackendOnline] = useState(true)
  const [tickCount,   setTickCount]   = useState(0)
  const [injecting,   setInjecting]   = useState(false)

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const simStateRef  = useRef<SimState>(simState)
  const pendingRef   = useRef(false)

  simStateRef.current = simState

  // ── Tick function ─────────────────────────────────────────────────────────
  const tick = useCallback(async () => {
    if (pendingRef.current) return
    pendingRef.current = true

    const { reading, nextState } = nextTick(simStateRef.current, speed)
    setSimState(nextState)
    setTickCount(t => t + 1)

    // Fetch prediction (backend or local fallback)
    let pred: PredictionResult
    try {
      pred = await fetchPrediction(reading, machineId)
      setBackendOnline(true)
    } catch {
      pred = localPredict(reading)
      setBackendOnline(false)
    }

    setPrediction(pred)

    const point: SimulationDataPoint = {
      ...reading,
      ...pred,
      machineId,
    }

    setData(prev => {
      const next = [...prev, point]
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next
    })

    pendingRef.current = false
  }, [speed, machineId])

  // ── Start / Stop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      const ms = Math.round(2000 / speed)
      intervalRef.current = setInterval(tick, ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, speed, tick])

  function handleStart() {
    setRunning(true)
  }

  function handleStop() {
    setRunning(false)
  }

  function handleReset() {
    setRunning(false)
    setData([])
    setPrediction(null)
    setTickCount(0)
    setSimState(createInitialState())
    simStateRef.current = createInitialState()
  }

  function handleInjectFailure() {
    setInjecting(true)
    setSimState(prev => {
      const next = injectFailure(prev)
      simStateRef.current = next
      return next
    })
    setTimeout(() => setInjecting(false), 3000)
  }

  const latest  = data[data.length - 1]
  const status  = probToStatus(prediction?.failure_probability ?? 0)
  const risk    = prediction?.risk_level ?? "Low"

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-shield-accent" /> Live Simulation
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-slate-500">Real-time AI prediction engine</p>
            <span className={`flex items-center gap-1.5 text-xs font-mono ${backendOnline ? "text-green-400" : "text-yellow-400"}`}>
              {backendOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {backendOnline ? "Backend online" : "Local fallback"}
            </span>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          Tick #{tickCount} · {data.length} points
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="glass p-4 flex flex-wrap items-center gap-3">

        {/* Machine selector */}
        <select
          value={machineId}
          onChange={e => setMachineId(e.target.value)}
          disabled={running}
          className="input-field w-32 text-sm"
        >
          {MACHINE_IDS.map(id => <option key={id}>{id}</option>)}
        </select>

        {/* Speed */}
        <div className="flex gap-1 border border-shield-500 rounded-lg overflow-hidden">
          {([1, 2, 5] as const).map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                speed === s ? "bg-shield-accent text-shield-900 font-bold" : "text-slate-400 hover:text-white"
              }`}>
              {s}×
            </button>
          ))}
        </div>

        {/* Start / Stop */}
        {!running ? (
          <button onClick={handleStart} className="btn-primary flex items-center gap-2 text-sm">
            <Play className="w-4 h-4" /> Start Simulation
          </button>
        ) : (
          <button onClick={handleStop} className="btn-danger flex items-center gap-2 text-sm">
            <Square className="w-4 h-4" /> Stop
          </button>
        )}

        {/* Inject failure */}
        <button
          onClick={handleInjectFailure}
          disabled={!running || injecting}
          className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium border transition-all ${
            injecting
              ? "bg-red-500/30 text-red-300 border-red-500/40 animate-pulse"
              : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
          }`}>
          <Zap className="w-4 h-4" />
          {injecting ? "Failure Active!" : "Inject Failure"}
        </button>

        {/* Reset */}
        <button onClick={handleReset}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>

        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${status.pulse ? "animate-pulse" : ""}`}
            style={{ background: status.color }} />
          <span className="text-xs font-mono font-bold" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* ── Top metrics row ── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Temperature"    value={latest?.temperature ?? "—"} unit="K"   icon={Thermometer} color="#f97316" trend={latest?.temperature > 308 ? "up" : "flat"} />
        <MetricCard label="Vibration"      value={latest?.vibration  ?? "—"} unit="g"   icon={Activity}    color="#a855f7" trend={latest?.vibration  > 2.5 ? "up" : "flat"} />
        <MetricCard label="Torque"         value={latest?.torque     ?? "—"} unit="Nm"  icon={Cpu}         color="#00d4ff" trend={latest?.torque     > 55  ? "up" : "flat"} />
        <MetricCard label="Tool Wear"      value={latest?.toolWear   ?? "—"} unit="min" icon={Timer}       color={latest?.toolWear > 200 ? "#ff4466" : latest?.toolWear > 150 ? "#ffc837" : "#00ff9d"} trend="up" />
      </div>

      {/* ── Main content: gauge + charts ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Left: Gauge + prediction info */}
        <div className="glass p-5 flex flex-col items-center gap-4">
          {prediction ? (
            <>
              <ProbGauge value={prediction.failure_probability} />

              <div className="w-full text-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: riskBg(risk), color: riskColor(risk), border: `1px solid ${riskColor(risk)}40` }}>
                  {risk} Risk
                </span>
              </div>

              <div className="w-full space-y-2">
                <div className="px-3 py-2 rounded-lg bg-shield-700/50 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">Failure Type</div>
                  <div className="text-sm font-medium text-white">{prediction.failure_type}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-shield-700/50 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">Est. Downtime</div>
                  <div className="text-sm font-bold font-mono" style={{ color: riskColor(risk) }}>
                    {prediction.estimated_downtime_hours}h
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-shield-700/50 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">Cost Risk</div>
                  <div className="text-sm font-mono text-yellow-400">{prediction.estimated_cost_loss}</div>
                </div>
              </div>

              <div className="w-full px-3 py-2.5 rounded-lg text-xs text-slate-300 leading-relaxed"
                style={{ background: `${riskColor(risk)}10`, border: `1px solid ${riskColor(risk)}25` }}>
                {prediction.recommended_action}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center min-h-48">
              <Activity className="w-10 h-10 text-slate-600" />
              <p className="text-sm text-slate-500">Press Start to begin simulation</p>
              <p className="text-xs text-slate-600">AI predictions update every {Math.round(2000/speed)}ms</p>
            </div>
          )}
        </div>

        {/* Right: Charts */}
        <div className="col-span-2 space-y-4">

          {/* Sensor chart */}
          <div className="glass p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-shield-accent" />
              Sensor Readings — Live
            </h3>
            {data.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={1.5} dot={false} name="Temp (K)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="torque"      stroke="#00d4ff" strokeWidth={1.5} dot={false} name="Torque (Nm)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="toolWear"    stroke="#a855f7" strokeWidth={1.5} dot={false} name="Tool Wear" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-xs text-slate-600">Waiting for data…</p>
              </div>
            )}
          </div>

          {/* Failure probability chart */}
          <div className="glass p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-shield-yellow" />
              Failure Probability — Live
            </h3>
            {data.length > 1 ? (
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff4466" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff4466" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={70} stroke="#ff4466" strokeDasharray="4 2" strokeOpacity={0.5} label={{ value: "Critical", fill: "#ff4466", fontSize: 9 }} />
                  <ReferenceLine y={40} stroke="#ffc837" strokeDasharray="4 2" strokeOpacity={0.5} label={{ value: "Warning", fill: "#ffc837", fontSize: 9 }} />
                  <Area type="monotone" dataKey="failure_probability" stroke="#ff4466" fill="url(#probGrad)" strokeWidth={2} dot={false} name="Failure %" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-xs text-slate-600">Waiting for data…</p>
              </div>
            )}
          </div>

          {/* Tool wear progress */}
          {latest && (
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Tool Wear Progress</h3>
                <span className="text-xs font-mono" style={{ color: latest.toolWear > 200 ? "#ff4466" : latest.toolWear > 150 ? "#ffc837" : "#00ff9d" }}>
                  {latest.toolWear.toFixed(1)} / 250 min ({((latest.toolWear/250)*100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-3 bg-shield-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((latest.toolWear/250)*100, 100)}%`,
                    background: latest.toolWear > 200 ? "#ff4466" : latest.toolWear > 150 ? "#ffc837" : "#00ff9d",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>New</span><span>Replace at 200 min</span><span>Max 250</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SHAP explanation ── */}
      {prediction?.explanation?.contributions && prediction.explanation.contributions.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Root Cause Analysis (SHAP)</h3>
          <div className="space-y-2">
            {prediction.explanation.contributions.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-36 truncate">{c.feature}</span>
                <div className="flex-1 h-3 bg-shield-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${c.percentage}%`,
                      background: c.direction === "increases" ? "#ff4466" : "#00ff9d",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-300 w-10 text-right">{c.percentage}%</span>
                <span className={`text-xs w-16 ${c.direction === "increases" ? "text-red-400" : "text-green-400"}`}>
                  {c.direction === "increases" ? "↑ risk" : "↓ risk"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}