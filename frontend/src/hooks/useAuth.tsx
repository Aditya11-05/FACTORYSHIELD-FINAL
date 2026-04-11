import React, { createContext, useContext, useEffect, useState } from 'react'

const DEMO_KEY = 'factoryshield_demo'

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@factoryshield.ai',
  user_metadata: { full_name: 'Demo Engineer' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

interface AuthCtx {
  user: any | null
  session: any | null
  loading: boolean
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  enterDemo: () => void
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo,  setIsDemo]  = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(DEMO_KEY) === '1') {
      setUser(DEMO_USER)
      setIsDemo(true)
      setLoading(false)
      return
    }
    try {
      import('../supabaseClient').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data }: any) => {
          setSession(data.session)
          setUser(data.session?.user ?? null)
          setLoading(false)
        }).catch(() => setLoading(false))
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, s: any) => {
          setSession(s); setUser(s?.user ?? null)
        })
        return () => subscription.unsubscribe()
      })
    } catch {
      setLoading(false)
    }
  }, [])

  function enterDemo() {
    sessionStorage.setItem(DEMO_KEY, '1')
    setUser(DEMO_USER)
    setIsDemo(true)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    try {
      const { supabase } = await import('../supabaseClient')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    } catch {
      return { error: 'Supabase not configured. Use Demo mode.' }
    }
  }

  async function signUp(email: string, password: string, name: string) {
    try {
      const { supabase } = await import('../supabaseClient')
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      return { error: error?.message ?? null }
    } catch {
      return { error: 'Supabase not configured. Use Demo mode.' }
    }
  }

  async function signOut() {
    sessionStorage.removeItem(DEMO_KEY)
    setIsDemo(false)
    setUser(null)
    try {
      const { supabase } = await import('../supabaseClient')
      await supabase.auth.signOut()
    } catch { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemo, signIn, signUp, signOut, enterDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
