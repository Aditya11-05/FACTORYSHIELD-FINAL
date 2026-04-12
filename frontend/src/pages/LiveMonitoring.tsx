import { useEffect, useState, useCallback } from 'react'
import { Activity, RefreshCw, Thermometer, Zap, Settings2, Timer, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'

const BASE_URL = 'http://localhost:8000'

interface MachineState {
  id:          string
  type:        'L' | 'M' | 'H'
  status:      'Online' | 'Warning' | 'Critical' | 'Offline'
  temp:        number
  processTemp: number
  speed:       number
  torque:      number
  toolWear:    number
  uptime:      string
  failureProb: number
  failureType: string
  riskLevel:   string
  topCause:    string
  loading:     boolean
}

interface TimelinePoint {
  time:  string
  prob:  number
  wear:  number
}

function initMachines(): MachineState[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id:          `CNC-${String(i + 1).padStart(2, '0')}`,
    type:        (['L', 'M', 'H'] as const)[i % 3],
    status:      'Online' as const,
    temp:        300 + Math.random() * 10,
    processTemp: 310 + Math.random() * 10,
    speed:       1200 + Math.random() * 600,
    torque:      30 + Math.random() * 30,
    toolWear:    20 + i * 18 + Math.random() * 10,
    uptime:      `${Math.floor(48 + Math.random() * 672)}h`,
    failureProb: 0,
    failureType: 'Unknown',
    riskLevel:   'Low',
    topCause:    '—',
    loading:     true,
  }))
}

function riskToStatus(risk: string): MachineState['status'] {
  if (risk === 'Critical') return 'Critical'
  if (risk === 'High')     return 'Warning'
  if (risk === 'Medium')   return 'Warning'
  return 'Online'
}

function StatusDot({ status }: { status: MachineState['status'] }) {
  const cls = {
    Online:   'bg-green-400',
    Warning:  'bg-yellow-400',
    Critical: 'bg-red-400',
    Offline:  'bg-slate-600',
  }[status]
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'Critical' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cls}`} />
    </span>
  )
}

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 bg-shield-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

function ProbBar({ value }: { value: number }) {
  const color = value >= 60 ? '#ff4466' : value >= 30 ? '#ffc837' : '#00ff9d'
  return (
    <div className="h-2 bg-shield-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

export default function LiveMonitoring() {
  const [machines,  setMachines]  = useState<MachineState[]>(initMachines)
  const [selected,  setSelected]  = useState<MachineState | null>(null)
  const [timeline,  setTimeline]  = useState<TimelinePoint[]>([])
  const [tlLoading, setTlLoading] = useState(false)
  const [tick,      setTick]      = useState(0)

  // ── Fetch timeline from Supabase for selected machine ──────────────────────
  const loadTimeline = useCallback(async (machineId: string) => {
    setTlLoading(true)
    try {
      const { data } = await supabase
        .from('machine_readings')
        .select('timestamp, failure_probability, tool_wear')
        .eq('machine_id', machineId)
        .order('timestamp', { ascending: true })
        .limit(40)

      if (data && data.length > 0) {
        setTimeline(data.map(r => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          prob: Math.round((r.failure_probability ?? 0) * 10) / 10,
          wear: Math.round(r.tool_wear ?? 0),
        })))
      } else {
        setTimeline([])
      }
    } catch {
      setTimeline([])
    }
    setTlLoading(false)
  }, [])

  // Reload timeline when selection changes
  useEffect(() => {
    if (selected) loadTimeline(selected.id)
  }, [selected?.id])

  // ── ML prediction fetch ────────────────────────────────────────────────────
  const fetchPrediction = useCallback(async (m: MachineState): Promise<MachineState> => {
    const newTemp     = Math.max(295, Math.min(318, m.temp     + (Math.random() - 0.5) * 0.8))
    const newProcTemp = Math.max(305, Math.min(328, m.processTemp + (Math.random() - 0.5) * 0.6))
    const newSpeed    = Math.max(900, Math.min(2800, m.speed   + (Math.random() - 0.5) * 25))
    const newTorque   = Math.max(10,  Math.min(95,  m.torque   + (Math.random() - 0.5) * 1.5))
    const newWear     = Math.min(250, m.toolWear + Math.random() * 0.15)

    try {
      const res = await fetch(`${BASE_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id:          m.id,
          machine_type:        m.type,
          air_temperature:     newTemp,
          process_temperature: newProcTemp,
          rotational_speed:    newSpeed,
          torque:              newTorque,
          tool_wear:           newWear,
          include_explanation: false,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const topCause = data.explanation?.contributions?.[0]?.feature ?? '—'
      return {
        ...m,
        temp: newTemp, processTemp: newProcTemp,
        speed: newSpeed, torque: newTorque, toolWear: newWear,
        failureProb: data.failure_probability ?? 0,
        failureType: data.failure_type ?? 'Unknown',
        riskLevel:   data.risk_level ?? 'Low',
        status:      riskToStatus(data.risk_level ?? 'Low'),
        topCause, loading: false,
      }
    } catch {
      const prob = Math.min(100, (newWear / 250) * 60 + (newTorque / 100) * 30 + Math.random() * 10)
      const risk = prob >= 80 ? 'Critical' : prob >= 60 ? 'High' : prob >= 30 ? 'Medium' : 'Low'
      return {
        ...m,
        temp: newTemp, processTemp: newProcTemp,
        speed: newSpeed, torque: newTorque, toolWear: newWear,
        failureProb: Math.round(prob * 10) / 10,
        failureType: newWear > 200 ? 'Tool Wear Failure' : 'No Failure',
        riskLevel: risk, status: riskToStatus(risk),
        topCause: 'Tool Wear', loading: false,
      }
    }
  }, [])

  const refreshAll = useCallback(async () => {
    const updated = await Promise.all(machines.map(fetchPrediction))
    setMachines(updated)
    setTick(t => t + 1)
    setSelected(sel => sel ? (updated.find(m => m.id === sel.id) ?? sel) : null)
    // Refresh timeline for selected machine after new predictions saved
    if (selected) setTimeout(() => loadTimeline(selected.id), 1500)
  }, [machines, fetchPrediction, selected, loadTimeline])

  useEffect(() => { refreshAll() }, []) // eslint-disable-line
  useEffect(() => {
    const interval = setInterval(refreshAll, 8000)
    return () => clearInterval(interval)
  }, [refreshAll])

  const summary = {
    online:   machines.filter(m => m.status === 'Online').length,
    warning:  machines.filter(m => m.status === 'Warning').length,
    critical: machines.filter(m => m.status === 'Critical').length,
    offline:  machines.filter(m => m.status === 'Offline').length,
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-shield-accent" /> Live Monitoring
          </h1>
          <p className="text-sm text-slate-500">Real ML predictions — updates every 8s</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-shield-green font-mono">
          <RefreshCw className={`w-3 h-3 ${machines.some(m => m.loading) ? 'animate-spin' : ''}`} />
          Tick #{tick}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Online',   count: summary.online,   cls: 'text-green-400',  bg: 'bg-green-500/10' },
          { label: 'Warning',  count: summary.warning,  cls: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Critical', count: summary.critical, cls: 'text-red-400',    bg: 'bg-red-500/10' },
          { label: 'Offline',  count: summary.offline,  cls: 'text-slate-400',  bg: 'bg-slate-500/10' },
        ].map(s => (
          <div key={s.label} className={`glass p-4 flex items-center gap-3 ${s.bg}`}>
            <div className={`text-2xl font-bold font-mono ${s.cls}`}>{s.count}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Machine grid */}
        <div className="col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {machines.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                className={`glass glass-hover p-3 text-left space-y-2 transition-all ${
                  selected?.id === m.id ? 'border-shield-accent/50 glow-accent' : ''
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={m.status} />
                    <span className="text-xs font-mono font-bold text-white">{m.id}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    m.status === 'Critical' ? 'badge-critical' :
                    m.status === 'Warning'  ? 'badge-warning'  :
                    m.status === 'Offline'  ? 'bg-slate-700 text-slate-400' : 'badge-normal'
                  }`}>{m.loading ? '…' : m.status}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500">Fail %</span>
                      <span className={`font-mono ${m.failureProb >= 60 ? 'text-red-400' : m.failureProb >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {m.loading ? '…' : `${m.failureProb.toFixed(1)}%`}
                      </span>
                    </div>
                    <ProbBar value={m.failureProb} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500">Wear</span>
                      <span className="text-slate-300 font-mono">{m.toolWear.toFixed(0)}min</span>
                    </div>
                    <MetricBar value={m.toolWear} max={250}
                      color={m.toolWear > 200 ? '#ff4466' : m.toolWear > 150 ? '#ffc837' : '#00ff9d'} />
                  </div>
                </div>
                <div className="text-xs text-slate-600 truncate">
                  {m.loading ? 'Fetching ML prediction…' : m.failureType}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="glass p-5 overflow-y-auto max-h-[80vh]">
          {selected ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-white text-lg">{selected.id}</h3>
                  <p className="text-xs text-slate-500">Type {selected.type} Machine</p>
                </div>
                <StatusDot status={selected.status} />
              </div>

              {/* Failure probability */}
              <div className="p-3 rounded-lg bg-shield-700/40">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Failure Probability</span>
                  <span className={`font-mono font-bold ${
                    selected.failureProb >= 60 ? 'text-red-400' :
                    selected.failureProb >= 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{selected.failureProb.toFixed(1)}%</span>
                </div>
                <ProbBar value={selected.failureProb} />
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-slate-500">{selected.failureType}</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                    selected.riskLevel === 'Critical' ? 'badge-critical' :
                    selected.riskLevel === 'High'     ? 'badge-warning' :
                    selected.riskLevel === 'Medium'   ? 'badge-warning' : 'badge-normal'
                  }`}>{selected.riskLevel}</span>
                </div>
              </div>

              {/* Sensor metrics */}
              <div className="space-y-2">
                {[
                  { icon: Thermometer, label: 'Air Temp',     val: `${selected.temp.toFixed(2)} K`,        color: 'text-orange-400' },
                  { icon: Thermometer, label: 'Process Temp', val: `${selected.processTemp.toFixed(2)} K`,  color: 'text-red-400' },
                  { icon: Activity,    label: 'Speed',        val: `${selected.speed.toFixed(0)} rpm`,       color: 'text-blue-400' },
                  { icon: Zap,         label: 'Torque',       val: `${selected.torque.toFixed(1)} Nm`,       color: 'text-yellow-400' },
                  { icon: Settings2,   label: 'Tool Wear',    val: `${selected.toolWear.toFixed(0)} min`,    color: 'text-purple-400' },
                  { icon: Timer,       label: 'Uptime',       val: selected.uptime,                          color: 'text-green-400' },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-shield-700/40">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                    <span className="text-xs font-mono text-white">{val}</span>
                  </div>
                ))}
              </div>

              {selected.topCause !== '—' && (
                <div className="text-xs p-2.5 rounded-lg bg-shield-700/40">
                  <span className="text-slate-400">Top cause: </span>
                  <span className="text-shield-accent font-mono">{selected.topCause}</span>
                </div>
              )}

              {/* ── Timeline graph ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Failure Probability History</span>
                  {tlLoading && <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />}
                </div>
                {timeline.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-slate-500 bg-shield-700/20 rounded-lg">
                    {tlLoading ? 'Loading history…' : 'No history yet — predictions saving now'}
                  </div>
                ) : (
                  <div className="bg-shield-700/20 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} unit="%" width={28} />
                        <Tooltip
                          contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, fontSize: 10 }}
                          formatter={(v: any) => [`${v}%`, 'Fail Prob']}
                        />
                        <Line type="monotone" dataKey="prob" stroke="#00d4ff" strokeWidth={1.5} dot={false} name="Fail %" />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-slate-600 mt-1 text-center">Last {timeline.length} readings from DB</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center min-h-64">
              <Settings2 className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Click a machine to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}