import React, { useState, useEffect, useRef } from 'react';
import { Report, LocationLiteral } from '../types';
import { getCategoryLabel, getStatusBadgeStyle, getPriorityStyle, formatSlaCountdown } from '../utils';
import { AlertCircle, Eye, CheckCircle2, Clock, MapPin, Info, Brain, Loader2 } from 'lucide-react';
import AgentDecisionsHeroPanel from './AgentDecisionsHeroPanel';

const AZURE_MAPS_KEY =
  (import.meta as any).env?.VITE_AZURE_MAPS_KEY ||
  process.env.AZURE_MAPS_KEY ||
  '';

const hasValidKey = Boolean(AZURE_MAPS_KEY) && AZURE_MAPS_KEY !== 'YOUR_API_KEY' && AZURE_MAPS_KEY.trim() !== '';

interface MapTabProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  selectedReport: Report | null;
  onResolve: (id: string) => void;
  role: 'citizen' | 'authority';
  isResolvingId?: string | null;
}

export default function MapTab({ reports, onSelectReport, selectedReport, onResolve, role, isResolvingId }: MapTabProps) {
  const [activeReport, setActiveReport] = useState<Report | null>(selectedReport);
  const [mapCenter, setMapCenter] = useState<LocationLiteral>({ lat: 20.5937, lng: 78.9629 }); // Central India
  const [forceMock, setForceMock] = useState<boolean>(!hasValidKey);
  const [billingError, setBillingError] = useState<boolean>(false);

  useEffect(() => {
    // Check if Azure Maps script failed to load or key is invalid
    const checkMapsError = (msg: string) => {
      if (
        msg.includes('Azure Maps') ||
        msg.includes('atlas') ||
        msg.includes('subscriptionKey') ||
        msg.includes('401') ||
        msg.includes('403')
      ) {
        setBillingError(true);
        setForceMock(true);
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      checkMapsError(msg);
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      checkMapsError(msg);
      originalConsoleWarn.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // Handle marker click
  const handleMarkerClick = (report: Report) => {
    setActiveReport(report);
    onSelectReport(report);
    setMapCenter(report.location);
  };

  // Get color for Pin based on status & severity
  const getPinColor = (report: Report) => {
    if (report.status === 'Resolved') return '#10B981'; // Emerald
    if (report.status === 'Escalated') return '#F43F5E'; // Rose / Red
    if (report.priority === 'Urgent') return '#F59E0B'; // Amber
    return '#3B82F6'; // Blue
  };

  // If Google Maps key is missing or user forced mock map, show a beautiful interactive mock map.
  // This satisfies the skill instruction to show the splash instructions while ensuring the demo is 100% functional.
  if (forceMock) {
    return (
      <div className="space-y-4">
        {billingError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-rose-900">
            <div className="flex items-start gap-2.5 font-medium">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="block text-rose-950 font-bold mb-0.5 text-sm">Google Maps Billing Account Required (BillingNotEnabledMapError)</strong>
                The provided Google Maps API key loaded, but requires an active Billing Account. We have automatically diverted your view to the fully-functional interactive civic sandbox map so you can continue testing smoothly.
              </div>
            </div>
            <a
              href="https://console.cloud.google.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shrink-0 whitespace-nowrap cursor-pointer text-center w-full sm:w-auto"
            >
              Enable Cloud Billing
            </a>
          </div>
        ) : hasValidKey ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between items-center text-xs text-amber-900">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Viewing Sandbox Simulated Map. If you have a fully setup/billed key, you can try the Live Google Map.
            </span>
            <button
              onClick={() => setForceMock(false)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Try Live Google Map
            </button>
          </div>
        ) : null}

        <div className="flex flex-col lg:flex-row h-auto lg:h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
          {/* Mock Map / Visual Canvas */}
          <div className="w-full lg:flex-1 h-[350px] lg:h-full relative bg-slate-100 flex flex-col justify-between overflow-hidden">
            {/* Simulated Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
              backgroundImage: `radial-gradient(#1e293b 1.5px, transparent 1.5px), radial-gradient(#1e293b 1.5px, #f8fafc 1.5px)`,
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px'
            }}></div>

            {/* Central Park / Bay simulator graphics */}
            <div className="absolute top-12 left-12 w-28 h-20 bg-emerald-100 rounded-2xl opacity-60 flex items-center justify-center text-emerald-800 text-[10px] font-semibold select-none text-center p-2">New Delhi (NCR Grid)</div>
            <div className="absolute bottom-20 left-16 w-28 h-20 bg-blue-100 rounded-2xl opacity-60 flex items-center justify-center text-blue-800 text-[10px] font-semibold select-none text-center p-2">Bengaluru HQ</div>

            {/* Seed Markers as interactive visual buttons */}
            <div className="relative z-10 p-4 bg-slate-900/80 backdrop-blur-xs text-white text-xs flex justify-between items-center">
              <span className="font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Interactive Control Room View (Demo Active)
              </span>
              <span className="text-slate-300 font-mono text-[10px]">India National Grid</span>
            </div>

            <div className="relative flex-1">
              {reports.filter((r) => !r.isDuplicate && r.status !== 'Resolved' && r.status !== 'Rejected').map((report) => {
                // Map lat/lng into a mock pixel percentage coordinate system of India
                const latMin = 8.0;
                const latMax = 36.0;
                const lngMin = 68.0;
                const lngMax = 97.0;

                const top = 100 - ((report.location.lat - latMin) / (latMax - latMin)) * 100;
                const left = ((report.location.lng - lngMin) / (lngMax - lngMin)) * 100;

                const isSelected = activeReport?.id === report.id;

                return (
                  <button
                    key={report.id}
                    onClick={() => handleMarkerClick(report)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-125 focus:outline-none"
                    style={{ top: `${top}%`, left: `${left}%` }}
                  >
                    <div className="relative group">
                      {/* Ripple alert if urgent */}
                      {report.priority === 'Urgent' && report.status !== 'Resolved' && (
                        <span className="absolute -inset-2 rounded-full bg-rose-400/30 animate-ping"></span>
                      )}

                      {/* Pin design */}
                      <div className="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: getPinColor(report) }}>
                        {report.category === 'pothole' ? '🛣️' : report.category === 'water_leak' ? '💧' : report.category === 'streetlight' ? '💡' : report.category === 'garbage' ? '🗑️' : report.category === 'waterlogging' ? '🌊' : report.category === 'open_drain' ? '🕳️' : '🔧'}
                      </div>

                      {/* Popover tooltip */}
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-9 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                        {report.id}: {report.shortDescription.substring(0, 15)}...
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick instructions splash */}
            <div className="m-4 p-4 bg-white/95 backdrop-blur-xs border border-blue-100 rounded-xl shadow-lg relative z-10 max-w-sm">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                {billingError ? "Azure Maps Auth Error" : "Azure Maps Setup"}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {billingError
                  ? "Your Azure Maps Key is invalid or has expired. Please check your Subscription Key and retry."
                  : "Add your VITE_AZURE_MAPS_KEY to AI Studio Secrets to unlock the live interactive satellite and road vectors."}
              </p>
              <div className="flex gap-2 mt-3">
                <a
                  href="https://azure.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 text-center flex-1"
                >
                  Get Azure Key
                </a>
                {!billingError && (
                  <button
                    type="button"
                    onClick={() => {
                      alert("To add manually:\n1. Click Settings (⚙️ top-right)\n2. Select Secrets\n3. Add VITE_AZURE_MAPS_KEY");
                    }}
                    className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 border border-slate-200 flex-1"
                  >
                    Install Secret
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="w-full lg:w-[450px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col p-5 max-h-[400px] lg:max-h-none overflow-y-auto">
            {activeReport ? (
              <ReportDetailCard
                report={activeReport}
                onResolve={onResolve}
                role={role}
                isResolvingId={isResolvingId}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <MapPin className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
                <p className="text-sm font-medium">No Report Selected</p>
                <p className="text-xs mt-1 px-6">Click any interactive pin on the city grid map to trace real-time agent decisions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING WITH LIVE AZURE MAPS ---
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [azureMap, setAzureMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (forceMock || !mapContainerRef.current) return;

    const atlas = (window as any).atlas;
    if (!atlas) {
      console.error("Azure Maps Web SDK not found. Make sure index.html loaded correctly.");
      return;
    }

    try {
      const newMap = new atlas.Map(mapContainerRef.current, {
        center: [mapCenter.lng, mapCenter.lat], // [lng, lat]
        zoom: 4,
        authOptions: {
          authType: 'subscriptionKey',
          subscriptionKey: AZURE_MAPS_KEY
        }
      });

      newMap.events.add('ready', () => {
        setAzureMap(newMap);
      });

      newMap.events.add('error', (e: any) => {
        console.error("Azure Maps subscription error:", e);
        if (e && (e.error?.status === 401 || e.error?.status === 403)) {
          setBillingError(true);
          setForceMock(true);
        }
      });

      return () => {
        newMap.dispose();
        setAzureMap(null);
      };
    } catch (err) {
      console.error("Failed to initialize Azure Maps:", err);
    }
  }, [forceMock]);

  // Handle marker additions and updates
  useEffect(() => {
    if (!azureMap) return;
    const atlas = (window as any).atlas;
    if (!atlas) return;

    // Clear existing markers
    markersRef.current.forEach(m => azureMap.markers.remove(m));
    markersRef.current = [];

    // Add new markers
    reports.filter(r => !r.isDuplicate && r.status !== 'Resolved' && r.status !== 'Rejected').forEach(report => {
      const pinColor = getPinColor(report);
      const categoryIcon = report.category === 'pothole' ? '🛣️' : report.category === 'water_leak' ? '💧' : report.category === 'streetlight' ? '💡' : report.category === 'garbage' ? '🗑️' : report.category === 'waterlogging' ? '🌊' : report.category === 'open_drain' ? '🕳️' : '🔧';
      
      const htmlContent = document.createElement('div');
      htmlContent.className = 'relative cursor-pointer hover:scale-110 transition-transform duration-200';
      htmlContent.innerHTML = `
        ${report.priority === 'Urgent' && report.status !== 'Resolved' ? '<span class="absolute -inset-2 rounded-full bg-rose-400/30 animate-ping"></span>' : ''}
        <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-xs"
          style="background-color: ${pinColor}">
          ${categoryIcon}
        </div>
      `;

      const marker = new atlas.HtmlMarker({
        htmlContent: htmlContent,
        position: [report.location.lng, report.location.lat]
      });

      azureMap.events.add('click', marker, () => {
        handleMarkerClick(report);
      });

      azureMap.markers.add(marker);
      markersRef.current.push(marker);
    });
  }, [azureMap, reports]);

  // Handle dynamic camera updates
  useEffect(() => {
    if (azureMap && mapCenter) {
      azureMap.setCamera({
        center: [mapCenter.lng, mapCenter.lat],
        type: 'jump'
      });
    }
  }, [azureMap, mapCenter]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center text-xs text-blue-900">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          Live Azure Maps active. If the map fails to load or auth errors occur, you can switch back to the high-fidelity Sandbox Map.
        </span>
        <button
          onClick={() => setForceMock(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Use Sandbox Map
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-auto lg:h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
        {/* Actual Azure Maps container */}
        <div className="w-full lg:flex-1 h-[350px] lg:h-full relative">
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Selected detail sidebar */}
        <div className="w-full lg:w-[450px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col p-5 max-h-[400px] lg:max-h-none overflow-y-auto">
          {activeReport ? (
            <ReportDetailCard
              report={activeReport}
              onResolve={onResolve}
              role={role}
              isResolvingId={isResolvingId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <MapPin className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
              <p className="text-sm font-medium">No Report Selected</p>
              <p className="text-xs mt-1 px-6">Click any pin on the map to view category, severity, and autonomous work-orders.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Internal reusable Detail Card Component for selected reports
function ReportDetailCard({ report, onResolve, role, isResolvingId }: { report: Report; onResolve: (id: string) => void; role: 'citizen' | 'authority'; isResolvingId?: string | null }) {
  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [report.id]);

  const { text: countdownText, isUrgent: slaUrgent, isExpired } = formatSlaCountdown(report.slaDeadline, report.status);
  const isBreached = report.status !== 'Resolved' && isExpired;
  const finalStatus = isBreached ? 'ESCALATED — SLA BREACHED' : report.status;
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider block">{report.id}</span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">{getCategoryLabel(report.category)}</h4>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getStatusBadgeStyle(finalStatus)}`}>
            {finalStatus}
          </span>
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getPriorityStyle(report.priority)}`}>
            {report.priority}
          </span>
        </div>
      </div>

      {/* Community Confirmations badge */}
      {((report.confirmations || 0) > 0 || (report.duplicateCount || 0) > 0) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="bg-indigo-600 text-white rounded-full p-1.5 shrink-0 animate-pulse">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-bold text-indigo-900 block">
              Verified by {report.confirmations || report.duplicateCount} citizen reports
            </span>
            <span className="text-[9px] font-medium text-indigo-700 block mt-0.5">
              Duplicate reports nearby auto-merged. Priority escalated.
            </span>
          </div>
        </div>
      )}

      {/* Photo */}
      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
        <img
          src={report.photoUrl}
          alt={report.shortDescription}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono">
          <MapPin className="w-3 h-3 text-red-400" />
          {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
        </div>
      </div>

      {/* SLA Countdown Timer */}
      <div className={`p-3 rounded-xl border flex items-center justify-between ${
        report.status === 'Resolved'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : isExpired || report.status === 'Escalated'
          ? 'bg-rose-50 border-rose-100 text-rose-800 animate-pulse'
          : slaUrgent
          ? 'bg-amber-50 border-amber-100 text-amber-800'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-600' : 'text-slate-500'}`} />
          <span className="text-xs font-semibold">Service SLA Target</span>
        </div>
        <span className="text-xs font-bold font-mono uppercase tracking-wider">{countdownText}</span>
      </div>

      {/* Short Description */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perceived Issue</span>
        <p className="text-xs font-medium text-slate-700 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 mt-1">
          "{report.shortDescription}"
        </p>
      </div>

      {/* Citizen Comment / Notes */}
      {report.citizenComment && report.citizenComment.trim() && (
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citizen Comments & Notes</span>
          <p className="text-xs font-medium text-slate-600 bg-indigo-50/25 p-2.5 rounded-lg border border-indigo-100/30 mt-1 italic">
            "{report.citizenComment}"
          </p>
        </div>
      )}

      {report.reasoning && (
        <div className="bg-indigo-50/70 border border-indigo-100/80 px-3 py-2 rounded-xl text-xs font-medium text-indigo-950 flex items-start gap-2 shadow-xs">
          <Brain className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 block font-mono">Autonomous Triage Reasoning</span>
            <p className="italic mt-0.5">"{report.reasoning}"</p>
          </div>
        </div>
      )}

      {/* CENTERPIECE: AGENT DECISIONS HERO PANEL */}
      <AgentDecisionsHeroPanel report={report} compact={true} />

      {/* COLLAPSIBLE OFFICIAL WORK ORDER */}
      {report.workOrderDraft && (
        <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setIsWorkOrderOpen(!isWorkOrderOpen)}
            className="w-full flex items-center justify-between p-3 bg-indigo-50/40 hover:bg-indigo-50/80 text-left transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Official Work Order (auto-generated)
            </span>
            <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
              {isWorkOrderOpen ? 'Hide' : 'Show'}
              <span className="font-mono text-indigo-500">{isWorkOrderOpen ? '▲' : '▼'}</span>
            </span>
          </button>
          {isWorkOrderOpen && (
            <div className="p-3.5 border-t border-indigo-100 bg-slate-950 font-mono text-[10px] text-slate-100 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {report.workOrderDraft}
            </div>
          )}
        </div>
      )}

      {/* CITIZEN FACING MESSAGE */}
      <div className="space-y-1 bg-emerald-50/20 border border-emerald-100/50 p-3 rounded-xl">
        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Citizen Status Memo</span>
        <p className="text-xs italic text-slate-600 mt-1">
          "{report.citizenMessage}"
        </p>
      </div>

      {/* AUTHORITY RESOLUTION ACTION */}
      {role === 'authority' && report.status !== 'Resolved' && (
        <button
          onClick={() => onResolve(report.id)}
          disabled={isResolvingId === report.id}
          className="w-full mt-2 bg-emerald-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isResolvingId === report.id ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {isResolvingId === report.id ? 'Resolving...' : 'Mark Resolved & Send Memo'}
        </button>
      )}
    </div>
  );
}
