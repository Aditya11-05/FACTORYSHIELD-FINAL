import { BarChart3, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from 'recharts'

const monthlyFailures = [
  { month: 'Aug', twf: 12, hdf: 8,  pwf: 5,  osf: 3  },
  { month: 'Sep', twf: 15, hdf: 6,  pwf: 7,  osf: 4  },
  { month: 'Oct', twf: 10, hdf: 11, pwf: 4,  osf: 2  },
  { month: 'Nov', twf: 18, hdf: 9,  pwf: 8,  osf: 6  },
  { month: 'Dec', twf: 14, hdf: 7,  pwf: 6,  osf: 3  },
  { month: 'Jan', twf: 9,  hdf: 12, pwf: 3,  osf: 5  },
]

const mtbf = [
  { machine: 'CNC-01', mtbf: 240, mttr: 4.2 },
  { machine: 'CNC-02', mtbf: 380, mttr: 2.1 },
  { machine: 'CNC-03', mtbf: 120, mttr: 6.5 },
  { machine: 'CNC-04', mtbf: 290, mttr: 3.8 },
  { machine: 'CNC-05', mtbf: 410, mttr: 1.9 },
  { machine: 'CNC-06', mtbf: 95,  mttr: 7.2 },
]

const torqueScatter = Array.from({ length: 40 }, (_, i) => ({
  torque:    20 + Math.random() * 70,
  toolWear:  Math.random() * 250,
  failure:   Math.random() > 0.7 ? 1 : 0,
}))

const efficiencyTrend = Array.from({ length: 14 }, (_, i) => ({
  day:        `D-${14 - i}`,
  efficiency: 70 + Math.random() * 25,
  target:     90,
}))

const COLORS = ['#ff4466', '#00d4ff', '#ffc837', '#a855f7', '#00ff9d']

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-shield-accent" /> Analytics
        </h1>
        <p className="text-sm text-slate-500">Historical trends, MTBF, and predictive accuracy</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Prediction Accuracy', value: '94.2%', trend: '+1.3%', color: 'text-green-400' },
          { label: 'Avg MTBF',            value: '256h',  trend: '+18h',  color: 'text-blue-400' },
          { label: 'Avg MTTR',            value: '4.3h',  trend: '-0.5h', color: 'text-yellow-400' },
          { label: 'Cost Saved (Est.)',   value: '$48K',  trend: '+12%',  color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass p-4">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            <div className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {s.trend} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Failure type chart + Scatter */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Failure Types — 6 Months</h3>
          <p className="text-xs text-slate-500 mb-4">Stacked by failure category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyFailures}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="twf" stackId="a" fill="#ff4466" name="Tool Wear" />
              <Bar dataKey="hdf" stackId="a" fill="#ffc837" name="Heat" />
              <Bar dataKey="pwf" stackId="a" fill="#a855f7" name="Power" />
              <Bar dataKey="osf" stackId="a" fill="#00d4ff" name="Overstrain" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Torque vs Tool Wear</h3>
          <p className="text-xs text-slate-500 mb-4">Failure correlation scatter plot</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="torque"   name="Torque"    unit=" Nm"  tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="toolWear" name="Tool Wear" unit=" min" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={torqueScatter} name="Readings">
                {torqueScatter.map((d, i) => (
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
        </div>
      </div>

      {/* MTBF bar + Efficiency trend */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">MTBF by Machine (hours)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mtbf} barSize={22}>
              <XAxis dataKey="machine" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="mtbf" radius={[4, 4, 0, 0]} name="MTBF (h)">
                {mtbf.map((d, i) => (
                  <Cell key={i} fill={d.mtbf < 150 ? '#ff4466' : d.mtbf < 300 ? '#ffc837' : '#00ff9d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Overall Equipment Efficiency</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={efficiencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="efficiency" stroke="#00d4ff" strokeWidth={2} dot={false} name="OEE %" />
              <Line type="monotone" dataKey="target"     stroke="#00ff9d" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
