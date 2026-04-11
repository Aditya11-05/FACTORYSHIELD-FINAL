import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage        from './pages/LoginPage'
import DashboardLayout  from './components/layout/DashboardLayout'
import DashboardPage    from './pages/DashboardPage'
import LiveMonitoring   from './pages/LiveMonitoring'
import MachineFail      from './pages/MachineFail'
import AnomalyPage      from './pages/AnomalyPage'
import ChatbotPage      from './pages/ChatbotPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import SettingsPage     from './pages/SettingsPage'
import IncidentsPage    from './pages/IncidentsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="h-screen grid place-items-center bg-shield-900">
      <div className="text-shield-accent font-mono animate-pulse">Initialising FactoryShield…</div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="scanner-line" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index             element={<DashboardPage />} />
            <Route path="monitoring" element={<LiveMonitoring />} />
            <Route path="machine-ai" element={<MachineFail />} />
            <Route path="anomaly"    element={<AnomalyPage />} />
            <Route path="chat"       element={<ChatbotPage />} />
            <Route path="analytics"  element={<AnalyticsPage />} />
            <Route path="incidents"  element={<IncidentsPage />} />
            <Route path="settings"   element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}