import { ReportCategory, ReportStatus, Department, Priority } from './types';

export function getCategoryLabel(cat: ReportCategory): string {
  switch (cat) {
    case 'pothole':
      return 'Pothole & Broken Road';
    case 'garbage':
      return 'Garbage / Illegal Dumping';
    case 'waterlogging':
      return 'Waterlogging / Drainage Flooding';
    case 'water_leak':
      return 'Water Leak / Pipeline Burst';
    case 'streetlight':
      return 'Broken Streetlight / Hazard';
    case 'open_drain':
      return 'Open Sewer / Drain Hazard';
    default:
      return 'Other Civic Issue';
  }
}

export function getCategoryBadgeStyle(cat: ReportCategory): string {
  switch (cat) {
    case 'pothole':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'garbage':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'waterlogging':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'water_leak':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'streetlight':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'open_drain':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getStatusBadgeStyle(status: string): string {
  if (status.includes('Escalated') || status.includes('BREACHED')) {
    return 'bg-rose-100 text-rose-800 border-rose-300 font-black border animate-pulse';
  }
  switch (status) {
    case 'Reported':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'In Progress':
      return 'bg-sky-100 text-sky-800 border-sky-200 animate-pulse';
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200 line-through';
    case 'Escalated':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-bold border';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getPriorityStyle(prio: Priority): string {
  switch (prio) {
    case 'Urgent':
      return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'Normal':
      return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'Low':
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function formatSlaCountdown(deadlineString: string, status: ReportStatus): { text: string; isUrgent: boolean; isExpired: boolean } {
  if (status === 'Resolved') {
    return { text: 'SLA Met (Resolved)', isUrgent: false, isExpired: false };
  }

  const deadline = new Date(deadlineString).getTime();
  const now = Date.now();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { text: 'SLA EXPIRED', isUrgent: true, isExpired: true };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);

  let text = '';
  if (hours > 0) {
    text = `${hours}h ${mins}m remaining`;
  } else {
    text = `${mins}m remaining`;
  }

  const isUrgent = hours < 2; // urgent color warning if less than 2 hours left

  return { text, isUrgent, isExpired: false };
}
