import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Activity, Cpu, AlertTriangle,
  MessageSquare, BarChart3, Settings, LogOut,
  Shield, Bell, ChevronRight, FileWarning,
} from 'lucide-react'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/monitoring', icon: Activity,         label: 'Live Monitoring' },
  { to: '/machine-ai', icon: Cpu,              label: 'Machine Failure AI' },
  { to: '/anomaly',    icon: AlertTriangle,    label: 'Anomaly Detection' },
  { to: '/chat',       icon: MessageSquare,    label: 'AI Assistant'   },
  { to: '/analytics',  icon: BarChart3,        label: 'Analytics'      },
  { to: '/incidents',  icon: FileWarning,      label: 'Incident Reports' },
  { to: '/settings',   icon: Settings,         label: 'Settings'       },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen grid-bg overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col glass border-r border-shield-600/50 rounded-none z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-shield-600/50">
          <div className="w-8 h-8 rounded-lg bg-shield-accent/20 flex items-center justify-center glow-accent">
            <Shield className="w-4 h-4 text-shield-accent" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-white tracking-wide">FactoryShield</div>
            <div className="text-xs text-slate-500 font-mono">AI Maintenance</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-shield-600/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-shield-accent/20 flex items-center justify-center text-xs font-bold text-shield-accent">
              {user?.email?.[0].toUpperCase() ?? 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">
                {user?.user_metadata?.full_name ?? 'Engineer'}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 glass border-b border-shield-600/50 rounded-none">
          <div>
            <div className="text-sm font-semibold text-white">
              Industrial Monitoring Platform
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {new Date().toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-shield-green font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-shield-green animate-pulse" />
              System Online
            </div>
            <button className="relative p-2 rounded-lg hover:bg-shield-600 transition-colors">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-shield-red rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
