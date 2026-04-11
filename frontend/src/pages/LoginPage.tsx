import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Shield, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'

export default function LoginPage() {
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState('')

  const { signIn, signUp, enterDemo } = useAuth()
  const navigate = useNavigate()

  function demoLogin() {
    enterDemo()
    navigate('/')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password)
        if (err) { setError(err); return }
        navigate('/')
      } else {
        const { error: err } = await signUp(email, password, name)
        if (err) { setError(err); return }
        setSuccess('Account created! Check your email to confirm.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="scanner-line" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-shield-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-shield-accent/10 border border-shield-accent/30 mb-4 glow-accent">
            <Shield className="w-8 h-8 text-shield-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">FactoryShield</h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">AI Predictive Maintenance Platform</p>
        </div>

        <div className="glass p-8">
          <div className="flex rounded-lg overflow-hidden border border-shield-500 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-shield-accent text-shield-900 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="John Engineer" required className="input-field pl-9" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="engineer@factory.com" required className="input-field pl-9" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6} className="input-field pl-9 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error   && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">{success}</p>}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-shield-500" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-xs text-slate-500 bg-shield-800">or</span></div>
          </div>

          <button onClick={demoLogin}
            className="btn-secondary w-full flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-shield-accent" />
            Continue as Demo User
          </button>
          <p className="text-xs text-center text-slate-600 mt-4">Demo mode uses mock data. No Supabase required.</p>
        </div>
      </div>
    </div>
  )
}
