import { useState, useRef } from 'react'
import { Cpu, Upload, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'
import { predictFailure, predictBulk, type PredictionResult, type PredictionInput } from '../lib/api'

const DEFAULT_INPUT: PredictionInput = {
  machine_id:          'CNC-01',
  machine_type:        'M',
  air_temperature:     300,
  process_temperature: 310,
  rotational_speed:    1500,
  torque:              40,
  tool_wear:           100,
  include_explanation: true,
}

function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
      level === 'Critical' ? 'badge-critical' :
      level === 'High'     ? 'badge-warning'  :
      level === 'Medium'   ? 'badge-info'     : 'badge-normal'
    }`}>{level} Risk</span>
  )
}

function ProbabilityGauge({ value }: { value: number }) {
  const color = value >= 75 ? '#ff4466' : value >= 50 ? '#ffc837' : value >= 25 ? '#00d4ff' : '#00ff9d'
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 80" className="w-48 h-32">
        <path d="M10 75 A55 55 0 0 1 110 75" fill="none" stroke="#1e2f50" strokeWidth="12" strokeLinecap="round" />
        <path d="M10 75 A55 55 0 0 1 110 75" fill="none"
          stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 173} 173`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease' }}
        />
        <text x="60" y="70" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="JetBrains Mono">{value}%</text>
      </svg>
      <span className="text-xs text-slate-400 font-mono">Failure Probability</span>
    </div>
  )
}

function ShapBar({ feature, percentage, direction }: { feature: string; percentage: number; direction: string }) {
  const color = direction === 'increases' ? '#ff4466' : '#00ff9d'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-36 truncate">{feature}</span>
      <div className="flex-1 h-4 bg-shield-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono text-slate-300 w-10 text-right">{percentage}%</span>
      <span className={`text-xs w-16 ${direction === 'increases' ? 'text-red-400' : 'text-green-400'}`}>
        {direction === 'increases' ? '↑ risk' : '↓ risk'}
      </span>
    </div>
  )
}

export default function MachineFail() {
  const [tab,      setTab]      = useState<'manual' | 'bulk'>('manual')
  const [form,     setForm]     = useState(DEFAULT_INPUT)
  const [result,   setResult]   = useState<PredictionResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [bulkRes,  setBulkRes]  = useState<any>(null)
  const [showExpl, setShowExpl] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(key: keyof PredictionInput, val: string | number) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function runPredict() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await predictFailure(form)
      setResult(res)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Backend offline — check the server is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  async function runBulk(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true); setError(''); setBulkRes(null)
    try {
      const res = await predictBulk(file)
      setBulkRes(res)
    } catch (e: any) {
      setError('Bulk upload failed. Ensure backend is running.')
    } finally {
      setLoading(false); if (fileRef.current) fileRef.current.value = ''
    }
  }

  const sliders: { key: keyof PredictionInput; label: string; min: number; max: number; step: number; unit: string }[] = [
    { key: 'air_temperature',     label: 'Air Temperature',     min: 290, max: 320,  step: 0.1, unit: 'K' },
    { key: 'process_temperature', label: 'Process Temperature', min: 300, max: 330,  step: 0.1, unit: 'K' },
    { key: 'rotational_speed',    label: 'Rotational Speed',    min: 500, max: 3000, step: 10,  unit: 'rpm' },
    { key: 'torque',              label: 'Torque',              min: 0,   max: 100,  step: 0.1, unit: 'Nm' },
    { key: 'tool_wear',           label: 'Tool Wear',           min: 0,   max: 250,  step: 1,   unit: 'min' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-shield-accent" /> Machine Failure AI
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">XGBoost + SHAP explainable predictions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['manual', 'bulk'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-shield-accent text-shield-900' : 'glass text-slate-400 hover:text-slate-200'
            }`}>
            {t === 'manual' ? '⚙️ Manual Input' : '📁 Bulk CSV Upload'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* ── Input panel ── */}
        <div className="space-y-4">

          {tab === 'manual' ? (
            <div className="glass p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Machine Parameters</h3>

              {/* Machine ID + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Machine ID</label>
                  <input className="input-field" value={form.machine_id} onChange={e => update('machine_id', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Machine Type</label>
                  <select className="input-field"
                    value={form.machine_type}
                    onChange={e => update('machine_type', e.target.value)}>
                    <option value="L">L — Light</option>
                    <option value="M">M — Medium</option>
                    <option value="H">H — Heavy</option>
                  </select>
                </div>
              </div>

              {/* Sliders */}
              {sliders.map(s => (
                <div key={s.key}>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">{s.label}</label>
                    <span className="text-xs font-mono text-shield-accent">
                      {(form[s.key] as number).toFixed(s.step < 1 ? 1 : 0)} {s.unit}
                    </span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={form[s.key] as number}
                    onChange={e => update(s.key, parseFloat(e.target.value))}
                    className="w-full accent-[#00d4ff] cursor-pointer" />
                  <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                    <span>{s.min}</span><span>{s.max}</span>
                  </div>
                </div>
              ))}

              <button onClick={runPredict} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                Run Prediction
              </button>
            </div>
          ) : (
            <div className="glass p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Bulk CSV Upload</h3>
              <p className="text-xs text-slate-500">
                Upload a CSV with columns: machine_id, Type, Air temperature [K], Process temperature [K],
                Rotational speed [rpm], Torque [Nm], Tool wear [min]
              </p>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-shield-500 rounded-xl p-10 text-center cursor-pointer
                           hover:border-shield-accent/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Click to upload CSV</p>
                <p className="text-xs text-slate-600 mt-1">Max 10 MB</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={runBulk} />

              {loading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-shield-accent" />
                  <span className="text-sm text-slate-400">Processing…</span>
                </div>
              )}

              {bulkRes && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total',    val: bulkRes.summary.total,    color: 'text-white' },
                      { label: 'Failures', val: bulkRes.summary.failures, color: 'text-red-400' },
                      { label: 'Critical', val: bulkRes.summary.critical, color: 'text-red-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-shield-700/50 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold font-mono ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {bulkRes.predictions.slice(0, 20).map((p: PredictionResult, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-shield-700/30 text-xs">
                        <span className="font-mono text-slate-300">{p.machine_id}</span>
                        <span className={p.predicted_failure ? 'text-red-400' : 'text-green-400'}>
                          {p.failure_probability.toFixed(1)}%
                        </span>
                        <span className="text-slate-500">{p.failure_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="glass p-4 border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            </div>
          )}
        </div>

        {/* ── Result panel ── */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Gauge + risk */}
              <div className="glass p-5 flex flex-col items-center gap-4">
                <ProbabilityGauge value={Math.round(result.failure_probability)} />
                <RiskBadge level={result.risk_level} />
                <div className="text-center">
                  <div className={`text-sm font-semibold ${result.predicted_failure ? 'text-red-400' : 'text-green-400'}`}>
                    {result.predicted_failure ? '⚠ Failure Predicted' : '✓ No Failure Detected'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{result.failure_type}</div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="glass p-4 border-shield-accent/20">
                <h4 className="text-xs font-semibold text-shield-accent mb-2 uppercase tracking-wide">Maintenance Recommendation</h4>
                <p className="text-sm text-slate-300">{result.maintenance_recommendation}</p>
              </div>

              {/* SHAP explanation */}
              {result.explanation && (
                <div className="glass p-5">
                  <button
                    onClick={() => setShowExpl(!showExpl)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-white mb-3">
                    <span>Root Cause Analysis (SHAP)</span>
                    {showExpl ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showExpl && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">Feature contributions to failure probability</p>
                      {result.explanation.contributions.map((c, i) => (
                        <ShapBar key={i} feature={c.feature} percentage={c.percentage} direction={c.direction} />
                      ))}
                      <p className="text-xs text-slate-600 mt-2 font-mono">Method: {result.explanation.method}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="glass p-10 flex flex-col items-center justify-center gap-3 h-64 text-center">
              <Cpu className="w-10 h-10 text-slate-600" />
              <p className="text-sm text-slate-500">Configure parameters and run prediction</p>
              <p className="text-xs text-slate-600">XGBoost model with SHAP explanations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
