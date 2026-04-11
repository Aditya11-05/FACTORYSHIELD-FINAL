import { FileWarning, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const INCIDENTS = [
  { id: 'INC-001', machine: 'CNC-03', type: 'Heat Dissipation Failure', severity: 'Critical', status: 'Open',     time: '2025-01-15 08:42', description: 'Process temp exceeded threshold by 4K. Coolant flow reduced.', assignee: 'J. Smith' },
  { id: 'INC-002', machine: 'CNC-01', type: 'Tool Wear Failure',        severity: 'High',     status: 'In Progress', time: '2025-01-15 07:15', description: 'Tool wear at 218 min — exceeded 200 min limit.', assignee: 'M. Johnson' },
  { id: 'INC-003', machine: 'CNC-06', type: 'Power Failure',            severity: 'Critical', status: 'Open',     time: '2025-01-15 06:30', description: 'Motor overload detected. Torque × Speed exceeded safe limit.', assignee: 'A. Patel' },
  { id: 'INC-004', machine: 'CNC-09', type: 'Overstrain Failure',       severity: 'Medium',   status: 'Resolved', time: '2025-01-14 22:10', description: 'Load reduced. Alignment corrected. Back online.', assignee: 'R. Chen' },
  { id: 'INC-005', machine: 'CNC-04', type: 'Power Failure',            severity: 'High',     status: 'In Progress', time: '2025-01-14 19:55', description: 'Electrical connections inspected. Motor windings showing wear.', assignee: 'J. Smith' },
  { id: 'INC-006', machine: 'CNC-12', type: 'Tool Wear Failure',        severity: 'Medium',   status: 'Resolved', time: '2025-01-14 14:30', description: 'Tool replaced. Machine returned to service.', assignee: 'M. Johnson' },
]

export default function IncidentsPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-shield-yellow" /> Incident Reports
          </h1>
          <p className="text-sm text-slate-500">Machine failure incidents and resolution tracking</p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-red-400">{INCIDENTS.filter(i => i.status === 'Open').length} Open</span>
          <span className="text-yellow-400">{INCIDENTS.filter(i => i.status === 'In Progress').length} In Progress</span>
          <span className="text-green-400">{INCIDENTS.filter(i => i.status === 'Resolved').length} Resolved</span>
        </div>
      </div>

      <div className="space-y-3">
        {INCIDENTS.map(inc => (
          <div key={inc.id} className="glass glass-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-500">{inc.id}</span>
                <span className="font-mono font-bold text-white">{inc.machine}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  inc.severity === 'Critical' ? 'badge-critical' :
                  inc.severity === 'High'     ? 'badge-warning'  : 'badge-info'
                }`}>{inc.severity}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                  inc.status === 'Open'        ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  inc.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                  'bg-green-500/10 text-green-400 border border-green-500/20'
                }`}>
                  {inc.status === 'Open'        ? <AlertTriangle className="w-3 h-3" /> :
                   inc.status === 'In Progress' ? <Clock className="w-3 h-3" /> :
                                                   <CheckCircle className="w-3 h-3" />}
                  {inc.status}
                </span>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-300 mb-1">{inc.type}</div>
            <div className="text-xs text-slate-500 mb-2">{inc.description}</div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {inc.time}</span>
              <span>Assigned: <span className="text-slate-400">{inc.assignee}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
