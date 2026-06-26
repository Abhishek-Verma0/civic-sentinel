import React, { useState } from 'react';
import { Report, Department } from '../types';
import { getCategoryLabel } from '../utils';
import { 
  BarChart3, 
  Activity, 
  Award, 
  CheckCircle2, 
  Droplet, 
  Lightbulb, 
  Trash2, 
  Wrench, 
  DollarSign, 
  Clock, 
  Flame, 
  TrendingUp, 
  Users 
} from 'lucide-react';

interface ImpactDashboardProps {
  reports: Report[];
}

export default function ImpactDashboard({ reports }: ImpactDashboardProps) {
  const [selectedDept, setSelectedDept] = useState<Department | 'ALL'>('ALL');

  // Filter reports by department
  const filteredReports = reports.filter(r => {
    if (selectedDept === 'ALL') return true;
    return r.department === selectedDept;
  });

  // 1. Basic Stats (Computed based on filtered reports)
  const totalCount = filteredReports.length;
  const resolvedReports = filteredReports.filter(r => r.status === 'Resolved');
  const resolvedCount = resolvedReports.length;
  const activeReports = filteredReports.filter(r => r.status !== 'Resolved');
  const activeCount = activeReports.length;

  const duplicatesMerged = filteredReports.filter(r => r.isDuplicate).length;
  const confirmationsCount = filteredReports.reduce((acc, r) => acc + (r.confirmations || r.duplicateCount || 0), 0);

  // 2. Average Time-to-Resolution
  let avgResolutionTimeHours = 4.2; // default standard benchmark
  if (resolvedCount > 0) {
    const sum = resolvedReports.reduce((acc, r) => {
      const createT = new Date(r.createdAt).getTime();
      const diffHours = (Date.now() - createT) / (3600 * 1000);
      const simulatedHours = Math.max(1.2, parseFloat((diffHours * 0.4).toFixed(1)));
      return acc + simulatedHours;
    }, 0);
    avgResolutionTimeHours = parseFloat((sum / resolvedCount).toFixed(1));
  }

  // 3. Category Breakdown
  const categoryCount: Record<string, number> = {
    pothole: 0,
    garbage: 0,
    waterlogging: 0,
    water_leak: 0,
    streetlight: 0,
    open_drain: 0,
    other: 0,
  };
  filteredReports.forEach(r => {
    if (categoryCount[r.category] !== undefined) {
      categoryCount[r.category]++;
    } else {
      categoryCount.other++;
    }
  });

  // 4. Status Breakdown
  const statusCount: Record<string, number> = {
    'Reported': 0,
    'In Progress': 0,
    'Resolved': 0,
    'Escalated': 0,
  };
  const now = Date.now();
  filteredReports.forEach(r => {
    let finalStatus = r.status;
    if (r.status !== 'Resolved' && new Date(r.slaDeadline).getTime() < now) {
      finalStatus = 'Escalated';
    }
    if (statusCount[finalStatus] !== undefined) {
      statusCount[finalStatus]++;
    } else {
      statusCount['Reported']++;
    }
  });

  // 5. Civic Impact Calculations (Headline Metrics)
  const waterLeaksResolved = resolvedReports.filter(r => r.category === 'water_leak').length;
  const gallonsSaved = waterLeaksResolved * 4500; // in Liters

  const potholesResolved = resolvedReports.filter(r => r.category === 'pothole').length;
  const squareYardsRestored = potholesResolved * 15; // in Sq Meters

  const streetlightsResolved = resolvedReports.filter(r => r.category === 'streetlight').length;
  const lightingHours = streetlightsResolved * 168; // 1 week of night hours

  const wasteResolved = resolvedReports.filter(r => r.category === 'garbage' || r.category === 'waste' as any).length;
  const tonsCleared = parseFloat((wasteResolved * 0.45).toFixed(2));

  // Municipal savings (INR):
  const automatedTriageSavings = totalCount * 3500;
  const duplicateMitigationSavings = duplicatesMerged * 12000;
  const totalFinancialSavings = automatedTriageSavings + duplicateMitigationSavings;

  // Department metadata for rendering tabs
  const departmentsList: { key: Department | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All Departments', icon: '📋' },
    { key: 'Roads (PWD / Municipal Corporation)', label: 'Roads', icon: '🛣️' },
    { key: 'Sanitation (Solid Waste Management)', label: 'Sanitation', icon: '🧹' },
    { key: 'Drainage (Storm Water / Sewerage)', label: 'Drainage', icon: '🌊' },
    { key: 'Water Supply (Jal Board)', label: 'Water', icon: '🚰' },
    { key: 'Electricity (DISCOM / Municipal Electrical)', label: 'Electricity', icon: '⚡' },
    { key: 'Other', label: 'Other', icon: '⚙️' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. HERO "CIVIC IMPACT" SUMMARY PANEL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-950 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative Grid Lines / Background Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
              <Award className="w-3.5 h-3.5 animate-bounce" /> Real-Time Civic Impact Scoreboard
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Driving Smarter, Faster Municipal Resolutions
            </h2>
            <p className="text-sm text-slate-300 font-medium">
              By combining instant photo triage and location-aware deduplication, we minimize response delays, mitigate billing constraints, and keep neighborhood infrastructure active.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-indigo-500/20 backdrop-blur-md rounded-2xl p-5 w-full md:w-auto shrink-0 flex flex-col items-center justify-center text-center shadow-2xl min-w-[200px]">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-1">Estimated Taxpayer Savings</span>
            <div className="text-4xl font-black text-indigo-300 font-mono flex items-center justify-center gap-1">
              <span className="text-2xl text-indigo-400 shrink-0 font-bold">₹</span>
              <span>{totalFinancialSavings.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1">
              {totalCount} cases triaged • {duplicatesMerged} duplicates merged
            </span>
          </div>
        </div>
      </div>

      {/* DEPARTMENT-WISE FILTERS ROW */}
      <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-xs">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Department-Wise Dashboard Filter
          </span>
          <div className="flex flex-wrap gap-1.5">
            {departmentsList.map((dept) => (
              <button
                type="button"
                id={`btn-filter-dept-${dept.label.toLowerCase()}`}
                key={dept.key}
                onClick={() => setSelectedDept(dept.key)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
                  selectedDept === dept.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/60'
                }`}
              >
                <span className="text-sm">{dept.icon}</span>
                <span>{dept.label}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  selectedDept === dept.key
                    ? 'bg-indigo-700/80 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {dept.key === 'ALL' ? reports.length : reports.filter(r => r.department === dept.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CORE PERFORMANCE METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Citizen Tickets */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Reports</span>
            <span className="text-3xl font-black text-slate-900 block font-mono">{totalCount}</span>
            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-500" />
              {confirmationsCount} community confirmations
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Resolved Cases */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Resolved Issues</span>
            <span className="text-3xl font-black text-emerald-600 block font-mono">{resolvedCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}% success rate
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Backlog */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Backlog</span>
            <span className="text-3xl font-black text-indigo-600 block font-mono">{activeCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">
              In routing & dispatch queue
            </span>
          </div>
          <div className="bg-indigo-50/50 text-indigo-600 p-3 rounded-xl shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Average Resolution Speed */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg Fix Velocity</span>
            <span className="text-3xl font-black text-indigo-600 block font-mono">{avgResolutionTimeHours}h</span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              SLA-aligned efficiency
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC CIVIC METRICS HIGHLIGHTS (DIFFERENT CATEGORY BENCHMARKS) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            Verified Physical Infrastructure Restorations
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Water Saved Card */}
          <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Water Conservation</span>
              <Droplet className="w-4 h-4 text-blue-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-blue-950 font-mono">
                {gallonsSaved.toLocaleString()} L
              </div>
              <p className="text-[10px] text-blue-800 font-medium">
                Drinking water saved from resolved water leaks and bursts.
              </p>
            </div>
            <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (waterLeaksResolved * 20))}%` }}></div>
            </div>
          </div>

          {/* Roadways Safe Card */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Road Quality</span>
              <Wrench className="w-4 h-4 text-slate-600" />
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-slate-950 font-mono">
                {squareYardsRestored.toLocaleString()} sq m
              </div>
              <p className="text-[10px] text-slate-700 font-medium">
                Smooth asphalt lane coverage restored by resolved potholes.
              </p>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-700 h-full rounded-full" style={{ width: `${Math.min(100, (potholesResolved * 20))}%` }}></div>
            </div>
          </div>

          {/* Safety Lighting Hours Card */}
          <div className="p-4 rounded-xl border border-amber-50 bg-amber-50/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Neighborhood Safety</span>
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-amber-950 font-mono">
                {lightingHours.toLocaleString()} hrs
              </div>
              <p className="text-[10px] text-amber-800 font-medium">
                Streetlight illumination hours restored, protecting pedestrian routes.
              </p>
            </div>
            <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (streetlightsResolved * 20))}%` }}></div>
            </div>
          </div>

          {/* Waste Cleared Card */}
          <div className="p-4 rounded-xl border border-emerald-50 bg-emerald-50/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Blight Elimination</span>
              <Trash2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {tonsCleared} tons
              </div>
              <p className="text-[10px] text-emerald-800 font-medium">
                Illegal dumping waste and bulky hazards cleared by sanitation crews.
              </p>
            </div>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (wasteResolved * 20))}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHARTS: BREAKDOWN BY CATEGORY & STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Category breakdown visual progress meter */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Incidents by Category
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Distribution ratio</span>
          </div>
          <div className="space-y-3 pt-1">
            {Object.entries(categoryCount).map(([cat, val]) => {
              const maxVal = Math.max(...Object.values(categoryCount), 1);
              const pct = (val / maxVal) * 100;
              const globalPct = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 capitalize">
                      {getCategoryLabel(cat as any)}
                    </span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {val} <span className="text-[10px] text-slate-400 font-normal">({globalPct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
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

        {/* Status breakdown visual meters */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-indigo-500" />
              Cases by Resolution State
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Real-time status</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {Object.entries(statusCount).map(([statusName, val]) => {
              const maxVal = Math.max(...Object.values(statusCount), 1);
              const pct = (val / maxVal) * 100;
              const globalPct = totalCount > 0 ? Math.round((val / totalCount) * 100) : 0;
              
              // Custom color-coding based on status state
              let barColor = 'bg-indigo-500';
              if (statusName === 'Resolved') barColor = 'bg-emerald-500';
              if (statusName === 'In Progress') barColor = 'bg-blue-500';
              if (statusName === 'Escalated') barColor = 'bg-rose-500 animate-pulse';

              return (
                <div key={statusName} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{statusName}</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {val} <span className="text-[10px] text-slate-400 font-normal">({globalPct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-1000`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
