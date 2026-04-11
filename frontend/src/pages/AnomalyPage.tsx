import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import { getAnomalies, type AnomalyResult } from '../lib/api'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

// Fallback mock data when backend is offline
const MOCK_MACHINES: AnomalyResult[] = [
  { machine_id: 'CNC-01', anomaly_score: 72.4, is_anomaly: true,  status: 'Warning',  last_checked: new Date().toISOString(), recommendation: 'Schedule maintenance within 48h.' },
  { machine_id: 'CNC-02', anomaly_score: 18.1, is_anomaly: false, status: 'Normal',   last_checked: new Date().toISOString(), recommendation: 'Operating normally.' },
  { machine_id: 'CNC-03', anomaly_score: 88.5, is_anomaly: true,  status: 'Critical', last_checked: new Date().toISOString(), recommendation: 'Immediate inspection required.' },
  { machine_id: 'CNC-04', anomaly_score: 65.2, is_anomaly: true,  status: 'Warning',  last_checked: new Date().toISOString(), recommendation: 'Schedule maintenance within 48h.' },
  { machine_id: 'CNC-05', anomaly_score: 22.0, is_anomaly: false, status: 'Normal',   last_checked: new Date().toISOString(), recommendation: 'Operating normally.' },
  { machine_id: 'CNC-06', anomaly_score: 91.3, is_anomaly: true,  status: 'Critical', last_checked: new Date().toISOString(), recommendation: 'Immediate inspection required.' },
  { machine_id: 'CNC-07', anomaly_score: 44.7, is_anomaly: false, status: 'Normal',   last_checked: new Date().toISOString(), recommendation: 'Monitor closely.' },
  { machine_id: 'CNC-08', anomaly_score: 57.9, is_anomaly: true,  status: 'Warning',  last_checked: new Date().toISOString(), recommendation: 'Schedule maintenance within 48h.' },
  { machine_id: 'CNC-09', anomaly_score: 12.3, is_anomaly: false, status: 'Normal',   last_checked: new Date().toISOString(), recommendation: 'Operating normally.' },
  { machine_id: 'CNC-10', anomaly_score: 83.6, is_anomaly: true,  status: 'Critical', last_checked: new Date().toISOString(), recommendation: 'Immediate inspection required.' },
  { machine_id: 'CNC-11', anomaly_score: 33.4, is_anomaly: false, status: 'Normal',   last_checked: new Date().toISOString(), recommendation: 'Operating normally.' },
  { machine_id: 'CNC-12', anomaly_score: 76.8, is_anomaly: true,  status: 'Warning',  last_checked: new Date().toISOString(), recommendation: 'Schedule maintenance within 48h.' },
]

function AnomalyBar({ score, status }: { score: number; status: string }) {
  const color = status === 'Critical' ? '#ff4466' : status === 'Warning' ? '#ffc837' : '#00ff9d'
  return (
    <div className="w-full h-2 bg-shield-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

export default function AnomalyPage() {
  const [machines, setMachines] = useState<AnomalyResult[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'All' | 'Critical' | 'Warning' | 'Normal'>('All')

  async function load() {
    setLoading(true)
    try {
      const data = await getAnomalies()
      setMachines(data.machines)
    } catch {
      setMachines(MOCK_MACHINES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'All' ? machines : machines.filter(m => m.status === filter)
  const critical = machines.filter(m => m.status === 'Critical').length
  const warning  = machines.filter(m => m.status === 'Warning').length
  const normal   = machines.filter(m => m.status === 'Normal').length

  // Radar chart data (top anomalous machines)
  const radarData = machines
    .sort((a, b) => b.anomaly_score - a.anomaly_score)
    .slice(0, 6)
    .map(m => ({ machine: m.machine_id, score: m.anomaly_score }))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-shield-yellow" /> Anomaly Detection
          </h1>
          <p className="text-sm text-slate-500">Isolation Forest — fleet-wide anomaly scores</p>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical', count: critical, color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
          { label: 'Warning',  count: warning,  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
          { label: 'Normal',   count: normal,   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
        ].map(s => (
          <div key={s.label} className={`glass p-4 border ${s.border} ${s.bg}`}>
            <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</div>
            <div className="text-sm text-slate-400 mt-0.5">{s.label} Machines</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* Machine list */}
        <div className="col-span-2 space-y-3">

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['All', 'Critical', 'Warning', 'Normal'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? 'bg-shield-accent text-shield-900' : 'glass text-slate-400 hover:text-slate-200'
                }`}>{f}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-shield-accent" />
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(m => (
                <div key={m.machine_id} className="glass glass-hover p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        m.status === 'Critical' ? 'bg-red-400 animate-pulse' :
                        m.status === 'Warning'  ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                      <span className="font-mono font-bold text-white">{m.machine_id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white">
                        {m.anomaly_score.toFixed(1)}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.status === 'Critical' ? 'badge-critical' :
                        m.status === 'Warning'  ? 'badge-warning'  : 'badge-normal'
                      }`}>{m.status}</span>
                    </div>
                  </div>
                  <AnomalyBar score={m.anomaly_score} status={m.status} />
                  <p className="text-xs text-slate-500 mt-2">{m.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Radar chart */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Top 6 Anomalous</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="machine" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Radar name="Anomaly Score" dataKey="score" stroke="#ff4466" fill="#ff4466" fillOpacity={0.2} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {radarData.map(m => (
              <div key={m.machine} className="flex justify-between text-xs">
                <span className="text-slate-400 font-mono">{m.machine}</span>
                <span className={`font-mono font-medium ${m.score > 80 ? 'text-red-400' : m.score > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {m.score.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
