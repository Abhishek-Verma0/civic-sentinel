import React, { useState, useRef } from 'react';
import { Report, ReportCategory } from '../types';
import { getCategoryLabel, getCategoryBadgeStyle, getStatusBadgeStyle, formatSlaCountdown, getPriorityStyle } from '../utils';
import { Camera, MapPin, Loader2, AlertTriangle, ShieldCheck, Cpu, ArrowRight, RefreshCw, Upload, AlertCircle, FileText, CheckCircle2, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import AgentDecisionsHeroPanel from './AgentDecisionsHeroPanel';

interface ReportFormProps {
  onReportCreated: (newReport: Report) => void;
}



export default function ReportForm({ onReportCreated }: ReportFormProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressName, setAddressName] = useState<string>('');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageStep, setTriageStep] = useState<number>(0);
  const [lastCreatedReport, setLastCreatedReport] = useState<Report | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [comment, setComment] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grab location
  const handleCaptureLocation = () => {
    setIsCapturingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          setAddressName(`Captured GPS Location: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setIsCapturingLocation(false);
        },
        (error) => {
          console.error("GPS retrieval error, falling back to downtown SF:", error);
          // Fallback to New Delhi coordinates
          const randomDelhiOffsetLat = (Math.random() - 0.5) * 0.004;
          const randomDelhiOffsetLng = (Math.random() - 0.5) * 0.004;
          const lat = 28.6139 + randomDelhiOffsetLat;
          const lng = 77.2090 + randomDelhiOffsetLng;
          setLocation({ lat, lng });
          setAddressName(`Connaught Place, New Delhi: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setIsCapturingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const lat = 28.6139;
      const lng = 77.2090;
      setLocation({ lat, lng });
      setAddressName(`New Delhi (NCR Grid)`);
      setIsCapturingLocation(false);
    }
  };

  // Convert uploaded file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        if (!location) {
          handleCaptureLocation();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        if (!location) {
          handleCaptureLocation();
        }
      };
      reader.readAsDataURL(file);
    }
  };



  // Triggers the perceived -> decide -> act loop
  const triggerSubmit = async (
    imgBase64: string,
    coords: { lat: number; lng: number },
    addr: string,
    simulatedType?: string
  ) => {
    setIsSubmitting(true);
    setLastCreatedReport(null);

    // Multi-stage loader sequence animation
    setTriageStep(1); // Perception
    await new Promise((r) => setTimeout(r, 1200));
    setTriageStep(2); // Decide
    await new Promise((r) => setTimeout(r, 1200));
    setTriageStep(3); // Act
    await new Promise((r) => setTimeout(r, 1000));

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: imgBase64,
          location: coords,
          address: addr,
          simulatedType: simulatedType,
          citizenComment: comment
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLastCreatedReport(data.report);
        onReportCreated(data.report);
      } else {
        alert("Agent triage failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting to municipal dispatch queue.");
    } finally {
      setIsSubmitting(false);
      setTriageStep(0);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;
    setShowConfirmModal(true);
  };

  const handleReset = () => {
    setPhoto(null);
    setLocation(null);
    setAddressName('');
    setLastCreatedReport(null);
    setComment('');
  };

  return (
    <div className="space-y-6">
      {!lastCreatedReport && !isSubmitting && (
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={handleManualSubmit}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5"
        >
          <h3 className="font-extrabold text-slate-900 text-lg">Citizen Infrastructure Report Form</h3>
          <p className="text-xs text-slate-500">
            Submit a photo of any damaged municipal assets. Our autonomous triage agent will immediately classify, priority-rank, draft repair tickets, and schedule road crews.
          </p>

          {/* Photo upload container */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl h-60 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            {photo ? (
              <div className="w-full h-full relative p-2" onClick={(e) => e.stopPropagation()}>
                <img src={photo} alt="Report preview" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md text-xs px-2.5 font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center p-6 pointer-events-none">
                <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-full inline-block mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">Drag & Drop photo here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse local files (Supports camera roll)</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Location details */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={isCapturingLocation}
              className="w-full md:w-auto bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-300 transition-colors disabled:opacity-50"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              {isCapturingLocation ? 'Acquiring GPS...' : 'Capture GPS Coordinates'}
            </button>

            <input
              type="text"
              readOnly
              value={addressName}
              placeholder="Coordinates will map automatically via GPS telemetry"
              className="flex-1 w-full bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono"
            />
          </div>

          {/* Citizen Comments / Notes (Optional) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Additional Details & Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional details. Tip: Type 'spam' or 'unrelated' to test AI rejection of random/fake photos!"
              rows={3}
              className="w-full bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs font-normal outline-hidden resize-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!photo || isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            File Report & Trigger Agent Triage
          </button>
        </motion.form>
      )}

      {/* Triaging Loading Screen */}
      {isSubmitting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-indigo-100 rounded-2xl p-8 shadow-md flex flex-col items-center justify-center min-h-[350px] space-y-6 text-center"
        >
          <div className="relative">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
            <Cpu className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h4 className="font-extrabold text-slate-800 text-base">CivicSentinel Agent Triaging...</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our autonomous municipal dispatcher is evaluating the issue under standard civic protocols.
            </p>
          </div>

          {/* Staggered progress pipeline */}
          <div className="w-full max-w-md space-y-3.5 pt-4">
            <div className={`flex items-center gap-3 text-xs p-3 rounded-xl transition-all ${
              triageStep >= 1 ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'text-slate-400 border border-transparent'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                triageStep > 1 ? 'bg-indigo-600 text-white' : triageStep === 1 ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-slate-100 text-slate-400'
              }`}>
                1
              </span>
              <div className="text-left">
                <span className="font-bold block">1. Perceptual Eye (Gemini Vision)</span>
                <span className="text-[10px] opacity-80">Scanning pixel matrices to classify category & damage severity.</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 text-xs p-3 rounded-xl transition-all ${
              triageStep >= 2 ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'text-slate-400 border border-transparent'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                triageStep > 2 ? 'bg-indigo-600 text-white' : triageStep === 2 ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-slate-100 text-slate-400'
              }`}>
                2
              </span>
              <div className="text-left">
                <span className="font-bold block">2. Evaluate Priority & SLA Risk Bounds</span>
                <span className="text-[10px] opacity-80">Determining municipal department, priority tier, and response SLA window.</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 text-xs p-3 rounded-xl transition-all ${
              triageStep >= 3 ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'text-slate-400 border border-transparent'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                triageStep > 3 ? 'bg-indigo-600 text-white' : triageStep === 3 ? 'bg-indigo-100 text-indigo-700 animate-pulse' : 'bg-slate-100 text-slate-400'
              }`}>
                3
              </span>
              <div className="text-left">
                <span className="font-bold block">3. Run Proximity duplicate Sweep & Actioning</span>
                <span className="text-[10px] opacity-80">Checking 50m buffers to avoid double routes. Drafting formal work order.</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Core Result Triage Card */}
      {lastCreatedReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              {lastCreatedReport.status === 'Rejected' ? (
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-full border border-rose-100">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-full border border-emerald-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-400">{lastCreatedReport.id}</span>
                  {lastCreatedReport.status === 'Rejected' ? (
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                      Report Rejected & Archived
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Agent Action Successful
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">
                  {lastCreatedReport.status === 'Rejected' ? 'Non-Civic / Spam Media Filtered' : 'Triage & Dispatch Record'}
                </h3>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              File Another Issue
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side: Photo & basic AI attributes */}
            <div className="lg:col-span-4 space-y-4">
              <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                <img
                  src={photo || lastCreatedReport.photoUrl}
                  alt={lastCreatedReport.shortDescription}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  {lastCreatedReport.location.lat.toFixed(4)}, {lastCreatedReport.location.lng.toFixed(4)}
                </div>
              </div>

              {/* Triage badges */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Auto Category</span>
                  <span className={`font-semibold border px-2.5 py-0.5 rounded-full ${getCategoryBadgeStyle(lastCreatedReport.category)}`}>
                    {getCategoryLabel(lastCreatedReport.category)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Severity Evaluated</span>
                  <span className="font-extrabold text-slate-800 flex items-center gap-1">
                    <span className="text-rose-500">★</span> {lastCreatedReport.severity} / 5
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Immediate Hazard</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    lastCreatedReport.hazard ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {lastCreatedReport.hazard ? '⚠️ YES - UNRESTRICTED' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Decisions centerpiece, status and work-orders */}
            <div className="lg:col-span-8 space-y-4">
              {/* CENTERPIECE: AGENT DECISIONS HERO PANEL */}
              <AgentDecisionsHeroPanel report={lastCreatedReport} />

              {lastCreatedReport.reasoning && (
                <div className="bg-indigo-50/70 border border-indigo-100/80 px-4 py-3 rounded-2xl text-xs font-medium text-indigo-950 flex items-start gap-2.5 shadow-xs">
                  <Brain className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 block font-mono">Autonomous Dispatch Reasoning</span>
                    <p className="italic mt-0.5 text-slate-700 font-medium">"{lastCreatedReport.reasoning}"</p>
                  </div>
                </div>
              )}

              {/* Status and SLA line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Agent Dispatched Status</span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeStyle(lastCreatedReport.status)}`}>
                    {lastCreatedReport.status}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Service SLA window</span>
                  <span className={`text-xs font-mono font-bold uppercase ${
                    lastCreatedReport.priority === 'Urgent' ? 'text-rose-600' : 'text-slate-700'
                  }`}>
                    {lastCreatedReport.priority === 'Urgent' ? '4-Hour Emergency' : lastCreatedReport.priority === 'Normal' ? '24-Hour Routine' : '72-Hour Standard'}
                  </span>
                </div>
              </div>

              {/* Work Order Draft Preview */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Auto-Drafted Municipal Work-Order
                </div>
                <pre className="text-[11px] font-mono leading-relaxed bg-slate-900 text-slate-100 p-3.5 rounded-xl border border-slate-950 overflow-y-auto max-h-32 whitespace-pre-wrap">
                  {lastCreatedReport.workOrderDraft}
                </pre>
              </div>

              {/* Citizen feedback Memo */}
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Citizen Status Memo</span>
                  <p className="text-xs text-slate-700 italic mt-0.5 font-medium leading-relaxed">
                    "{lastCreatedReport.citizenMessage}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header banner */}
            <div className="bg-indigo-600 p-5 text-white flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-lg">
                <Brain className="w-5 h-5 text-indigo-100 animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-base text-white">Confirm Report Submission</h4>
                <p className="text-[10px] text-indigo-200">Autonomous Civic Triage System</p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-left">
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to file a civic complaint. Our AI agent will process this image to determine its category, hazard status, severity, and generate a work order draft.
              </p>

              {/* Summary card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                {photo && (
                  <div className="flex gap-3 items-center">
                    <img src={photo} alt="Report Preview" referrerPolicy="no-referrer" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Media Attached</p>
                      <p className="text-slate-500 text-[10px]">1 JPEG image</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Location</p>
                  <p className="text-xs text-slate-700 mt-0.5 truncate font-medium">
                    {addressName || "Connaught Place, New Delhi"}
                  </p>
                </div>

                {comment.trim() && (
                  <div className="border-t border-slate-200 pt-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Comments</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 italic">
                      "{comment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Video upload information notice */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2.5">
                <AlertCircle className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-800 leading-relaxed">
                  <span className="font-bold">Note on Video Uploads:</span> Video analysis is supported by Gemini models! To support uploading high-resolution video files, an active cloud storage bucket configuration is recommended to avoid database memory limits.
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  const finalCoords = location || { lat: 28.6139, lng: 77.2090 };
                  const finalAddr = addressName || "Connaught Place, New Delhi";
                  triggerSubmit(photo!, finalCoords, finalAddr);
                }}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
