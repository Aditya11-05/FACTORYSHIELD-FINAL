import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts'
import { supabase } from '../supabaseClient'

const COLORS = ['#ff4466', '#ffc837', '#a855f7', '#00d4ff', '#00ff9d']

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">{message}</div>
  )
}

export default function AnalyticsPage() {
  const [loading, setLoading]             = useState(true)
  const [failureTypes, setFailureTypes]   = useState<any[]>([])
  const [scatterData, setScatterData]     = useState<any[]>([])
  const [machineAvg, setMachineAvg]       = useState<any[]>([])
  const [effTrend, setEffTrend]           = useState<any[]>([])
  const [stats, setStats]                 = useState({ total: 0, critical: 0, avgProb: 0, saved: 0 })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Fetch last 500 readings
      const { data, error } = await supabase
        .from('machine_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (error || !data || data.length === 0) {
        setLoading(false)
        return
      }

      // ── Top stats ──────────────────────────────────────────────────────────
      const total    = data.length
      const critical = data.filter(r => r.risk_level === 'Critical').length
      const avgProb  = data.reduce((s, r) => s + (r.failure_probability ?? 0), 0) / total
      const saved    = Math.round(critical * 2400 / 1000)
      setStats({ total, critical, avgProb: Math.round(avgProb * 10) / 10, saved })

      // ── Failure types by month ─────────────────────────────────────────────
      const byMonth: Record<string, any> = {}
      data.forEach(r => {
        const month = new Date(r.timestamp).toLocaleString('default', { month: 'short' })
        if (!byMonth[month]) byMonth[month] = { month, twf: 0, hdf: 0, pwf: 0, osf: 0, rnf: 0 }
        if (r.failure_type === 'Tool Wear Failure')        byMonth[month].twf++
        else if (r.failure_type === 'Heat Dissipation Failure') byMonth[month].hdf++
        else if (r.failure_type === 'Power Failure')       byMonth[month].pwf++
        else if (r.failure_type === 'Overstrain Failure')  byMonth[month].osf++
        else if (r.failure_type === 'Random Failure')      byMonth[month].rnf++
      })
      setFailureTypes(Object.values(byMonth).slice(-6))

      // ── Scatter: torque vs tool wear ───────────────────────────────────────
      setScatterData(
        data.slice(0, 120).map(r => ({
          torque:   Math.round((r.torque ?? 0) * 10) / 10,
          toolWear: Math.round(r.tool_wear ?? 0),
          failure:  r.predicted_failure ? 1 : 0,
        }))
      )

      // ── Avg failure prob per machine ───────────────────────────────────────
      const byMachine: Record<string, { sum: number; count: number }> = {}
      data.forEach(r => {
        if (!byMachine[r.machine_id]) byMachine[r.machine_id] = { sum: 0, count: 0 }
        byMachine[r.machine_id].sum   += r.failure_probability ?? 0
        byMachine[r.machine_id].count += 1
      })
      setMachineAvg(
        Object.entries(byMachine)
          .map(([machine, { sum, count }]) => ({
            machine,
            avgProb: Math.round(sum / count * 10) / 10,
          }))
          .sort((a, b) => a.machine.localeCompare(b.machine))
          .slice(0, 12)
      )

      // ── Efficiency trend — last 14 days ───────────────────────────────────
      const byDay: Record<string, { sum: number; count: number }> = {}
      data.forEach(r => {
        const day = new Date(r.timestamp).toLocaleDateString('default', { month: 'short', day: 'numeric' })
        if (!byDay[day]) byDay[day] = { sum: 0, count: 0 }
        byDay[day].sum   += 100 - (r.failure_probability ?? 0)
        byDay[day].count += 1
      })
      setEffTrend(
        Object.entries(byDay)
          .map(([day, { sum, count }]) => ({
            day,
            efficiency: Math.round(sum / count * 10) / 10,
            target: 90,
          }))
          .slice(-14)
      )

    } catch (e) {
      console.error('Analytics load error:', e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-shield-accent" /> Analytics
          </h1>
          <p className="text-sm text-slate-500">Live data from Supabase machine_readings</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 text-xs text-shield-accent border border-shield-accent/30 px-3 py-1.5 rounded-lg hover:bg-shield-accent/10 transition-all">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Readings',      value: stats.total.toString(),         color: 'text-blue-400' },
          { label: 'Critical Alerts',     value: stats.critical.toString(),      color: 'text-red-400' },
          { label: 'Avg Failure Prob',    value: `${stats.avgProb}%`,            color: 'text-yellow-400' },
          { label: 'Est. Cost Saved',     value: `$${stats.saved}K`,            color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass p-4">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>
              {loading ? '…' : s.value}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            <div className="text-xs text-shield-accent mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live from DB
            </div>
          </div>
        ))}
      </div>

      {/* Failure types + Scatter */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Failure Types by Month</h3>
          <p className="text-xs text-slate-500 mb-4">Stacked by failure category — live data</p>
          {failureTypes.length === 0
            ? <EmptyState message="No failure data yet — predictions will appear here" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={failureTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="twf" stackId="a" fill="#ff4466" name="Tool Wear" />
                  <Bar dataKey="hdf" stackId="a" fill="#ffc837" name="Heat" />
                  <Bar dataKey="pwf" stackId="a" fill="#a855f7" name="Power" />
                  <Bar dataKey="osf" stackId="a" fill="#00d4ff" name="Overstrain" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Torque vs Tool Wear</h3>
          <p className="text-xs text-slate-500 mb-4">Real readings — failure correlation</p>
          {scatterData.length === 0
            ? <EmptyState message="No scatter data yet" />
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="torque"   name="Torque"    unit=" Nm"  tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="toolWear" name="Tool Wear" unit=" min" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} />
                    <Scatter data={scatterData} name="Readings">
                      {scatterData.map((d, i) => (
                        <Cell key={i} fill={d.failure ? '#ff4466' : '#00ff9d'} fillOpacity={0.7} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Failure
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-green-400" /> Normal
                  </span>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Avg prob per machine + Efficiency trend */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Avg Failure Probability by Machine</h3>
          {machineAvg.length === 0
            ? <EmptyState message="No machine data yet" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={machineAvg} barSize={22}>
                  <XAxis dataKey="machine" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`${v}%`, 'Avg Fail Prob']}
                  />
                  <Bar dataKey="avgProb" radius={[4,4,0,0]} name="Avg Fail %">
                    {machineAvg.map((d, i) => (
                      <Cell key={i} fill={d.avgProb > 60 ? '#ff4466' : d.avgProb > 30 ? '#ffc837' : '#00ff9d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Equipment Health Trend (14 days)</h3>
          {effTrend.length === 0
            ? <EmptyState message="Trend data will appear after a few days of predictions" />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={effTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="efficiency" stroke="#00d4ff" strokeWidth={2} dot={false} name="Health %" />
                  <Line type="monotone" dataKey="target"     stroke="#00ff9d" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Target" />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </div>
  )
}