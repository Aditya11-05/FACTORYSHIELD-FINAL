import { useEffect, useState } from 'react'
import {
  Users, Cpu, AlertTriangle, Shield, TrendingUp,
  TrendingDown, Activity, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Mock data ─────────────────────────────────────────────────────────────────
const incidentTrend = [
  { day: 'Mon', incidents: 4, predicted: 6 },
  { day: 'Tue', incidents: 7, predicted: 5 },
  { day: 'Wed', incidents: 3, predicted: 4 },
  { day: 'Thu', incidents: 8, predicted: 9 },
  { day: 'Fri', incidents: 5, predicted: 7 },
  { day: 'Sat', incidents: 2, predicted: 3 },
  { day: 'Sun', incidents: 6, predicted: 6 },
]

const alertDist = [
  { name: 'Tool Wear',    value: 38, color: '#ff4466' },
  { name: 'Heat',        value: 26, color: '#ffc837' },
  { name: 'Power',       value: 21, color: '#a855f7' },
  { name: 'Overstrain',  value: 15, color: '#00d4ff' },
]

const deptScores = [
  { dept: 'Machining',  score: 87 },
  { dept: 'Assembly',   score: 72 },
  { dept: 'Welding',    score: 91 },
  { dept: 'Packaging',  score: 68 },
  { dept: 'QA',         score: 95 },
]

const recentAlerts = [
  { id: 1, machine: 'CNC-03', type: 'Heat Dissipation', risk: 'Critical', time: '2 min ago' },
  { id: 2, machine: 'CNC-01', type: 'Tool Wear',        risk: 'Warning',  time: '14 min ago' },
  { id: 3, machine: 'CNC-04', type: 'Power Failure',    risk: 'Warning',  time: '31 min ago' },
  { id: 4, machine: 'CNC-07', type: 'Overstrain',       risk: 'High',     time: '1 hr ago' },
]

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: string | number; sub: string;
  color: string; trend?: 'up' | 'down'
}) {
  return (
    <div className="glass glass-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend === 'up' ? 'text-red-400' : 'text-shield-green'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend === 'up' ? '+12%' : '-8%'}
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      <div className="text-sm font-medium text-slate-300 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}

function RiskBadge({ level }: { level: string }) {
  const cls =
    level === 'Critical' ? 'badge-critical' :
    level === 'Warning'  ? 'badge-warning'  :
    level === 'High'     ? 'badge-warning'  : 'badge-normal'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{level}</span>
  )
}

export default function DashboardPage() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Operations Overview</h1>
          <p className="text-sm text-slate-500">Real-time factory health dashboard</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-shield-accent">{time.toLocaleTimeString()}</div>
          <div className="text-xs text-slate-500">Live</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users}         label="Active Workers"   value={142}   sub="On shift now"         color="bg-blue-500/15 text-blue-400"  />
        <KpiCard icon={AlertTriangle} label="Active Alerts"    value={7}     sub="3 critical"           color="bg-red-500/15 text-red-400"    trend="up" />
        <KpiCard icon={Cpu}           label="Machines Online"  value="48/52" sub="4 under maintenance"  color="bg-purple-500/15 text-purple-400" />
        <KpiCard icon={Shield}        label="Safety Score"     value="84%"   sub="+2% vs last week"     color="bg-green-500/15 text-green-400" trend="down" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Incident trend */}
        <div className="col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Safety Incidents — 7 Days</h3>
              <p className="text-xs text-slate-500">Actual vs AI Predicted</p>
            </div>
            <Activity className="w-4 h-4 text-shield-accent" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={incidentTrend}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff4466" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff4466" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="incidents"  stroke="#ff4466" fill="url(#grad1)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="predicted"  stroke="#00d4ff" fill="url(#grad2)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-0.5 bg-red-400 inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-0.5 bg-shield-accent inline-block border-dashed border-b" /> Predicted
            </span>
          </div>
        </div>

        {/* Alert distribution */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Alert Distribution</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={alertDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                dataKey="value" strokeWidth={0}>
                {alertDist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {alertDist.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-400">{d.name}</span>
                </span>
                <span className="text-slate-300 font-mono">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Dept safety scores */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Dept Safety Scores</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deptScores} layout="vertical" barSize={10}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {deptScores.map((d, i) => (
                  <Cell key={i} fill={d.score >= 85 ? '#00ff9d' : d.score >= 70 ? '#ffc837' : '#ff4466'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent alerts */}
        <div className="col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Alerts</h3>
            <Zap className="w-4 h-4 text-shield-yellow" />
          </div>
          <div className="space-y-2.5">
            {recentAlerts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-shield-700/50 border border-shield-600/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    a.risk === 'Critical' ? 'bg-red-400 animate-pulse' :
                    a.risk === 'Warning'  ? 'bg-yellow-400' : 'bg-orange-400'
                  }`} />
                  <div>
                    <span className="text-sm font-medium text-white">{a.machine}</span>
                    <span className="text-xs text-slate-500 ml-2">{a.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={a.risk} />
                  <span className="text-xs text-slate-500">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
