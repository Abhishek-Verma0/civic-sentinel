import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Report } from './types';
import ReportForm from './components/ReportForm';
import AuthorityDashboard from './components/AuthorityDashboard';
import MapTab from './components/MapTab';
import ImpactDashboard from './components/ImpactDashboard';
import { Shield, Eye, Settings, HeartHandshake, MapPin, BarChart3, HelpCircle, Cpu, AlertCircle, RefreshCw, Layers, Award, LogOut, UserCheck } from 'lucide-react';
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [role, setRole] = useState<'citizen' | 'authority'>('citizen');
  const [activeTab, setActiveTab] = useState<'report' | 'map' | 'dashboard' | 'impact'>('report');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  // Monitor firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            const profile = userDocSnap.data();
            setUserProfile(profile);
            setRole(profile.role || 'citizen');
          } else {
            const fallbackRole = user.email?.includes('admin') ? 'authority' : 'citizen';
            const profile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || (fallbackRole === 'authority' ? 'Chief Dispatcher' : 'Model Citizen'),
              role: fallbackRole,
              createdAt: new Date().toISOString()
            };
            setUserProfile(profile);
            setRole(fallbackRole);
          }
        } catch (err) {
          console.error("Error reading user profile:", err);
          const fallbackRole = user.email?.includes('admin') ? 'authority' : 'citizen';
          setRole(fallbackRole);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports from Express server
  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error("Failed to connect to municipal queue backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize reports on mount when authenticated and poll
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    fetchReports();
    const interval = setInterval(fetchReports, 4500);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Sync default tab based on role toggle for a smooth UX
  useEffect(() => {
    if (role === 'authority') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('report');
    }
  }, [role]);

  // Handle resolution
  const handleResolveReport = async (id: string) => {
    setIsResolvingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/resolve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchReports(); // Refresh state
      } else {
        alert("Failed to resolve issue: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Resolution dispatch failed.");
    } finally {
      setIsResolvingId(null);
    }
  };

  const handleReportCreated = (newReport: Report) => {
    fetchReports();
    // Redirect to Map so they can view the newly generated pin immediately
    setSelectedReport(newReport);
    setActiveTab('map');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md border border-indigo-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-50" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white">
                CivicSentinel
              </h1>
              <p className="text-xs text-slate-400 font-medium">Citizen Civic Assistant & Municipal Dispatch</p>
            </div>
          </div>

          {/* User Session and Actions */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {userProfile?.displayName || currentUser.displayName || currentUser.email}
                </span>
                <span className="text-[10px] text-slate-400 font-medium capitalize flex items-center gap-1 mt-0.5">
                  Role: <strong className="text-indigo-400 font-bold">{role === 'authority' ? 'Municipal Authority' : 'Registered Citizen'}</strong>
                </span>
              </div>
              <button
                onClick={() => firebaseSignOut(auth)}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700/80 hover:bg-red-950/20 hover:border-red-900 hover:text-red-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {!currentUser ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center">
          <AuthScreen onAuthSuccess={(user, resolvedRole) => {
            setCurrentUser(user);
            setRole(resolvedRole);
          }} />
        </main>
      ) : (
        /* CORE INTERACTIVE WORKSPACE TABS */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
            
            {/* Navigation Controls */}
            <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl border border-slate-300/40 overflow-x-auto max-w-full whitespace-nowrap select-none scrollbar-hide shrink-0">
            {role === 'citizen' && (
              <button
                onClick={() => setActiveTab('report')}
                className={`text-xs font-extrabold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'report'
                    ? 'bg-white text-indigo-700 shadow-xs border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-500" />
                Triage Report Form
              </button>
            )}

            {role === 'authority' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`text-xs font-extrabold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-700 shadow-xs border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Metrics & Dispatch Queues
              </button>
            )}

            <button
              onClick={() => setActiveTab('map')}
              className={`text-xs font-extrabold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'map'
                  ? 'bg-white text-indigo-700 shadow-xs border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              City Map Control Room
            </button>

            <button
              onClick={() => setActiveTab('impact')}
              className={`text-xs font-extrabold px-4 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'impact'
                  ? 'bg-white text-indigo-700 shadow-xs border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Award className="w-4 h-4 text-indigo-500" />
              Civic Impact Dashboard
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Viewing as: <strong className="text-indigo-600 capitalize font-bold">{role}</strong>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white border rounded-2xl shadow-xs">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm font-semibold">Mobilizing CivicSentinel Agents...</p>
          </div>
        )}

        {/* COMPONENT DESKTOPS */}
        {!isLoading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full"
            >
              {activeTab === 'report' && role === 'citizen' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-8">
                    <ReportForm onReportCreated={handleReportCreated} />
                  </div>
                  <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      How Triage Agents Resolve Issues
                    </h3>
                    <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Perceive (Vision scanning)</strong>
                        Our AI model scans photo matrices to verify physical infrastructure failure instantly.
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Decide (Reasoning)</strong>
                        We cross-reference existing coordinates to filter duplicate entries, prioritize severity, and set strict SLA time windows.
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Act (Automatic Dispatch)</strong>
                        The agent auto-routes the issue into dedicated department queues and drafts detailed work order contracts.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && role === 'authority' && (
                <AuthorityDashboard
                  reports={reports}
                  onResolveReport={handleResolveReport}
                  isResolvingId={isResolvingId}
                />
              )}

              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 text-slate-200 px-4 py-3 rounded-xl border border-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="text-xs">
                      <strong className="text-indigo-400 font-bold">Dynamic City Grid Map:</strong> Real-time GPS-logged citizen reports are pinned instantly. Colors define emergency states.
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono tracking-wide uppercase">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Resolved</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Escalated/Expired</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Urgent SLA</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Normal SLA</span>
                    </div>
                  </div>

                  <MapTab
                    reports={reports}
                    onSelectReport={setSelectedReport}
                    selectedReport={selectedReport}
                    onResolve={handleResolveReport}
                    role={role}
                    isResolvingId={isResolvingId}
                  />
                </div>
              )}

              {activeTab === 'impact' && (
                <ImpactDashboard reports={reports} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>CivicSentinel — Smart Municipal Dispatch Platform</p>
          <div className="flex gap-4">
            <span>© {new Date().getFullYear()} CivicSentinel. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
