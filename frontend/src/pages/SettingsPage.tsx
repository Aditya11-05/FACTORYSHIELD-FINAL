import { useState } from 'react'
import { Settings, Bell, Shield, Database, Cpu, Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    critical: true, warning: true, email: false, sms: false,
  })
  const [showKeys, setShowKeys] = useState(false)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-shield-accent" /> Settings
        </h1>
        <p className="text-sm text-slate-500">Configure FactoryShield platform</p>
      </div>

      {/* Notifications */}
      <div className="glass p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-shield-yellow" /> Alert Notifications
        </h3>
        {[
          { key: 'critical', label: 'Critical alerts',        sub: 'Immediate failures and shutdowns' },
          { key: 'warning',  label: 'Warning alerts',         sub: 'Machines approaching failure thresholds' },
          { key: 'email',    label: 'Email notifications',    sub: 'Receive alerts by email' },
          { key: 'sms',      label: 'SMS notifications',      sub: 'Receive alerts via text message' },
        ].map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-shield-600/30 last:border-0">
            <div>
              <div className="text-sm text-slate-300">{label}</div>
              <div className="text-xs text-slate-500">{sub}</div>
            </div>
            <button
              onClick={() => setNotifications(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                notifications[key as keyof typeof notifications] ? 'bg-shield-accent' : 'bg-shield-500'
              }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Model thresholds */}
      <div className="glass p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-shield-accent" /> Prediction Thresholds
        </h3>
        {[
          { label: 'Failure Probability Alert (%)', default: 50, min: 10, max: 90 },
          { label: 'Anomaly Score Alert (%)',       default: 60, min: 20, max: 95 },
          { label: 'Tool Wear Limit (min)',         default: 200, min: 100, max: 250 },
        ].map(t => (
          <div key={t.label}>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-slate-400">{t.label}</label>
              <span className="text-xs font-mono text-shield-accent">{t.default}</span>
            </div>
            <input type="range" min={t.min} max={t.max} defaultValue={t.default}
              className="w-full accent-[#00d4ff]" />
          </div>
        ))}
      </div>

      {/* API keys */}
      <div className="glass p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-shield-green" /> API Configuration
        </h3>
        <p className="text-xs text-slate-500">
          Set these in your backend <code className="font-mono text-shield-accent bg-shield-700 px-1 py-0.5 rounded">.env</code> file.
          Configure in <code className="font-mono text-shield-accent bg-shield-700 px-1 py-0.5 rounded">backend/.env</code>
        </p>
        {[
          { label: 'OpenAI API Key',      placeholder: 'sk-...',   env: 'OPENAI_API_KEY' },
          { label: 'Groq API Key',        placeholder: 'gsk_...',  env: 'GROQ_API_KEY' },
          { label: 'Supabase URL',        placeholder: 'https://...', env: 'VITE_SUPABASE_URL' },
          { label: 'Supabase Anon Key',   placeholder: 'eyJ...', env: 'VITE_SUPABASE_ANON_KEY' },
        ].map(k => (
          <div key={k.label}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">{k.label}</label>
              <code className="text-xs font-mono text-slate-600">{k.env}</code>
            </div>
            <div className="relative">
              <input type={showKeys ? 'text' : 'password'}
                placeholder={k.placeholder}
                className="input-field pr-10 font-mono text-xs" />
              <button onClick={() => setShowKeys(!showKeys)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Database */}
      <div className="glass p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" /> Database
        </h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm text-slate-300">Supabase Connection</div>
            <div className="text-xs text-slate-500">PostgreSQL + Auth</div>
          </div>
          <span className="badge-warning px-2 py-0.5 rounded-full text-xs">Not Configured</span>
        </div>
        <p className="text-xs text-slate-600">
          Create a project at <span className="text-shield-accent">supabase.com</span>, copy your URL and anon key above, then restart the frontend.
        </p>
      </div>

      <button onClick={save}
        className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
