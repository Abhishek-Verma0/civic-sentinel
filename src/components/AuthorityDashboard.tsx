import React, { useState, useEffect } from 'react';
import { Report, Department, CivicStats } from '../types';
import { getCategoryLabel, getStatusBadgeStyle, getPriorityStyle, formatSlaCountdown } from '../utils';
import { AlertTriangle, CheckCircle2, ShieldAlert, Users, TrendingUp, Sparkles, FolderKanban, Activity, MapPin, CheckSquare, RotateCcw, Brain, Loader2 } from 'lucide-react';
import AgentDecisionsHeroPanel from './AgentDecisionsHeroPanel';

interface AuthorityDashboardProps {
  reports: Report[];
  onResolveReport: (id: string) => void;
  isResolvingId?: string | null;
}

export default function AuthorityDashboard({ reports, onResolveReport, isResolvingId }: AuthorityDashboardProps) {
  const [activeTab, setActiveTab] = useState<Department | 'ALL' | 'REJECTED'>('ALL');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Keep countdown timers ticking in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute stats on the fly
  const computeStats = (): CivicStats => {
    const totalCount = reports.length;
    const activeCount = reports.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected').length;
    const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
    
    // Auto count escalated items based on expired SLA
    const escalatedCount = reports.filter(r => {
      if (r.status === 'Resolved' || r.status === 'Rejected') return false;
      if (r.status === 'Escalated') return true;
      const isExpired = new Date(r.slaDeadline).getTime() < currentTime;
      return isExpired;
    }).length;

    // Distribution
    const categoryDistribution = { pothole: 0, garbage: 0, waterlogging: 0, water_leak: 0, streetlight: 0, open_drain: 0, other: 0 };
    const statusDistribution = { Reported: 0, 'In Progress': 0, Resolved: 0, Escalated: 0, Rejected: 0 };
    const departmentDistribution = {
      'Roads (PWD / Municipal Corporation)': 0,
      'Sanitation (Solid Waste Management)': 0,
      'Drainage (Storm Water / Sewerage)': 0,
      'Water Supply (Jal Board)': 0,
      'Electricity (DISCOM / Municipal Electrical)': 0,
      'Other': 0
    };

    reports.forEach(r => {
      categoryDistribution[r.category] = (categoryDistribution[r.category] || 0) + 1;
      
      let finalStatus = r.status;
      if (r.status !== 'Resolved' && r.status !== 'Rejected' && new Date(r.slaDeadline).getTime() < currentTime) {
        finalStatus = 'Escalated';
      }
      statusDistribution[finalStatus] = (statusDistribution[finalStatus] || 0) + 1;
      
      departmentDistribution[r.department] = (departmentDistribution[r.department] || 0) + 1;
    });

    // Average time to resolution (simulated based on resolved items)
    // Let's assume average is 4.5 hours for urgent, 18 hours for normal, 32 hours for low.
    const resolvedItems = reports.filter(r => r.status === 'Resolved');
    let avgResolutionTimeHours = 4.2; // default standard benchmark
    if (resolvedItems.length > 0) {
      const sum = resolvedItems.reduce((acc, r) => {
        const createT = new Date(r.createdAt).getTime();
        // simulate standard fix times
        const fixTimeHours = Math.max(1.5, Math.floor((Date.now() - createT) / (3600 * 1000) * 0.4));
        return acc + fixTimeHours;
      }, 0);
      avgResolutionTimeHours = parseFloat((sum / resolvedItems.length).toFixed(1));
    }

    return {
      totalCount,
      activeCount,
      resolvedCount,
      escalatedCount,
      categoryDistribution,
      statusDistribution,
      departmentDistribution,
      avgResolutionTimeHours
    };
  };

  const stats = computeStats();

  // Filter and automatically sort queue reports (expired/breached active reports at the very top)
  const filteredReports = reports
    .filter(r => {
      if (activeTab === 'REJECTED') {
        return r.status === 'Rejected';
      }
      // Hide rejected reports from standard queues
      if (r.status === 'Rejected') {
        return false;
      }
      if (activeTab === 'ALL') return true;
      return r.department === activeTab;
    })
    .sort((a, b) => {
      const aIsResolved = a.status === 'Resolved';
      const bIsResolved = b.status === 'Resolved';

      // Unresolved/active reports always come first
      if (aIsResolved !== bIsResolved) {
        return aIsResolved ? 1 : -1;
      }

      // Check if expired
      const aExpired = !aIsResolved && new Date(a.slaDeadline).getTime() < currentTime;
      const bExpired = !bIsResolved && new Date(b.slaDeadline).getTime() < currentTime;

      if (aExpired !== bExpired) {
        return aExpired ? -1 : 1; // Expired/breached reports jump to the absolute top
      }

      // For non-expired unresolved reports, sort by closest SLA deadline first
      if (!aIsResolved) {
        return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      }

      // For resolved, sort by most recently created
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Department queues lists
  const departments: (Department | 'ALL' | 'REJECTED')[] = [
    'ALL',
    'Roads (PWD / Municipal Corporation)',
    'Sanitation (Solid Waste Management)',
    'Drainage (Storm Water / Sewerage)',
    'Water Supply (Jal Board)',
    'Electricity (DISCOM / Municipal Electrical)',
    'Other',
    'REJECTED'
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Logged</span>
            <span className="text-3xl font-black text-slate-900 block font-mono">{stats.totalCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">All sessions reports</span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Queued</span>
            <span className="text-3xl font-black text-indigo-600 block font-mono">{stats.activeCount}</span>
            <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Awaiting resolution
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SLA Escalations</span>
            <span className={`text-3xl font-black block font-mono ${stats.escalatedCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
              {stats.escalatedCount}
            </span>
            <span className="text-[10px] font-semibold flex items-center gap-1 text-rose-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              SLA clock expired
            </span>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fix Efficiency</span>
            <span className="text-3xl font-black text-emerald-600 block font-mono">{stats.avgResolutionTimeHours}h</span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Avg Time-to-Remedy
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid (Pure Styled SVG Widgets for React 19 Safety) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Category breakdown visual chart */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
            <CheckSquare className="w-4 h-4 text-indigo-500" />
            Issue Category Distribution
          </h4>
          <div className="space-y-3 pt-1">
            {(Object.keys(stats.categoryDistribution) as Array<keyof typeof stats.categoryDistribution>).map((cat) => {
              const val = stats.categoryDistribution[cat] || 0;
              const maxVal = Math.max(...Object.values(stats.categoryDistribution), 1);
              const pct = (val / maxVal) * 100;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 capitalize">{getCategoryLabel(cat)}</span>
                    <span className="font-mono font-extrabold text-slate-900">{val} ({reports.length > 0 ? Math.round((val/reports.length)*100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status & SLA efficiency benchmarks */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider mb-3">
              <Users className="w-4 h-4 text-indigo-500" />
              Department Load Balance
            </h4>
            <div className="space-y-2.5">
              {(Object.keys(stats.departmentDistribution) as Department[]).map((dept) => {
                const val = stats.departmentDistribution[dept] || 0;
                const maxVal = Math.max(...Object.values(stats.departmentDistribution), 1);
                const pct = (val / maxVal) * 100;
                return (
                  <div key={dept} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 w-24">{dept} Dept</span>
                    <div className="flex-1 mx-3 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="font-bold text-slate-800 font-mono w-8 text-right">{val} cases</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-right text-xs text-slate-500">
            <span>System Dispatch Active</span>
          </div>
        </div>
      </div>

      {/* QUEUE CONTROL CENTER */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Civic Department dispatch Queues</h3>
            <p className="text-xs text-slate-500 mt-0.5">Filter queues to review auto-routed work-orders, SLA deadlines, and trigger technician resolution.</p>
          </div>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full font-mono">
            Autonomous Dispatcher Online
          </span>
        </div>

        {/* Department Filters tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto bg-white whitespace-nowrap scrollbar-hide px-4 py-2 gap-1">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setActiveTab(dept)}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === dept
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {dept === 'ALL' ? '🚨 All Departments' : dept === 'REJECTED' ? '🚫 Rejected / Spam' : dept}
              <span className="ml-1.5 bg-slate-100 text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold group-hover:bg-indigo-100">
                {dept === 'ALL' 
                  ? reports.filter(r => r.status !== 'Rejected').length 
                  : dept === 'REJECTED' 
                  ? reports.filter(r => r.status === 'Rejected').length 
                  : reports.filter(r => r.department === dept && r.status !== 'Rejected').length}
              </span>
            </button>
          ))}
        </div>

        {/* Queues list */}
        <div className="divide-y divide-slate-100">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <DashboardReportItem
                key={report.id}
                report={report}
                onResolveReport={onResolveReport}
                currentTime={currentTime}
                isResolvingId={isResolvingId}
              />
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <FolderKanban className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
              <p className="text-sm font-medium">No Active Reports in {activeTab}</p>
              <p className="text-xs mt-0.5 px-6">Any citizen tickets auto-routed here will stack up automatically under our service SLA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DashboardReportItemProps {
  key?: string;
  report: Report;
  onResolveReport: (id: string) => void;
  currentTime: number;
  isResolvingId?: string | null;
}

function DashboardReportItem({ report, onResolveReport, currentTime, isResolvingId }: DashboardReportItemProps) {
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false);
  const [isDecisionsOpen, setIsDecisionsOpen] = useState(false);
  const { text: countdownText, isUrgent, isExpired } = formatSlaCountdown(report.slaDeadline, report.status);
  const isBreached = report.status !== 'Resolved' && isExpired;
  const finalStatus = isBreached ? 'ESCALATED — SLA BREACHED' : report.status;

  return (
    <div className={`p-5 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${
      isBreached 
        ? 'bg-rose-50 border-l-4 border-rose-600 shadow-sm' 
        : 'hover:bg-slate-50/50'
    }`}>
      <div className="flex items-start gap-4 flex-1">
        {/* Tiny thumbnail */}
        <img
          src={report.photoUrl}
          alt={report.id}
          referrerPolicy="no-referrer"
          className="w-14 h-14 object-cover rounded-xl border border-slate-100 shrink-0"
        />

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-slate-400">{report.id}</span>
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getStatusBadgeStyle(finalStatus)}`}>
              {finalStatus}
            </span>
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getPriorityStyle(report.priority)}`}>
              {report.priority}
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {report.department} Dept
            </span>
            {report.isDuplicate && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Merged Duplicate (Case #{report.mergedIntoId})
              </span>
            )}
            {report.duplicateCount > 0 && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                +{report.duplicateCount} merged duplicates
              </span>
            )}
          </div>

          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
            {getCategoryLabel(report.category)}: {report.shortDescription}
          </h4>

          {report.reasoning && (
            <div className="bg-indigo-50/70 border border-indigo-100/80 px-3 py-2 rounded-xl text-xs font-medium text-indigo-950 flex items-start gap-2 max-w-xl shadow-xs">
              <Brain className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 block font-mono">Autonomous Triage Reasoning</span>
                <p className="italic mt-0.5">"{report.reasoning}"</p>
              </div>
            </div>
          )}

          {report.reasoning && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsDecisionsOpen(!isDecisionsOpen)}
                className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                {isDecisionsOpen ? 'Hide Agent Decisions Matrix' : '🧠 Show Agent Decisions Matrix'}
                <span className="font-mono text-[9px]">{isDecisionsOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          )}

          {/* COLLAPSIBLE HERO AGENT DECISIONS PANEL */}
          {isDecisionsOpen && (
            <div className="max-w-xl mt-2">
              <AgentDecisionsHeroPanel report={report} />
            </div>
          )}

          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{report.address || 'SF Geolocation Coordinates'}</span>
          </p>

          {/* COLLAPSIBLE OFFICIAL WORK ORDER */}
          {report.workOrderDraft && (
            <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-xs max-w-xl mt-2.5">
              <button
                type="button"
                onClick={() => setIsWorkOrderOpen(!isWorkOrderOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-indigo-50/40 hover:bg-indigo-50/80 text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  Official Work Order (auto-generated)
                </span>
                <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  {isWorkOrderOpen ? 'Hide' : 'Show'}
                  <span className="font-mono text-indigo-500">{isWorkOrderOpen ? '▲' : '▼'}</span>
                </span>
              </button>
              {isWorkOrderOpen && (
                <div className="p-3 border-t border-indigo-100 bg-slate-950 font-mono text-[10px] text-slate-100 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {report.workOrderDraft}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right hand details: countdown and action */}
      {report.status !== 'Rejected' && (
        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0">
          {/* SLA countdown badge */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">SLA Deadline Clock</span>
            <span className={`font-mono text-xs font-bold ${
              report.status === 'Resolved'
                ? 'text-emerald-600'
                : isExpired
                ? 'text-rose-600 animate-pulse font-extrabold'
                : isUrgent
                ? 'text-amber-600'
                : 'text-slate-600'
            }`}>
              {countdownText}
            </span>
          </div>

          {/* Action button */}
          {report.status !== 'Resolved' && (
            <button
              onClick={() => onResolveReport(report.id)}
              disabled={isResolvingId === report.id}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isResolvingId === report.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isResolvingId === report.id ? 'Resolving...' : 'Resolve Case'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
